import { vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
  env: {
    NEWSDATA_API_KEY: 'test-key',
    ARXIV_API_KEY: 'test-arxiv-key', // Even if removed from code, keeping in mock doesn't hurt, or remove if strict
    RSS_TIMEOUT_MS: '1000',
    CACHE_TTL_MS: '60000',
    MAX_SNIPPET_LENGTH: '100',
    BLOCKED_DOMAINS: 'blocked.com'
  }
}));

vi.mock('$env/dynamic/public', () => ({
  env: {}
}));
