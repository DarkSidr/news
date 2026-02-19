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
  // --- Русскоязычные источники ---
  new RssSource('OpenNET', 'https://www.opennet.ru/opennews/opennews_all_utf.rss', {
    language: 'ru'
  }),
  // Habr: только тематические хабы (программирование, AI, ОС, БД)
  new RssSource('Habr / Python', 'https://habr.com/ru/rss/hub/python/articles/', {
    language: 'ru'
  }),
  new RssSource('Habr / JavaScript', 'https://habr.com/ru/rss/hub/javascript/articles/', {
    language: 'ru'
  }),
  new RssSource('Habr / Linux', 'https://habr.com/ru/rss/hub/linux/articles/', {
    language: 'ru'
  }),
  new RssSource('Habr / ML', 'https://habr.com/ru/rss/hub/machine_learning/articles/', {
    language: 'ru'
  }),
  new RssSource('Habr / Нейросети', 'https://habr.com/ru/rss/hub/neural_networks/articles/', {
    language: 'ru'
  }),
  new RssSource('Habr / Базы данных', 'https://habr.com/ru/rss/hub/sql/articles/', {
    language: 'ru'
  }),
  new RssSource('Habr / Веб-разработка', 'https://habr.com/ru/rss/hub/webdev/articles/', {
    language: 'ru'
  }),
  new RssSource('Habr / DevOps', 'https://habr.com/ru/rss/hub/devops/articles/', {
    language: 'ru'
  }),
  new RssSource('Habr / Open Source', 'https://habr.com/ru/rss/hub/open_source/articles/', {
    language: 'ru'
  }),

  // --- Англоязычные источники ---
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
  new RssSource('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/technology-lab', {
    language: 'en'
  }),
  new RssSource('Dev.to / JavaScript', 'https://dev.to/feed/tag/javascript', { language: 'en' }),
  new RssSource('Dev.to / TypeScript', 'https://dev.to/feed/tag/typescript', { language: 'en' }),
  new RssSource('Dev.to / Python', 'https://dev.to/feed/tag/python', { language: 'en' }),
  new RssSource('Dev.to / Rust', 'https://dev.to/feed/tag/rust', { language: 'en' }),
  new RssSource('Dev.to / Go', 'https://dev.to/feed/tag/go', { language: 'en' }),
  new RssSource('Dev.to / PHP', 'https://dev.to/feed/tag/php', { language: 'en' }),
  new RssSource('Dev.to / Dart', 'https://dev.to/feed/tag/dart', { language: 'en' }),
  new RssSource('Dev.to / Flutter', 'https://dev.to/feed/tag/flutter', { language: 'en' }),
  new RssSource('Dev.to / Kotlin', 'https://dev.to/feed/tag/kotlin', { language: 'en' }),
  new RssSource('Dev.to / React', 'https://dev.to/feed/tag/react', { language: 'en' }),
  new RssSource('Dev.to / Vue', 'https://dev.to/feed/tag/vue', { language: 'en' }),
  new RssSource('Dev.to / Angular', 'https://dev.to/feed/tag/angular', { language: 'en' }),
  new RssSource('Dev.to / Next.js', 'https://dev.to/feed/tag/nextjs', { language: 'en' }),
  new RssSource('Dev.to / Nuxt', 'https://dev.to/feed/tag/nuxt', { language: 'en' }),
  new RssSource('Dev.to / Frontend', 'https://dev.to/feed/tag/frontend', { language: 'en' }),
  new RssSource('Dev.to / Backend', 'https://dev.to/feed/tag/backend', { language: 'en' }),
  new RssSource('Dev.to / Docker', 'https://dev.to/feed/tag/docker', { language: 'en' }),
  new RssSource('Dev.to / DevOps', 'https://dev.to/feed/tag/devops', { language: 'en' }),
  new RssSource('Dev.to / AI', 'https://dev.to/feed/tag/ai', { language: 'en' }),
  new RssSource('Dev.to / Database', 'https://dev.to/feed/tag/database', { language: 'en' }),
  new RssSource('Dev.to / API', 'https://dev.to/feed/tag/api', { language: 'en' }),
  new RssSource('Dev.to / Strapi', 'https://dev.to/feed/tag/strapi', { language: 'en' }),
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
