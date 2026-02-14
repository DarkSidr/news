import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { fetchAllNews } from '$lib/server/news-service';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const { id } = params;
  
  // In a real app with a DB, we would query by ID.
  // Here we have to fetch the feed again (or rely on cache).
  const allNews = await fetchAllNews(fetch);
  
  // We need to decode the ID because it might contain colons/urls
  const decodedId = decodeURIComponent(id);
  
  const newsItem = allNews.find(item => item.id === decodedId);

  if (!newsItem) {
    throw error(404, 'News item not found');
  }

  return {
    newsItem
  };
};
