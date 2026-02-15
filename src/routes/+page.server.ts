import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getLatestNews } from '$lib/server/db/news-repository';

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
  });

  try {
    const allNews = await getLatestNews(50);

    return {
      news: allNews,
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('Failed to load news from database:', err);
    throw error(503, 'База данных недоступна');
  }
};
