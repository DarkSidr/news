import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
  deleteOldNewsFromDb,
  getLatestNewsPaged,
  getActiveSources
} from '$lib/server/db/news-repository';
import { fetchAllNews } from '$lib/server/news-service';

const PAGE_SIZE = 30;

export const load: PageServerLoad = async ({ url, setHeaders, fetch }) => {
  setHeaders({
    'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
  });

  const canonicalUrl = `${url.origin}${url.pathname}`;

  try {
    await deleteOldNewsFromDb();
    const [{ items: news, hasMore, total }, sources] = await Promise.all([
      getLatestNewsPaged(0, PAGE_SIZE),
      getActiveSources()
    ]);

    return {
      news,
      hasMore,
      total,
      sources,
      generatedAt: new Date().toISOString(),
      canonicalUrl,
      isFallback: false
    };
  } catch (err) {
    console.error('Database connection failed, falling back to RSS:', err);
    try {
      const allNews = await fetchAllNews(fetch);
      const news = allNews.slice(0, PAGE_SIZE);
      
      const sourceCounts = allNews.reduce((acc, item) => {
        acc[item.source] = (acc[item.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const sources = Object.entries(sourceCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return {
        news,
        hasMore: allNews.length > PAGE_SIZE,
        sources,
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
