import type { RequestHandler } from '@sveltejs/kit';
import { getServiceStatus } from '$lib/server/news-service';

export const GET: RequestHandler = async () => {
  const status = getServiceStatus();

  const response = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    feedsCount: status.sourcesCount,
    cacheAge: status.cacheAge,
    cacheSize: status.cacheSize
  };

  // Determine health status based on cache age
  const cacheAgeMinutes = status.cacheAge ? status.cacheAge / 1000 / 60 : null;
  const isHealthy = !cacheAgeMinutes || cacheAgeMinutes < 30; // Cache shouldn't be older than 30 min

  return new Response(JSON.stringify(response, null, 2), {
    status: isHealthy ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
};
