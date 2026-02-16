import type { NewsSource, RawNewsItem } from '../types';
import { NEWSDATA_API_KEY, RSS_TIMEOUT_MS } from '../config';

interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsDataArticle[];
  nextPage?: string;
}

interface NewsDataArticle {
  article_id: string;
  title: string;
  link: string;
  keywords?: string[];
  creator?: string[];
  video_url?: string;
  description?: string;
  content?: string;
  pubDate: string;
  image_url?: string;
  source_id?: string;
  source_priority?: number;
  country?: string[];
  category?: string[];
  language?: string;
}

export class NewsDataSource implements NewsSource {
  name: string;
  language: string;
  isActive: boolean;
  type: 'api' = 'api';
  url: string; // Required by NewsSource interface
  private apiKey: string;
  private timeoutMs: number;
  private query: string;
  private baseUrl = 'https://newsdata.io/api/1/news';

  constructor(
    name: string,
    options: {
      language?: string;
      isActive?: boolean;
      apiKey?: string;
      timeoutMs?: number;
      query?: string;
    } = {}
  ) {
    this.name = name;
    this.language = options.language || 'en';
    this.isActive = options.isActive ?? true;
    this.apiKey = options.apiKey || NEWSDATA_API_KEY;
    this.timeoutMs = options.timeoutMs ?? RSS_TIMEOUT_MS;
    this.query = options.query ?? 'programming OR "artificial intelligence" OR linux OR coding';
    this.url = this.baseUrl;
  }

  async fetch(fetchFn: typeof fetch): Promise<RawNewsItem[]> {
    if (!this.isActive) {
      return [];
    }

    if (!this.apiKey) {
      console.warn(`[NewsDataSource] No API key provided for ${this.name}`);
      return [];
    }

    try {
      // Build URL with query params
      // q=technology OR programming OR ai
      // language=en,ru (or specific)
      // category=technology
      const url = new URL(this.baseUrl);
      url.searchParams.append('apikey', this.apiKey);
      url.searchParams.append('category', 'technology');
      
      // If language is 'ru', fetch ru news. If 'en', fetch en.
      // NewsData.io supports comma separated languages
      if (this.language && this.language !== 'all') {
          url.searchParams.append('language', this.language);
      }

      // Priority domains/queries could be configured here
      // For general tech news:
      url.searchParams.append('q', this.query);

      const response = await fetchFn(url.toString(), {
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) {
        if (response.status === 429) {
             console.warn(`[NewsDataSource] Rate limit exceeded for ${this.name}`);
             return [];
        }
        throw new Error(`NewsData.io API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as NewsDataResponse;

      if (data.status !== 'success') {
        throw new Error(`NewsData.io API returned status: ${data.status}`);
      }

      return data.results.map(this.transformToRawItem);
    } catch (error) {
      console.error(`[NewsDataSource] Error fetching ${this.name}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  private transformToRawItem(article: NewsDataArticle): RawNewsItem {
    return {
      title: article.title,
      link: article.link,
      pubDate: article.pubDate, // NewsData.io returns "2023-01-01 12:00:00" or similar
      content: article.content || article.description || '',
      contentSnippet: article.description || '',
      guid: article.article_id, // Unique ID from NewsData
      enclosure: article.image_url ? { url: article.image_url } : undefined,
      source: 'NewsData.io' // Or specific source_id from response
    };
  }
}
