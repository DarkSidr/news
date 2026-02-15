import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import sanitizeHtml from 'sanitize-html';
import type { NewsItem } from '$lib/types';
import { DEFAULT_RSS_FEEDS } from '../sources/rss-source';
import * as schema from '../db/schema';
import { articles, feedSources, fetchLogs } from '../db/schema';
import { BLOCKED_DOMAINS, MAX_SNIPPET_LENGTH } from '../config';
import {
  stripHtml,
  buildNewsId,
  normalizePubDate,
  extractImage,
  isLowQuality,
  stripReadMoreLinks,
  type FeedItemLike
} from '../news-utils';
import { RssSource } from '../sources/rss-source';
import type { RawNewsItem } from '../types';
import type { FeedSource as DbFeedSource } from '../db/schema';

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
  async saveArticles(items: NewsItem[], sourceId: number, language: string): Promise<number> {
    if (items.length === 0) {
      return 0;
    }

    const articleData = items.map((item) => ({
      id: item.id,
      sourceId: sourceId,
      title: item.title,
      link: item.link,
      pubDate: new Date(item.pubDate),
      content: item.content || null,
      contentSnippet: item.contentSnippet || null,
      imageUrl: item.imageUrl || null,
      language
    }));

    const result = await this.db
      .insert(articles)
      .values(articleData)
      .onConflictDoNothing({ target: articles.id })
      .returning({ id: articles.id });

    return result.length;
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

    for (const dbSource of dbSources) {
      const sourceStartTime = Date.now();

      try {
        const sourceNews = await this.fetchSourceNews(dbSource);
        const newItemsCount = await this.saveArticles(
          sourceNews,
          dbSource.id,
          dbSource.language
        );
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
          itemsCount: 0,
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
   * Фетчинг и подготовка новостей для конкретного источника
   */
  private async fetchSourceNews(source: DbFeedSource): Promise<NewsItem[]> {
    if (source.type !== 'rss') {
      console.warn(`[FeedFetcher] Unsupported source type "${source.type}" for ${source.name}`);
      return [];
    }

    const rssSource = new RssSource(source.name, source.url, {
      language: source.language,
      isActive: source.isActive
    });

    const rawItems = await rssSource.fetch(this.fetchFn);
    const transformed = rawItems.map((rawItem, index) =>
      this.transformRawNewsItem(rawItem, source.name, index)
    );

    const filtered = transformed.filter((item) => {
      if (isLowQuality(item)) {
        return false;
      }

      try {
        const hostname = new URL(item.link).hostname;
        return !BLOCKED_DOMAINS.some((domain) => hostname.includes(domain));
      } catch {
        return true;
      }
    });

    return filtered.map((item) => {
      let content = item.content;

      if (item.imageUrl && content) {
        const cleanUrl = item.imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const imgRegex = new RegExp(`<img[^>]+src=["']${cleanUrl}["'][^>]*>`, 'i');

        content = content.replace(imgRegex, '');
        content = content.replace(/<figure[^>]*>\s*<\/figure>/gi, '');
      }

      if (content) {
        content = stripReadMoreLinks(content);
      }

      return { ...item, content };
    });
  }

  /**
   * Преобразование сырых RSS-данных в формат NewsItem
   */
  private transformRawNewsItem(raw: RawNewsItem, sourceName: string, index: number): NewsItem {
    const feedItemLike: FeedItemLike = {
      guid: raw.guid,
      link: raw.link,
      title: raw.title,
      pubDate: raw.pubDate,
      enclosure: raw.enclosure,
      'media:content': raw['media:content'],
      content: raw.content,
      contentSnippet: raw.contentSnippet,
      'content:encoded': raw['content:encoded']
    };

    const fullContent = raw['content:encoded'] || raw.content || raw.contentSnippet || '';

    return {
      id: buildNewsId(sourceName, feedItemLike, index),
      title: stripHtml(raw.title || 'Без заголовка'),
      link: raw.link,
      pubDate: normalizePubDate(raw.pubDate),
      contentSnippet: stripHtml(raw.contentSnippet || fullContent).slice(0, MAX_SNIPPET_LENGTH),
      source: sourceName,
      imageUrl: extractImage(feedItemLike),
      content: sanitizeHtml(fullContent, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ['src', 'alt', 'title', 'width', 'height']
        }
      })
    };
  }
}
