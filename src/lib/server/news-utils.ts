import sanitizeHtml from 'sanitize-html';
import { decode } from 'html-entities';

const FALLBACK_PUB_DATE_ISO = new Date(0).toISOString();

export type FeedItemLike = {
  guid?: string;
  link?: string;
  title?: string;
  pubDate?: string;
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
