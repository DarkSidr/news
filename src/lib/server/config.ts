import { env } from '$env/dynamic/private';

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export const RSS_TIMEOUT_MS = parsePositiveInt(env.RSS_TIMEOUT_MS ?? '', 8_000);
export const CACHE_TTL_MS = parsePositiveInt(env.CACHE_TTL_MS ?? '', 5 * 60 * 1000);
export const MAX_SNIPPET_LENGTH = parsePositiveInt(env.MAX_SNIPPET_LENGTH ?? '', 500);

export const BLOCKED_DOMAINS: string[] = (env.BLOCKED_DOMAINS || 'css-doodle.com')
  .split(',')
  .map((domain: string) => domain.trim())
  .filter((domain: string) => domain.length > 0);
