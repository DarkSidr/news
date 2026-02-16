import sanitizeHtml from 'sanitize-html';
import { decode } from 'html-entities';
import type { NewsItem } from '$lib/types';

const FALLBACK_PUB_DATE_ISO = new Date(0).toISOString();

export type FeedItemLike = {
  guid?: string;
  link?: string;
  title?: string;
  pubDate?: string;
  enclosure?: { url: string; type?: string };
  'media:content'?: { $: { url: string } } | { $: { url: string } }[];
  content?: string;
  contentSnippet?: string;
  contentEncoded?: string;
  'content:encoded'?: string;
  description?: string;
};

export function stripHtml(value: string): string {
  const sanitized = sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {}
  });

  return decode(sanitized)
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildNewsId(feedName: string, item: FeedItemLike, index: number): string {
  const link = item.link?.trim();
  const guid = item.guid?.trim();

  if (guid) return `${feedName}:${guid}`;
  if (link) return `${feedName}:${link}`;

  const title = stripHtml(item.title || 'untitled');
  const pubDate = item.pubDate || 'no-date';
  return `${feedName}:${title}:${pubDate}:${index}`;
}

export function normalizePubDate(
  input?: string,
  logger: Pick<Console, 'warn'> = console
): string {
  if (!input) return FALLBACK_PUB_DATE_ISO;

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    logger.warn(`Invalid pubDate received: "${input}", using epoch fallback`);
    return FALLBACK_PUB_DATE_ISO;
  }

  return parsed.toISOString();
}

export function isLowQuality(item: NewsItem): boolean {
  const content = item.content?.trim() || '';
  const cleanContent = stripHtml(content);
  
  // 1. Empty content
  if (!content || !cleanContent) return true;

  // 2. Just "Comments" (common in HN RSS)
  if (cleanContent.toLowerCase() === 'comments') return true;

  // 3. Very short content (< 50 chars)
  if (cleanContent.length < 50) {
    return true;
  }

  // 4. Content is identical to the title (stub article)
  if (cleanContent === item.title.trim()) {
    return true;
  }

  return false;
}

export function stripReadMoreLinks(html: string): string {
  if (!html) return '';
  // Removes <a ...>Read more...</a> or <a ...>Читать далее...</a>
  // Case insensitive, handles whitespace, optional ellipsis
  return html.replace(/<a[^>]*>\s*(?:Читать\s+далее|Read\s+more|Читaть\s+дaлee).*?<\/a>/gi, '');
}
