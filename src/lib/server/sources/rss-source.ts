import Parser from 'rss-parser';
import type { NewsSource, RawNewsItem } from '../types';
import { RSS_TIMEOUT_MS } from '../config';

const parser = new Parser({
  customFields: {
    item: [['content:encoded', 'contentEncoded']]
  }
});

/**
 * RSS источник новостей
 */
export class RssSource implements NewsSource {
  name: string;
  type: 'rss' = 'rss';
  language: string;
  isActive: boolean;
  url: string;
  private timeoutMs: number;

  constructor(
    name: string,
    url: string,
    options: { language?: string; isActive?: boolean; timeoutMs?: number } = {}
  ) {
    this.name = name;
    this.url = url;
    this.language = options.language ?? 'ru';
    this.isActive = options.isActive ?? true;
    this.timeoutMs = options.timeoutMs ?? RSS_TIMEOUT_MS;
  }

  async fetch(fetchFn: typeof fetch): Promise<RawNewsItem[]> {
    if (!this.isActive) {
      return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetchFn(this.url, {
        signal: controller.signal,
        headers: {
          'user-agent': 'news-app-bot/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = await response.text();
      const feed = await parser.parseString(xml);

      return feed.items.map((item) => {
        const itemAsRecord = item as unknown as Record<string, string>;
        const contentEncoded =
          itemAsRecord.contentEncoded || itemAsRecord['content:encoded'];

        return {
          title: item.title ?? 'Без заголовка',
          link: item.link ?? '',
          pubDate: item.pubDate,
          content: item.content,
          contentSnippet: item.contentSnippet,
          enclosure: item.enclosure as { url: string } | undefined,
          source: this.name,
          guid: item.guid,
          'media:content': (item as unknown as Record<string, unknown>)[
            'media:content'
          ] as
            | { $: { url: string } }
            | { $: { url: string } }[]
            | undefined,
          'content:encoded': contentEncoded
        };
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Предустановленные RSS источники
 */
export const DEFAULT_RSS_FEEDS: RssSource[] = [
  new RssSource('OpenNET', 'https://www.opennet.ru/opennews/opennews_all_utf.rss', {
    language: 'ru'
  }),
  new RssSource('Habr', 'https://habr.com/ru/rss/best/daily/?fl=ru', {
    language: 'ru'
  }),
  new RssSource('HackerNews', 'https://news.ycombinator.com/rss', {
    language: 'en'
  }),
  new RssSource('Phoronix', 'https://www.phoronix.com/rss.php', {
    language: 'en'
  }),
  new RssSource(
    'TechCrunch AI',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    { language: 'en' }
  )
];
