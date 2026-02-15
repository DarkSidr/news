import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getNewsById } from '$lib/server/db/news-repository';

export const load: PageServerLoad = async ({ params, setHeaders, url }) => {
  setHeaders({
    'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
  });

  const { id } = params;
  const decodedId = decodeURIComponent(id);

  let newsItem = null;
  try {
    newsItem = await getNewsById(decodedId);
  } catch (err) {
    console.error(`Failed to load news item ${decodedId} from database:`, err);
    throw error(503, 'База данных недоступна');
  }

  if (!newsItem) {
    throw error(404, 'Новость не найдена');
  }

  return {
    newsItem,
    pageUrl: url.href
  };
};
