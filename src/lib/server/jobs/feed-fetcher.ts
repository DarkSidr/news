import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DEFAULT_RSS_FEEDS } from '../sources/rss-source';
import * as schema from '../db/schema';
import { articles, feedSources, fetchLogs } from '../db/schema';
import type { NewsItem } from '$lib/types';
import { fetchAllNews, invalidateCache } from '../news-service';

/**
 * Результат фетчинга
 */
export interface FetchResult {
  sourceId: number;
  sourceName: string;
  itemsCount: number;
  newItemsCount: number;
  error?: string;
  durationMs: number;
}

/**
 * Feed Fetcher - сервис для cron-задач
 */
export class FeedFetcher {
  private db: NodePgDatabase<typeof schema>;
  private fetchFn: typeof fetch;

  constructor(db: NodePgDatabase<typeof schema>, fetchFn: typeof fetch) {
    this.db = db;
    this.fetchFn = fetchFn;
  }

  /**
   * Инициализировать источники в БД (если их ещё нет)
   */
  async initSources(): Promise<void> {
    const existing = await this.db.select().from(feedSources);

    if (existing.length > 0) {
      console.log(`[FeedFetcher] ${existing.length} sources already initialized`);
      return;
    }

    const defaultSources = DEFAULT_RSS_FEEDS.map((feed) => ({
      name: feed.name,
      url: feed.url,
      type: feed.type,
      language: feed.language,
      isActive: feed.isActive
    }));

    await this.db.insert(feedSources).values(defaultSources);
    console.log(`[FeedFetcher] Initialized ${defaultSources.length} default sources`);
  }

  /**
   * Сохранить статьи в БД (upsert)
   */
  async saveArticles(items: NewsItem[], sourceId: number): Promise<number> {
    let newItemsCount = 0;

    for (const item of items) {
      try {
        const articleData = {
          id: item.id,
          sourceId: sourceId,
          title: item.title,
          link: item.link,
          pubDate: new Date(item.pubDate),
          content: item.content || null,
          contentSnippet: item.contentSnippet || null,
          imageUrl: item.imageUrl || null,
          language: this.detectLanguage(item.source)
        };

        const result = await this.db
          .insert(articles)
          .values(articleData)
          .onConflictDoNothing({ target: articles.id })
          .returning({ id: articles.id });

        if (result.length > 0) {
          newItemsCount++;
        }
      } catch (error) {
        console.error(`[FeedFetcher] Error saving article ${item.id}:`, error);
      }
    }

    return newItemsCount;
  }

  /**
   * Обновить last_fetched_at для источника
   */
  async updateSourceLastFetched(sourceId: number): Promise<void> {
    await this.db
      .update(feedSources)
      .set({ lastFetchedAt: new Date() })
      .where(eq(feedSources.id, sourceId));
  }

  /**
   * Залогировать результат фетчинга
   */
  async logFetch(result: FetchResult): Promise<void> {
    await this.db.insert(fetchLogs).values({
      sourceId: result.sourceId,
      fetchedAt: new Date(),
      itemsCount: result.itemsCount,
      newItemsCount: result.newItemsCount,
      error: result.error || null,
      durationMs: result.durationMs
    });
  }

  /**
   * Фетчить все источники
   */
  async run(): Promise<FetchResult[]> {
    console.log('[FeedFetcher] Starting fetch run...');
    const startTime = Date.now();

    let dbSources = await this.db
      .select()
      .from(feedSources)
      .where(eq(feedSources.isActive, true));

    if (dbSources.length === 0) {
      await this.initSources();
      dbSources = await this.db
        .select()
        .from(feedSources)
        .where(eq(feedSources.isActive, true));
    }

    const results: FetchResult[] = [];

    // Force fresh fetch for cron job, bypassing user-facing in-memory cache.
    invalidateCache();
    const allNews = await fetchAllNews(this.fetchFn);

    const newsBySource = new Map<string, NewsItem[]>();
    for (const news of allNews) {
      const existing = newsBySource.get(news.source) || [];
      existing.push(news);
      newsBySource.set(news.source, existing);
    }

    for (const dbSource of dbSources) {
      const sourceStartTime = Date.now();
      const sourceNews = newsBySource.get(dbSource.name) || [];

      try {
        const newItemsCount = await this.saveArticles(sourceNews, dbSource.id);
        await this.updateSourceLastFetched(dbSource.id);

        const durationMs = Date.now() - sourceStartTime;

        const result: FetchResult = {
          sourceId: dbSource.id,
          sourceName: dbSource.name,
          itemsCount: sourceNews.length,
          newItemsCount,
          durationMs
        };

        results.push(result);
        await this.logFetch(result);

        console.log(
          `[FeedFetcher] ${dbSource.name}: ${sourceNews.length} fetched, ${newItemsCount} new`
        );
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        const durationMs = Date.now() - sourceStartTime;

        const result: FetchResult = {
          sourceId: dbSource.id,
          sourceName: dbSource.name,
          itemsCount: sourceNews.length,
          newItemsCount: 0,
          error: err,
          durationMs
        };

        results.push(result);
        await this.logFetch(result);
        console.error(`[FeedFetcher] ${dbSource.name} failed:`, err);
      }
    }

    const totalDuration = Date.now() - startTime;
    const totalNew = results.reduce((sum, r) => sum + r.newItemsCount, 0);

    console.log(
      `[FeedFetcher] Completed in ${totalDuration}ms. ${results.length} sources, ${totalNew} new articles`
    );

    return results;
  }

  /**
   * Определить язык по названию источника
   */
  private detectLanguage(sourceName: string): string {
    const ruSources = ['OpenNET', 'Habr'];
    return ruSources.includes(sourceName) ? 'ru' : 'en';
  }
}
