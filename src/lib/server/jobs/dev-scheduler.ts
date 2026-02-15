import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { FeedFetcher } from './feed-fetcher';

declare global {
  // eslint-disable-next-line no-var
  var __newsDevSchedulerInterval: NodeJS.Timeout | undefined;
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
  try {
    const fetcher = new FeedFetcher(db, fetch);
    const results = await fetcher.run();

    const totalNew = results.reduce((sum, item) => sum + item.newItemsCount, 0);
    console.log(`[DevScheduler] Fetch completed. Sources: ${results.length}, new: ${totalNew}`);
  } catch (error) {
    console.error('[DevScheduler] Fetch failed:', error);
  }
}

export function startDevScheduler(): void {
  if (!dev) {
    return;
  }

  // Clear existing interval if present (HMR support)
  if (globalThis.__newsDevSchedulerInterval) {
    clearInterval(globalThis.__newsDevSchedulerInterval);
    console.log('[DevScheduler] Cleared existing interval');
  }

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

  const intervalId = setInterval(() => {
    void tick();
  }, intervalMs);

  globalThis.__newsDevSchedulerInterval = intervalId;

  // Run immediately on start
  void tick();
  console.log(`[DevScheduler] Started with interval ${intervalMs}ms`);
}
