import type { PageServerLoad } from './$types';
import Parser from 'rss-parser';
import type { NewsItem } from '$lib/types';

const parser = new Parser();

const FEEDS = [
  { name: 'OpenNET', url: 'https://www.opennet.ru/opennews/opennews_all_utf.rss' },
  { name: 'Habr', url: 'https://habr.com/ru/rss/best/daily/?fl=ru' },
  { name: 'HackerNews', url: 'https://news.ycombinator.com/rss' },
  { name: 'Phoronix', url: 'https://www.phoronix.com/rss.php' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' }
];

export const load: PageServerLoad = async () => {
  const feedPromises = FEEDS.map(async (feed) => {
    try {
      const feedData = await parser.parseURL(feed.url);
      return feedData.items.map((item) => ({
        id: item.guid || item.link || item.title || '',
        title: item.title || 'No Title',
        link: item.link || '',
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        contentSnippet: item.contentSnippet || item.content || '',
        source: feed.name
      } as NewsItem));
    } catch (error) {
      console.error(`Error fetching feed ${feed.name}:`, error);
      return [];
    }
  });

  const results = await Promise.allSettled(feedPromises);
  
  const allNews: NewsItem[] = results
    .filter((result): result is PromiseFulfilledResult<NewsItem[]> => result.status === 'fulfilled')
    .flatMap((result) => result.value)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  return {
    news: allNews
  };
};
