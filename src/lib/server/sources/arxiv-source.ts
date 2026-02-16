import Parser from 'rss-parser';
import type { NewsSource, RawNewsItem } from '../types';
import { RSS_TIMEOUT_MS } from '../config';

// ArXiv Atom feed structure
interface ArxivLink {
  href?: string;
  rel?: string;
  title?: string;
  $?: {
    href?: string;
    rel?: string;
    title?: string;
  };
}

interface ArxivItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  categories?: string[];
  authors?: { name: string }[];
  primaryCategory?: {
    $?: {
      term?: string;
    };
  };
  journalRef?: string;
  doi?: string;
  links?: ArxivLink[];
  license?: string;
}

const parser = new Parser({
  customFields: {
    item: [
      ['arxiv:primary_category', 'primaryCategory'],
      ['arxiv:journal_ref', 'journalRef'],
      ['arxiv:doi', 'doi'],
      ['arxiv:license', 'license'],
      ['link', 'links'] // Capture all links to find license
    ]
  }
});

export class ArxivSource implements NewsSource {
  name: string;
  type: 'arxiv' = 'arxiv';
  language: string;
  isActive: boolean;
  url: string; // We'll construct the query URL dynamically but store base here
  categories: string[];
  private timeoutMs: number;
  private maxResults: number;

  private baseUrl = 'http://export.arxiv.org/api/query';

  constructor(
    name: string,
    categories: string[],
    options: {
      language?: string;
      isActive?: boolean;
      timeoutMs?: number;
      maxResults?: number;
    } = {}
  ) {
    this.name = name;
    this.categories = categories;
    this.language = options.language || 'en';
    this.isActive = options.isActive ?? true;
    this.timeoutMs = options.timeoutMs ?? RSS_TIMEOUT_MS;
    this.maxResults = options.maxResults ?? 30;
    this.url = this.buildUrl();
  }

  private buildUrl(): string {
    // Construct query for specific categories
    // sortBy=submittedDate ensures we get latest
    // max_results=20 to match fetching batch size roughly
    const catQuery = this.categories.map(c => `cat:${c}`).join('+OR+');
    return `${this.baseUrl}?search_query=${catQuery}&sortBy=submittedDate&sortOrder=descending&max_results=${this.maxResults}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\'', '&#39;');
  }

  async fetch(fetchFn: typeof fetch): Promise<RawNewsItem[]> {
    if (!this.isActive) {
      return [];
    }

    try {
      const response = await fetchFn(this.url, {
        signal: AbortSignal.timeout(this.timeoutMs)
      });
      if (!response.ok) {
        throw new Error(`ArXiv API error: ${response.status}`);
      }

      const xml = await response.text();
      const feed = await parser.parseString(xml);

      // Filter and map items
      const validItems: RawNewsItem[] = [];

      for (const item of feed.items as unknown as ArxivItem[]) {
        const authors = item.authors?.map((author) => author.name).join(', ') || 'Unknown Authors';
        const primaryCat = item.primaryCategory?.$?.term || this.categories[0] || 'cs.AI';

        // Create title with category prefix for clarity
        const title = `[${primaryCat}] ${item.title.replace(/\n/g, ' ').trim()}`;
        const safeAuthors = this.escapeHtml(authors);
        const rawAbstract = item.contentSnippet || item.content || '';
        const safeAbstract = this.escapeHtml(rawAbstract);

        // Content: Abstract + Authors
        const content = `
          <p><strong>Authors:</strong> ${safeAuthors}</p>
          <p><strong>Abstract:</strong> ${safeAbstract}</p>
          <p><a href="${item.link}">Read full paper on ArXiv</a></p>
        `;

        validItems.push({
          title,
          link: item.link,
          pubDate: item.pubDate,
          content,
          contentSnippet: rawAbstract,
          guid: item.guid,
          source: this.name,
          // ArXiv doesn't have images in feed usually
        });
      }

      return validItems;
    } catch (error) {
      console.error(`[ArxivSource] Error fetching ${this.name}:`, error);
      throw error;
    }
  }
}
