import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { initDb } from '$lib/server/db';
import { FeedFetcher } from './feed-fetcher';

declare global {
  // eslint-disable-next-line no-var
  var __newsDevSchedulerStarted: boolean | undefined;
}

function getIntervalMs(): number {
  const raw = env.DEV_FETCH_INTERVAL_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 15 * 60 * 1000;
  }

  return parsed;
}

async function runFeedFetchJob(): Promise<void> {
  let client: { end: () => Promise<void> } | null = null;

  try {
    const dbInit = await initDb();
    client = dbInit.client;

    const fetcher = new FeedFetcher(dbInit.db, fetch);
    const results = await fetcher.run();

    const totalNew = results.reduce((sum, item) => sum + item.newItemsCount, 0);
    console.log(`[DevScheduler] Fetch completed. Sources: ${results.length}, new: ${totalNew}`);
  } catch (error) {
    console.error('[DevScheduler] Fetch failed:', error);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

export function startDevScheduler(): void {
  if (!dev) {
    return;
  }

  if (globalThis.__newsDevSchedulerStarted) {
    return;
  }

  globalThis.__newsDevSchedulerStarted = true;

  const intervalMs = getIntervalMs();
  let running = false;

  const tick = async () => {
    if (running) {
      return;
    }

    running = true;
    try {
      await runFeedFetchJob();
    } finally {
      running = false;
    }
  };

  setInterval(() => {
    void tick();
  }, intervalMs);

  void tick();
  console.log(`[DevScheduler] Started with interval ${intervalMs}ms`);
}
