import { and, desc, eq, isNull, ne, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import sanitizeHtml from 'sanitize-html';
import type { NewsItem } from '$lib/types';
import { DEFAULT_RSS_FEEDS } from '../sources/rss-source';
import * as schema from '../db/schema';
import { articles, feedSources, fetchLogs } from '../db/schema';
import { BLOCKED_DOMAINS, MAX_SNIPPET_LENGTH, TRANSLATION_MAX_PER_RUN } from '../config';
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
import type { TranslationService } from '../services/translation-service';
import { createTranslationService, isTranslationConfigured } from '../services/translation-service';

/**
 * Результат фетчинга
 */
export interface FetchResult {
  sourceId: number;
  sourceName: string;
  itemsCount: number;
  newItemsCount: number;
  translatedCount: number;
  error?: string;
  durationMs: number;
}

/**
 * Feed Fetcher - сервис для cron-задач
 */
export class FeedFetcher {
  private db: NodePgDatabase<typeof schema>;
  private fetchFn: typeof fetch;
  private translationService: TranslationService | null;

  constructor(db: NodePgDatabase<typeof schema>, fetchFn: typeof fetch) {
    this.db = db;
    this.fetchFn = fetchFn;
    this.translationService = createTranslationService(fetchFn);
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
    let translationBudget = TRANSLATION_MAX_PER_RUN;

    for (let sourceIndex = 0; sourceIndex < dbSources.length; sourceIndex++) {
      const dbSource = dbSources[sourceIndex];
      const sourceStartTime = Date.now();

      try {
        const sourceNews = await this.fetchSourceNews(dbSource);
        const newItemsCount = await this.saveArticles(
          sourceNews,
          dbSource.id,
          dbSource.language
        );
        const sourcesLeft = dbSources.length - sourceIndex;
        const sourceBudget =
          translationBudget > 0 ? Math.max(1, Math.floor(translationBudget / sourcesLeft)) : 0;
        const translatedCount = await this.translatePendingForSource(
          dbSource.id,
          dbSource.language,
          sourceBudget
        );
        translationBudget -= translatedCount;
        await this.updateSourceLastFetched(dbSource.id);

        const durationMs = Date.now() - sourceStartTime;

        const result: FetchResult = {
          sourceId: dbSource.id,
          sourceName: dbSource.name,
          itemsCount: sourceNews.length,
          newItemsCount,
          translatedCount,
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
          translatedCount: 0,
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
    const totalTranslated = results.reduce((sum, r) => sum + r.translatedCount, 0);

    console.log(
      `[FeedFetcher] Completed in ${totalDuration}ms. ${results.length} sources, ` +
      `${totalNew} new articles, ${totalTranslated} translated`
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
      this.transformRawNewsItem(rawItem, source.name, source.language, index)
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
  private transformRawNewsItem(
    raw: RawNewsItem,
    sourceName: string,
    sourceLanguage: string,
    index: number
  ): NewsItem {
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
      language: sourceLanguage,
      isTranslated: false,
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

  /**
   * Перевести непереведённые статьи источника (с лимитом на прогон)
   */
  private async translatePendingForSource(
    sourceId: number,
    sourceLanguage: string,
    budget: number
  ): Promise<number> {
    if (budget <= 0 || sourceLanguage === 'ru') {
      return 0;
    }

    if (!this.translationService || !isTranslationConfigured()) {
      return 0;
    }

    const pending = await this.db
      .select({
        id: articles.id,
        title: articles.title,
        contentSnippet: articles.contentSnippet,
        content: articles.content,
        language: articles.language
      })
      .from(articles)
      .where(
        and(
          eq(articles.sourceId, sourceId),
          or(eq(articles.isTranslated, false), isNull(articles.translatedContent)),
          ne(articles.language, 'ru')
        )
      )
      .orderBy(desc(articles.pubDate))
      .limit(budget);

    if (pending.length === 0) {
      return 0;
    }

    let translatedCount = 0;
    const groupedByLanguage = new Map<string, typeof pending>();

    for (const item of pending) {
      const language = item.language || sourceLanguage;
      const group = groupedByLanguage.get(language);
      if (group) {
        group.push(item);
      } else {
        groupedByLanguage.set(language, [item]);
      }
    }

    for (const [language, items] of groupedByLanguage.entries()) {
      const titles = items.map((item) => item.title);
      const snippets = items.map((item) => item.contentSnippet ?? '');
      const contents = items.map((item) => stripHtml(item.content ?? ''));

      try {
        const translatedTitles = await this.translationService.translateBatch(
          titles,
          language,
          'ru'
        );
        const translatedSnippets = await this.translationService.translateBatch(
          snippets,
          language,
          'ru'
        );
        const translatedContents = await this.translationService.translateBatch(
          contents,
          language,
          'ru'
        );

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const translatedTitle = translatedTitles[i];
          const translatedSnippet = translatedSnippets[i];
          const translatedContent = translatedContents[i];

          if (
            !translatedTitle ||
            (item.contentSnippet && !translatedSnippet) ||
            (item.content && !translatedContent)
          ) {
            continue;
          }

          await this.db
            .update(articles)
            .set({
              translatedTitle,
              translatedSnippet: item.contentSnippet ? translatedSnippet : null,
              translatedContent: item.content
                ? this.convertTranslatedTextToHtml(translatedContent)
                : null,
              isTranslated: true
            })
            .where(eq(articles.id, item.id));

          translatedCount += 1;
        }
      } catch (error) {
        console.error(`[FeedFetcher] Translation failed for source ${sourceId}:`, error);
      }
    }

    return translatedCount;
  }

  /**
   * Преобразовать переведённый plain text в безопасный HTML для рендера в статье
   */
  private convertTranslatedTextToHtml(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const normalized = escaped.trim();
    if (!normalized) {
      return '<p></p>';
    }

    const paragraphs = normalized
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`);

    return paragraphs.length > 0 ? paragraphs.join('') : `<p>${normalized}</p>`;
  }
}
