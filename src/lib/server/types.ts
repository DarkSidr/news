import type { NewsItem } from '$lib/types';

/**
 * Сырые данные новости от источника (до трансформации)
 */
export interface RawNewsItem {
  title: string;
  link: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  enclosure?: { url: string };
  source: string;
  guid?: string;
  'media:content'?: { $: { url: string } } | { $: { url: string } }[];
  'content:encoded'?: string;
}

/**
 * Интерфейс источника новостей (RSS, API, и т.д.)
 */
export interface NewsSource {
  /** Название источника */
  name: string;
  /** Тип источника */
  type: 'rss' | 'api' | 'reddit' | 'arxiv';
  /** Язык контента */
  language: string;
  /** Флаг активности */
  isActive: boolean;
  /** URL источника (для RSS — feed URL, для API — endpoint) */
  url: string;
  /** Метод получения новостей */
  fetch(fetchFn: typeof fetch): Promise<RawNewsItem[]>;
}

/**
 * Результат обработки pipeline
 */
export interface PipelineResult {
  items: NewsItem[];
  errors: Array<{ source: string; error: Error }>;
  stats: {
    totalFetched: number;
    filtered: number;
    final: number;
  };
}

/**
 * Конфигурация для news-service
 */
export interface NewsServiceConfig {
  rssTimeoutMs: number;
  cacheTtlMs: number;
  maxSnippetLength: number;
}
