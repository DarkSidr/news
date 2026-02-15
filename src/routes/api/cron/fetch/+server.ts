import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { FeedFetcher } from '$lib/server/jobs/feed-fetcher';
import { db } from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';
import { timingSafeEqual } from 'crypto';

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export const POST: RequestHandler = async ({ request, fetch }) => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret || !token || !secureCompare(token, cronSecret)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const fetcher = new FeedFetcher(db, fetch);
    const results = await fetcher.run();

    const totalNew = results.reduce((sum, r) => sum + r.newItemsCount, 0);

    return json({
      success: true,
      duration: Date.now() - startTime,
      results,
      summary: {
        totalSources: results.length,
        totalNewItems: totalNew,
        errors: results.filter((r) => r.error).length
      }
    });
  } catch (err) {
    console.error('Feed fetcher failed:', err);
    return json({ error: 'Feed fetcher failed' }, { status: 500 });
  }
};

export const GET: RequestHandler = () => {
  return json({
    endpoint: '/api/cron/fetch',
    method: 'POST',
    description: 'Trigger news fetch from all sources',
    authentication: 'Bearer token (CRON_SECRET env var)',
    cronSecretConfigured: !!env.CRON_SECRET
  });
};
