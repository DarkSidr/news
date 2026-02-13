import { describe, expect, it, vi } from 'vitest';
import { buildNewsId, normalizePubDate, stripHtml } from './news-utils';

describe('stripHtml', () => {
  it('removes HTML tags and decodes entities', () => {
    const raw = '<b>Hello</b>&nbsp;&amp;&nbsp;<i>world</i>';

    expect(stripHtml(raw)).toBe('Hello & world');
  });

  it('drops script/style content and normalizes spacing', () => {
    const raw = '<script>alert(1)</script> text <style>body{display:none}</style> value';

    expect(stripHtml(raw)).toBe('text value');
  });

  it('handles malformed tags safely', () => {
    const raw = 'safe <img src=x onerror=alert(1) text';

    expect(stripHtml(raw)).toBe('safe');
  });
});

describe('buildNewsId', () => {
  it('prefers guid over link and fallback', () => {
    expect(buildNewsId('Feed', { guid: 'abc', link: 'https://example.com' }, 0)).toBe('Feed:abc');
  });

  it('uses link when guid is absent', () => {
    expect(buildNewsId('Feed', { link: 'https://example.com' }, 0)).toBe('Feed:https://example.com');
  });

  it('builds deterministic fallback id', () => {
    expect(buildNewsId('Feed', { title: '<b>Title</b>', pubDate: '2026-02-13' }, 3)).toBe(
      'Feed:Title:2026-02-13:3'
    );
  });
});

describe('normalizePubDate', () => {
  it('returns normalized ISO date for valid input', () => {
    expect(normalizePubDate('2026-02-13T15:30:00Z')).toBe('2026-02-13T15:30:00.000Z');
  });

  it('returns epoch fallback and warns on invalid input', () => {
    const warn = vi.fn();

    expect(normalizePubDate('not-a-date', { warn })).toBe('1970-01-01T00:00:00.000Z');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('returns epoch fallback when date is missing', () => {
    expect(normalizePubDate()).toBe('1970-01-01T00:00:00.000Z');
  });
});
