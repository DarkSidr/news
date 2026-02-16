import { describe, it, expect } from 'vitest';
import { createNewsSource } from './factory';
import { RssSource } from './rss-source';

import type { FeedSource } from '../db/schema';

describe('NewsSourceFactory', () => {
  it('should create RssSource for type "rss"', () => {
    const source: FeedSource = {
      id: 1,
      name: 'RSS Feed',
      url: 'http://example.com/rss',
      type: 'rss',
      language: 'en',
      isActive: true,
      lastFetchedAt: null,
      createdAt: new Date()
    };

    const instance = createNewsSource(source);
    expect(instance).toBeInstanceOf(RssSource);
    expect(instance?.name).toBe('RSS Feed');
  });

  it('should return null for API type (removed feature)', () => {
    const source: FeedSource = {
        id: 2,
        name: 'NewsData',
        url: 'https://newsdata.io/api/1/news',
        type: 'api',
        language: 'ru',
        isActive: true,
        lastFetchedAt: null,
        createdAt: new Date()
      };
  
      const instance = createNewsSource(source);
      expect(instance).toBeNull();
  });

  it('should return null for unknown type', () => {
    const source: FeedSource = {
      id: 3,
      name: 'Unknown',
      url: 'http://example.com',
      type: 'unknown' as FeedSource['type'],
      language: 'en',
      isActive: true,
      lastFetchedAt: null,
        createdAt: new Date()
      };
  
      const instance = createNewsSource(source);
      expect(instance).toBeNull();
  });

  it('should return null for API type but unknown URL', () => {
    const source: FeedSource = {
        id: 4,
        name: 'Unknown API',
        url: 'https://some-other-api.com',
        type: 'api',
        language: 'en',
        isActive: true,
        lastFetchedAt: null,
        createdAt: new Date()
      };
  
      const instance = createNewsSource(source);
      expect(instance).toBeNull();
  });
});
