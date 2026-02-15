import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getNewsById } from '$lib/server/db/news-repository';
import { fetchNewsById } from '$lib/server/news-service';

export const load: PageServerLoad = async ({ params, setHeaders, url, fetch }) => {
  setHeaders({
    'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
  });

  const { id } = params;
  const decodedId = decodeURIComponent(id);

  let newsItem = null;
  try {
    newsItem = await getNewsById(decodedId);
  } catch (err) {
    console.error(`Failed to load news item ${decodedId} from database, trying RSS fallback:`, err);
    try {
      newsItem = await fetchNewsById(fetch, decodedId);
    } catch (fallbackErr) {
      console.error(`Failed to load news item ${decodedId} from RSS fallback:`, fallbackErr);
      throw error(503, 'Новости временно недоступны');
    }
  }

  if (!newsItem) {
    throw error(404, 'Новость не найдена');
  }

  return {
    newsItem,
    pageUrl: url.href
  };
};
