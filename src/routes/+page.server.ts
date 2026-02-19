import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { deleteOldNewsFromDb, getLatestNews } from '$lib/server/db/news-repository';
import { fetchAllNews } from '$lib/server/news-service';
import { NEWS_FEED_LIMIT, NEWS_PER_SOURCE_LIMIT } from '$lib/server/config';
import type { NewsItem } from '$lib/types';

function limitBySource(
  items: NewsItem[],
  totalLimit: number,
  perSourceLimit: number
): NewsItem[] {
  const sourceCounter = new Map<string, number>();
  const result: NewsItem[] = [];

  for (const item of items) {
    if (result.length >= totalLimit) {
      break;
    }

    const currentCount = sourceCounter.get(item.source) ?? 0;
    if (currentCount >= perSourceLimit) {
      continue;
    }

    sourceCounter.set(item.source, currentCount + 1);
    result.push(item);
  }

  return result;
}

export const load: PageServerLoad = async ({ url, setHeaders, fetch }) => {
  setHeaders({
    'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
  });

  const canonicalUrl = `${url.origin}${url.pathname}`;
  const dbFetchLimit = NEWS_FEED_LIMIT * 3;

  try {
    await deleteOldNewsFromDb();
    const allNews = await getLatestNews(dbFetchLimit);
    const balancedNews = limitBySource(allNews, NEWS_FEED_LIMIT, NEWS_PER_SOURCE_LIMIT);

    return {
      news: balancedNews,
      generatedAt: new Date().toISOString(),
      canonicalUrl,
      isFallback: false
    };
  } catch (err) {
    console.error('Database connection failed, falling back to RSS:', err);
    try {
      const allNews = await fetchAllNews(fetch);
      const balancedNews = limitBySource(allNews, NEWS_FEED_LIMIT, NEWS_PER_SOURCE_LIMIT);

      return {
        news: balancedNews,
        generatedAt: new Date().toISOString(),
        canonicalUrl,
        isFallback: true
      };
    } catch (fallbackErr) {
      console.error('RSS fallback also failed:', fallbackErr);
      throw error(503, 'Новости временно недоступны');
    }
  }
};
