import { describe, expect, it, vi } from 'vitest';
import {
  buildNewsId,
  isAllowedNewsLanguage,
  isLowQuality,
  normalizePubDate,
  stripHtml,
  stripReadMoreLinks
} from './news-utils';
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
    source: 'Test'
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

  it('identifies very short content as low quality', () => {
    expect(isLowQuality({ ...baseItem, content: 'Too short' })).toBe(true);
  });

  it('identifies short content as low quality even if it previously had image', () => {
    expect(isLowQuality({ 
      ...baseItem, 
      content: 'Short content that would have been saved by image' 
    })).toBe(true);
  });

  it('accepts normal length content', () => {
    expect(isLowQuality(baseItem)).toBe(false);
  });

  it('identifies content identical to title as low quality', () => {
     expect(isLowQuality({ 
      ...baseItem, 
      title: 'Breaking News', 
      content: 'Breaking News' 
    })).toBe(true);
  });
});

describe('isAllowedNewsLanguage', () => {
  it('allows english content', () => {
    expect(
      isAllowedNewsLanguage({
        title: 'OpenAI launches new coding model',
        contentSnippet: 'New release improves reasoning and tool use.',
        content: 'Detailed changelog and benchmarks.'
      })
    ).toBe(true);
  });

  it('allows russian content', () => {
    expect(
      isAllowedNewsLanguage({
        title: 'Новый релиз Linux',
        contentSnippet: 'Разработчики представили обновления ядра.',
        content: 'Подробности доступны в официальном блоге.'
      })
    ).toBe(true);
  });

  it('blocks chinese and japanese scripts', () => {
    expect(
      isAllowedNewsLanguage({
        title: '我如何建立一個能自我繁殖的 6 人 AI 團隊',
        contentSnippet: '這不是 bug，是 feature。',
        content: '詳細內容在文章中。'
      })
    ).toBe(false);

    expect(
      isAllowedNewsLanguage({
        title: '日本語のニュースタイトル',
        contentSnippet: '開発者向けの記事です。',
        content: '詳細は本文を参照。'
      })
    ).toBe(false);
  });

  it('blocks myanmar script even with latin words mixed in', () => {
    expect(
      isAllowedNewsLanguage({
        title: 'array က ram ပေါ်မှာ ဒေတာ တွေ ဘယ်လို သိမ်းလဲ?',
        contentSnippet: 'ram ဆိုတာ ယာယီ javascript မှာ int အဆင့် 8 bytes',
        content: undefined
      })
    ).toBe(false);
  });
});
