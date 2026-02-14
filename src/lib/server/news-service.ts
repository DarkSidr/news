import Parser from 'rss-parser';
import sanitizeHtml from 'sanitize-html';
import { stripHtml, buildNewsId, normalizePubDate, extractImage, type FeedItemLike } from './news-utils';
import type { NewsItem } from '$lib/types';

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
    ]
  }
});
const RSS_TIMEOUT_MS = 8_000;
const MAX_SNIPPET_LENGTH = 300;

const FEEDS = [
  { name: 'OpenNET', url: 'https://www.opennet.ru/opennews/opennews_all_utf.rss' },
  { name: 'Habr', url: 'https://habr.com/ru/rss/best/daily/?fl=ru' },
  { name: 'HackerNews', url: 'https://news.ycombinator.com/rss' },
  { name: 'Phoronix', url: 'https://www.phoronix.com/rss.php' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' }
];

let newsCache: NewsItem[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

export async function fetchAllNews(fetchFn: typeof fetch): Promise<NewsItem[]> {
  const now = Date.now();
  if (newsCache && (now - lastFetchTime < CACHE_TTL_MS)) {
    return newsCache;
  }

  const feedPromises = FEEDS.map(async (feed) => {
    try {
      const feedData = await parseFeedWithTimeout(feed.url, fetchFn);
      return feedData.items.map((item, index) => {
        // Explicitly check contentEncoded (from customFields) first
        const fullContent = item.contentEncoded || item['content:encoded'] || item.content || item.description || '';
        
        return {
          id: buildNewsId(feed.name, item as FeedItemLike, index),
          title: stripHtml(item.title || 'Без заголовка'),
          link: item.link || '',
          pubDate: normalizePubDate(item.pubDate),
          contentSnippet: stripHtml(item.contentSnippet || fullContent).slice(0, MAX_SNIPPET_LENGTH),
          source: feed.name,
          imageUrl: extractImage(item as FeedItemLike),
          content: sanitizeHtml(fullContent, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'figure', 'figcaption' ]),
            allowedAttributes: {
               ...sanitizeHtml.defaults.allowedAttributes,
               img: ['src', 'alt', 'title', 'width', 'height']
            }
          })
        } as NewsItem;
      });
    } catch (error) {
      console.error(`Error fetching feed ${feed.name}:`, error);
      return [];
    }
  });

  const results = await Promise.all(feedPromises);

  newsCache = results
    .flat()
    .filter(item => !item.link.includes('css-doodle.com')) // Filter out css-doodle
    .map(item => {
        // Remove the main image from content if it exists to avoid duplication
        if (item.imageUrl && item.content) {
            // Create a regex to find the image tag with this src
            // specific to the extracted URL
            const cleanUrl = item.imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
            const imgRegex = new RegExp(`<img[^>]+src=["']${cleanUrl}["'][^>]*>`, 'i');
            // Check if content starts with this image (or close to it) to only remove "lead" images
            // But user said "one image at the beginning", so if we show it manually, we should remove it from content wherever it is? 
            // Or better, just the first occurence if it matches.
            // Let's remove the *exact* image tag if found.
            item.content = item.content.replace(imgRegex, '');
            
            // Also cleanup empty figures if they become empty
            item.content = item.content.replace(/<figure[^>]*>\s*<\/figure>/gi, '');
        }
        return item;
    })
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  
  lastFetchTime = Date.now();
  
  return newsCache;
}
