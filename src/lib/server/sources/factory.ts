import { RssSource } from './rss-source';
import type { NewsSource } from '../types';
import type { FeedSource } from '../db/schema';

/**
 * Factory to create a NewsSource instance based on the source type
 */
export function createNewsSource(source: FeedSource): NewsSource | null {
  // We strictly support only RSS now. 
  // API sources (NewsData.io, ArXiv) are removed.
  // If db has old records with 'api' or 'arxiv', we ignore them or treat as RSS if possible (unlikely).
  
  if (source.type === 'rss') {
    return new RssSource(source.name, source.url, {
      language: source.language,
      isActive: source.isActive
    });
  }

  // Allow fallback to RSS for unknown types if they have a URL, 
  // but strictly speaking we only expect RSS.
  // For 'api' or 'arxiv' types which we removed code for, we return null to skip them.
  return null;
}
