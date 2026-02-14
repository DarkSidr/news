import type { PageServerLoad } from './$types';
import { fetchAllNews } from '$lib/server/news-service';

export const load: PageServerLoad = async ({ setHeaders, fetch }) => {
  setHeaders({
    'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
  });

  const allNews = await fetchAllNews(fetch);

  return {
    news: allNews,
    generatedAt: new Date().toISOString()
  };
};
