import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { deleteOldNewsFromDb, getLatestNews } from '$lib/server/db/news-repository';
import { fetchAllNews } from '$lib/server/news-service';

export const load: PageServerLoad = async ({ url, setHeaders, fetch }) => {
  setHeaders({
    'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
  });

  const canonicalUrl = `${url.origin}${url.pathname}`;

  try {
    await deleteOldNewsFromDb();
    const news = await getLatestNews();

    return {
      news,
      generatedAt: new Date().toISOString(),
      canonicalUrl,
      isFallback: false
    };
  } catch (err) {
    console.error('Database connection failed, falling back to RSS:', err);
    try {
      const news = await fetchAllNews(fetch);

      return {
        news,
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
