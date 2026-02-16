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
export const TRANSLATION_MAX_PER_RUN = parsePositiveInt(
  env.TRANSLATION_MAX_PER_RUN ?? '',
  20
);
export const TRANSLATION_BATCH_SIZE = parsePositiveInt(
  env.TRANSLATION_BATCH_SIZE ?? '',
  5
);

export const MAX_TRANSLATION_CONTENT_LENGTH = parsePositiveInt(
  env.MAX_TRANSLATION_CONTENT_LENGTH ?? '',
  5000
);

export const TRANSLATION_TIMEOUT_MS = parsePositiveInt(
  env.TRANSLATION_TIMEOUT_MS ?? '',
  30_000
);

export const CF_ACCOUNT_ID = env.CF_ACCOUNT_ID?.trim() ?? '';
export const CF_AI_TOKEN = env.CF_AI_TOKEN?.trim() ?? '';
export const LIBRETRANSLATE_URL = env.LIBRETRANSLATE_URL?.trim() ?? '';

export const BLOCKED_DOMAINS: string[] = (env.BLOCKED_DOMAINS || 'css-doodle.com')
  .split(',')
  .map((domain: string) => domain.trim())
  .filter((domain: string) => domain.length > 0);

export const NEWSDATA_API_KEY = env.NEWSDATA_API_KEY?.trim() ?? '';
