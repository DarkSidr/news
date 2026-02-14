import { describe, expect, it, vi } from 'vitest';
import { buildNewsId, extractImage, isLowQuality, normalizePubDate, stripHtml, stripReadMoreLinks } from './news-utils';
import type { NewsItem } from '$lib/types';

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

describe('extractImage', () => {
  it('prefers enclosure over other sources', () => {
    expect(
      extractImage({
        enclosure: { url: 'https://cdn.example.com/enclosure.jpg' },
        'content:encoded': '<img src="https://cdn.example.com/content.jpg">'
      })
    ).toBe('https://cdn.example.com/enclosure.jpg');
  });

  it('supports media:content object and array', () => {
    expect(
      extractImage({
        'media:content': { $: { url: 'https://cdn.example.com/media-object.jpg' } }
      })
    ).toBe('https://cdn.example.com/media-object.jpg');

    expect(
      extractImage({
        'media:content': [{ $: { url: 'https://cdn.example.com/media-array.jpg' } }]
      })
    ).toBe('https://cdn.example.com/media-array.jpg');
  });

  it('extracts image from content with single quotes', () => {
    expect(
      extractImage({
        content: "<p>Intro</p><img src='https://cdn.example.com/single-quote.jpg' alt='cover'>"
      })
    ).toBe('https://cdn.example.com/single-quote.jpg');
  });

  it('returns undefined when no image sources are present', () => {
    expect(extractImage({ title: 'No image here' })).toBeUndefined();
  });
});

describe('stripReadMoreLinks', () => {
  it('removes "Читать далее" links', () => {
    const html = '<p>Some text.</p><a href="https://habr.com/post/123">Читать далее</a>';
    expect(stripReadMoreLinks(html)).toBe('<p>Some text.</p>');
  });

  it('removes "Read more" links', () => {
    const html = '<p>Text</p> <a href="#">Read more...</a>';
    expect(stripReadMoreLinks(html)).toBe('<p>Text</p> ');
  });

  it('keeps other links', () => {
    const html = '<p>Check <a href="#">this link</a> out.</p>';
    expect(stripReadMoreLinks(html)).toBe(html);
  });
  
  it('removes "Читать далее" regardless of case', () => {
      const html = '<a href="#">читАть дАлее</a>';
      expect(stripReadMoreLinks(html)).toBe('');
  });
});

describe('isLowQuality', () => {
  const baseItem: NewsItem = {
    id: '1',
    title: 'Test Title',
    link: 'https://example.com',
    pubDate: new Date().toISOString(),
    content: 'Some valuable content here that is definitely longer than fifty characters to ensure it is considered good quality.',
    contentSnippet: 'Snippet',
    source: 'Test',
    imageUrl: undefined
  };

  it('identifies empty content as low quality', () => {
    expect(isLowQuality({ ...baseItem, content: '' })).toBe(true);
    expect(isLowQuality({ ...baseItem, content: '   ' })).toBe(true);
  });

  it('identifies "Comments" content as low quality', () => {
    expect(isLowQuality({ ...baseItem, content: 'Comments' })).toBe(true);
    expect(isLowQuality({ ...baseItem, content: '  Comments  ' })).toBe(true);
    // HackerNews link style
    expect(isLowQuality({ ...baseItem, content: '<a href="https://news.ycombinator.com/item?id=123">Comments</a>' })).toBe(true);
  });

  it('identifies very short content without image as low quality', () => {
    expect(isLowQuality({ ...baseItem, content: 'Too short' })).toBe(true);
  });

  it('accepts short content if it has an image', () => {
    expect(isLowQuality({ 
      ...baseItem, 
      content: 'Short but has image', 
      imageUrl: 'https://example.com/image.jpg' 
    })).toBe(false);
  });

  it('accepts normal length content', () => {
    expect(isLowQuality(baseItem)).toBe(false);
  });

  it('identifies content identical to title as low quality (if no image)', () => {
     expect(isLowQuality({ 
      ...baseItem, 
      title: 'Breaking News', 
      content: 'Breaking News' 
    })).toBe(true);
  });
});
