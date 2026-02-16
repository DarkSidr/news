import { RssSource, DEFAULT_RSS_FEEDS } from './rss-source';
import type { NewsSource } from '../types';

/**
 * Реестр всех источников новостей
 */
export function createNewsSources(): NewsSource[] {
  return [...DEFAULT_RSS_FEEDS];
}

/**
 * Получить все активные источники
 */
export function getActiveSources(sources: NewsSource[]): NewsSource[] {
  return sources.filter((s) => s.isActive);
}

import { NewsDataSource } from './newsdata-source';
import { ArxivSource } from './arxiv-source';

export { RssSource, NewsDataSource, ArxivSource, DEFAULT_RSS_FEEDS };
export type { NewsSource };
