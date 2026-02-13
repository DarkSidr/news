import type { PageServerLoad } from './$types';
import Parser from 'rss-parser';
import type { NewsItem } from '$lib/types';

const parser = new Parser();
const RSS_TIMEOUT_MS = 8_000;
const MAX_SNIPPET_LENGTH = 300;

const FEEDS = [
  { name: 'OpenNET', url: 'https://www.opennet.ru/opennews/opennews_all_utf.rss' },
  { name: 'Habr', url: 'https://habr.com/ru/rss/best/daily/?fl=ru' },
  { name: 'HackerNews', url: 'https://news.ycombinator.com/rss' },
  { name: 'Phoronix', url: 'https://www.phoronix.com/rss.php' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' }
];

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function buildNewsId(feedName: string, item: Parser.Item, index: number): string {
  const link = item.link?.trim();
  const guid = item.guid?.trim();

  if (guid) return `${feedName}:${guid}`;
  if (link) return `${feedName}:${link}`;

  const title = stripHtml(item.title || 'untitled');
  const pubDate = item.pubDate || 'no-date';
  return `${feedName}:${title}:${pubDate}:${index}`;
}

function normalizePubDate(input?: string): string {
  if (!input) return new Date().toISOString();

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

async function parseFeedWithTimeout(url: string, fetchFn: typeof fetch) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RSS_TIMEOUT_MS);

  try {
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'news-app-bot/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    return await parser.parseString(xml);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const load: PageServerLoad = async ({ setHeaders, fetch }) => {
  setHeaders({
    'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
  });

  const feedPromises = FEEDS.map(async (feed) => {
    try {
      const feedData = await parseFeedWithTimeout(feed.url, fetch);
      return feedData.items.map((item, index) => ({
        id: buildNewsId(feed.name, item, index),
        title: stripHtml(item.title || 'Без заголовка'),
        link: item.link || '',
        pubDate: normalizePubDate(item.pubDate),
        contentSnippet: stripHtml(item.contentSnippet || item.content || '').slice(0, MAX_SNIPPET_LENGTH),
        source: feed.name
      } as NewsItem));
    } catch (error) {
      console.error(`Error fetching feed ${feed.name}:`, error);
      return [];
    }
  });

  const results = await Promise.all(feedPromises);

  const allNews: NewsItem[] = results
    .flat()
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  return {
    news: allNews,
    generatedAt: new Date().toISOString()
  };
};
