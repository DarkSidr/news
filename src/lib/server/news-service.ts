import sanitizeHtml from 'sanitize-html';
import {
  stripHtml,
  buildNewsId,
  normalizePubDate,
  isLowQuality,
  stripReadMoreLinks,
  type FeedItemLike
} from './news-utils';
import { createNewsSources, getActiveSources } from './sources';
import { BLOCKED_DOMAINS, RSS_TIMEOUT_MS, CACHE_TTL_MS, MAX_SNIPPET_LENGTH } from './config';
import type { NewsItem } from '$lib/types';
import type { NewsSource, RawNewsItem, PipelineResult, NewsServiceConfig } from './types';

/**
 * In-memory cache для новостей
 */
interface NewsCache {
  items: NewsItem[];
  timestamp: number;
}

let newsCache: NewsCache | null = null;

/**
 * Конфигурация сервиса
 */
function getConfig(): NewsServiceConfig {
  return {
    rssTimeoutMs: RSS_TIMEOUT_MS,
    cacheTtlMs: CACHE_TTL_MS,
    maxSnippetLength: MAX_SNIPPET_LENGTH
  };
}

/**
 * Преобразовать RawNewsItem в NewsItem
 */
function transformNewsItem(
  raw: RawNewsItem,
  sourceName: string,
  sourceLanguage: string,
  index: number,
  config: NewsServiceConfig
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

  const fullContent =
    raw['content:encoded'] || raw.content || raw.contentSnippet || '';

  return {
    id: buildNewsId(sourceName, feedItemLike, index),
    title: stripHtml(raw.title || 'Без заголовка'),
    link: raw.link,
    pubDate: normalizePubDate(raw.pubDate),
    contentSnippet: stripHtml(raw.contentSnippet || fullContent).slice(
      0,
      config.maxSnippetLength
    ),
    source: sourceName,
    language: sourceLanguage,
    isTranslated: false,
    content: sanitizeHtml(fullContent, {
      allowedTags: sanitizeHtml.defaults.allowedTags.filter(tag => tag !== 'img' && tag !== 'figure' && tag !== 'figcaption'),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes
      }
    })
  };
}

/**
 * Pipeline: fetch → transform → filter → dedupe → sort
 */
async function runPipeline(
  sources: NewsSource[],
  fetchFn: typeof fetch,
  config: NewsServiceConfig
): Promise<PipelineResult> {
  const errors: Array<{ source: string; error: Error }> = [];
  const allItems: NewsItem[] = [];
  let totalFetched = 0;

  // Fetch from all sources in parallel
  const fetchPromises = sources.map(async (source) => {
    try {
      const rawItems = await source.fetch(fetchFn);
      totalFetched += rawItems.length;
      return { source, rawItems };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push({ source: source.name, error: err });
      console.error(`Error fetching from ${source.name}:`, err);
      return { source, rawItems: [] };
    }
  });

  const fetchResults = await Promise.all(fetchPromises);

  // Transform and collect
  for (const { source, rawItems } of fetchResults) {
    for (let i = 0; i < rawItems.length; i++) {
      const raw = rawItems[i];
      const item = transformNewsItem(raw, source.name, source.language, i, config);
      allItems.push(item);
    }
  }

  // Filter: blocked domains + low quality
  const filtered = allItems.filter((item) => {
    if (isLowQuality(item)) return false;

    try {
      const hostname = new URL(item.link).hostname;
      if (BLOCKED_DOMAINS.some((domain) => hostname.includes(domain))) {
        return false;
      }
    } catch {
      // Invalid URL, skip domain check
    }

    return true;
  });

  // Post-process: remove featured images from content, strip read more links
  const processed = filtered.map((item) => {
    let content = item.content;

    if (content) {
      // Clean up empty figures if any remain
      content = content.replace(/<figure[^>]*>\s*<\/figure>/gi, '');
    }

    if (content) {
      content = stripReadMoreLinks(content);
    }

    return { ...item, content };
  });

  // Sort by date
  const sorted = processed.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  return {
    items: sorted,
    errors,
    stats: {
      totalFetched,
      filtered: allItems.length - filtered.length,
      final: sorted.length
    }
  };
}

// Initialize sources once
const allSources = createNewsSources();

/**
 * Получить все новости (с кешированием)
 */
export async function fetchAllNews(fetchFn: typeof fetch): Promise<NewsItem[]> {
  const config = getConfig();
  const now = Date.now();

  // Check cache
  if (newsCache && now - newsCache.timestamp < config.cacheTtlMs) {
    return newsCache.items;
  }

  // Get active sources
  const activeSources = getActiveSources(allSources);

  if (activeSources.length === 0) {
    console.warn('No active news sources configured');
    return [];
  }

  // Run pipeline
  const result = await runPipeline(activeSources, fetchFn, config);

  // Log stats
  console.log(
    `[NewsService] Fetched ${result.stats.totalFetched} items, ` +
      `filtered ${result.stats.filtered}, final: ${result.stats.final}`
  );

  if (result.errors.length > 0) {
    console.warn(`[NewsService] ${result.errors.length} sources failed`);
  }

  // Update cache
  newsCache = {
    items: result.items,
    timestamp: now
  };

  return result.items;
}

/**
 * Получить одну новость по ID
 */
export async function fetchNewsById(
  fetchFn: typeof fetch,
  id: string
): Promise<NewsItem | null> {
  const allNews = await fetchAllNews(fetchFn);
  return allNews.find((item) => item.id === id) || null;
}

/**
 * Инвалидировать кеш (для cron-задач)
 */
export function invalidateCache(): void {
  newsCache = null;
}

/**
 * Получить статус сервиса (для health-check)
 */
export function getServiceStatus(): {
  cacheAge: number | null;
  sourcesCount: number;
  cacheSize: number;
} {
  return {
    cacheAge: newsCache ? Date.now() - newsCache.timestamp : null,
    sourcesCount: allSources.length,
    cacheSize: newsCache?.items.length ?? 0
  };
}

// Re-export types for convenience
export type { NewsSource, RawNewsItem, PipelineResult, NewsServiceConfig };
