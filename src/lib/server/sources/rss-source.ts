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
  ),
  new RssSource('Google Web.dev', 'https://web.dev/feed.xml', {
    language: 'en'
  }),
  new RssSource('MDN Blog', 'https://developer.mozilla.org/en-US/blog/rss.xml', {
    language: 'en'
  }),
  new RssSource('Microsoft TypeScript', 'https://devblogs.microsoft.com/typescript/feed/', {
    language: 'en'
  }),
  new RssSource('CNCF Blog', 'https://www.cncf.io/feed/', {
    language: 'en'
  }),
  new RssSource('The Verge', 'https://www.theverge.com/rss/index.xml', {
    language: 'en'
  }),
  new RssSource('Wired', 'https://www.wired.com/feed/rss', {
    language: 'en'
  }),
  new RssSource('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', {
    language: 'en'
  }),
  new RssSource('Dev.to', 'https://dev.to/feed', {
    language: 'en'
  }),
  new RssSource('React', 'https://react.dev/feed.xml', {
    language: 'en'
  }),
  new RssSource('GitHub Blog', 'https://github.blog/feed/', {
    language: 'en'
  }),
  new RssSource('OpenAI', 'https://openai.com/blog/rss.xml', {
    language: 'en'
  }),
  new RssSource('PostgreSQL', 'https://www.postgresql.org/about/news/rss/', {
    language: 'en'
  })
];
