import type { RequestHandler } from '@sveltejs/kit';
import { getDbStats } from '$lib/server/db/news-repository';

export const GET: RequestHandler = async () => {
  try {
    const stats = await getDbStats();

    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: {
        connected: true
      },
      feedsCount: stats.sourcesCount,
      articlesCount: stats.articlesCount,
      latestArticleAt: stats.latestArticleAt ? stats.latestArticleAt.toISOString() : null
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    console.error('Health check failed:', err);

    return new Response(
      JSON.stringify(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          db: {
            connected: false
          }
        },
        null,
        2
      ),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
};
