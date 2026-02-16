import { RssSource } from './rss-source';
import { NewsDataSource } from './newsdata-source';
import { ArxivSource } from './arxiv-source';
import type { NewsSource } from '../types';
import type { FeedSource } from '../db/schema';

/**
 * Factory to create a NewsSource instance based on the source type
 */
export function createNewsSource(source: FeedSource): NewsSource | null {
  switch (source.type) {
    case 'rss':
      return new RssSource(source.name, source.url, {
        language: source.language,
        isActive: source.isActive
      });
    case 'api':
      // Currently only supports NewsData.io for 'api' type
      // In the future, we could check source.url or name to distinguish APIs
      if (source.url.includes('newsdata.io')) {
         return new NewsDataSource(source.name, {
            language: source.language,
            isActive: source.isActive
         });
      }
      return null;
    case 'arxiv':
      // ArXiv sources usually have custom URLs like http://export.arxiv.org/api/query...
      // but we might store just "cat:cs.AI" in the URL or name, or rebuild it.
      // For now, let's assume we can re-instantiate based on name/category if needed,
      // OR we just use the stored URL if ArxivSource can handle it.
      // However, ArxivSource constructor expects categories.
      // Let's derive categories from the stored URL query params if possible, 
      // or default to parsing the URL.
      
      const categories = extractCategoriesFromUrl(source.url);
      return new ArxivSource(source.name, categories, {
          language: source.language,
          isActive: source.isActive
      });
    default:
      console.warn(`[NewsFactory] Unsupported source type: ${source.type} for ${source.name}`);
      return null;
  }
}

function extractCategoriesFromUrl(url: string): string[] {
    try {
        const u = new URL(url);
        const query = u.searchParams.get('search_query');
        if (query) {
            // cat:cs.AI+OR+cat:cs.LG
            return query.split('+OR+')
                .map(s => s.replace('cat:', ''))
                .filter(Boolean);
        }
    } catch {
       // ignore
    }
    return ['cs.AI']; // Fallback
}
