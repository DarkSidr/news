import sanitizeHtml from 'sanitize-html';
import { decode } from 'html-entities';

const FALLBACK_PUB_DATE_ISO = new Date(0).toISOString();

export type FeedItemLike = {
  guid?: string;
  link?: string;
  title?: string;
  pubDate?: string;
  enclosure?: { url: string; type?: string };
  'media:content'?: { $: { url: string } } | { $: { url: string } }[];
  content?: string;
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

/**
 * Extracts the main image URL from an RSS item.
 * Prioritizes:
 * 1. enclave.url
 * 2. media:content
 * 3. First <img src> in content/description
 */
export function extractImage(item: FeedItemLike): string | undefined {
  // 1. Check enclosure
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }

  // 2. Check media:content
  if (item['media:content']) {
    const media = item['media:content'];
    if (Array.isArray(media)) {
        if (media.length > 0 && media[0].$?.url) return media[0].$.url;
    } else if (media.$?.url) {
        return media.$.url;
    }
  }

  // 3. Regex for <img src="..."> in content
  const imgRegex = /<img[^>]+src="([^">]+)"/i;
  
  const contentCandidates = [
    item['content:encoded'],
    item.content,
    item.description
  ];

  for (const candidate of contentCandidates) {
    if (candidate) {
      const match = candidate.match(imgRegex);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  return undefined;
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
