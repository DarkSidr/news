import { desc, eq, sql } from 'drizzle-orm';
import type { NewsItem } from '$lib/types';
import { db } from './index';
import { articles, feedSources } from './schema';

interface DbNewsRow {
  id: string;
  title: string;
  translatedTitle: string | null;
  link: string;
  pubDate: Date;
  contentSnippet: string | null;
  translatedSnippet: string | null;
  imageUrl: string | null;
  content: string | null;
  translatedContent: string | null;
  source: string;
  language: string;
  isTranslated: boolean;
}

interface DbSitemapRow {
  id: string;
  pubDate: Date;
}

interface DbStatsRow {
  sourcesCount: number;
  articlesCount: number;
  latestArticleAt: Date | null;
}

function toIsoString(value: Date): string {
  return value.toISOString();
}

function toNullableDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  return null;
}

function toNewsItem(row: DbNewsRow): NewsItem {
  const hasTitleTranslation = Boolean(row.translatedTitle?.trim());
  const hasSnippetTranslation = Boolean(row.translatedSnippet?.trim());
  const hasContentTranslation = Boolean(row.translatedContent?.trim());
  const hasAnyTranslation =
    hasTitleTranslation || hasSnippetTranslation || hasContentTranslation;

  return {
    id: row.id,
    title: hasTitleTranslation ? row.translatedTitle! : row.title,
    link: row.link,
    pubDate: toIsoString(row.pubDate),
    contentSnippet: hasSnippetTranslation ? row.translatedSnippet! : row.contentSnippet ?? '',
    source: row.source,
    language: row.language,
    isTranslated: row.isTranslated && hasAnyTranslation,
    originalTitle: hasTitleTranslation ? row.title : undefined,
    originalContentSnippet: hasSnippetTranslation ? row.contentSnippet ?? '' : undefined,
    originalContent: hasContentTranslation ? row.content ?? '' : undefined,
    imageUrl: row.imageUrl ?? undefined,
    content: hasContentTranslation ? row.translatedContent! : row.content ?? undefined
  };
}

export async function getLatestNews(limit = 50): Promise<NewsItem[]> {
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      translatedTitle: articles.translatedTitle,
      link: articles.link,
      pubDate: articles.pubDate,
      contentSnippet: articles.contentSnippet,
      translatedSnippet: articles.translatedSnippet,
      imageUrl: articles.imageUrl,
      content: articles.content,
      translatedContent: articles.translatedContent,
      source: feedSources.name,
      language: articles.language,
      isTranslated: articles.isTranslated
    })
    .from(articles)
    .innerJoin(feedSources, eq(articles.sourceId, feedSources.id))
    .orderBy(desc(articles.pubDate))
    .limit(limit);

  return rows.map((row) =>
    toNewsItem({
      id: row.id,
      title: row.title,
      translatedTitle: row.translatedTitle,
      link: row.link,
      pubDate: row.pubDate,
      contentSnippet: row.contentSnippet,
      translatedSnippet: row.translatedSnippet,
      imageUrl: row.imageUrl,
      content: row.content,
      translatedContent: row.translatedContent,
      source: row.source,
      language: row.language,
      isTranslated: row.isTranslated
    })
  );
}

export async function getNewsById(id: string): Promise<NewsItem | null> {
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      translatedTitle: articles.translatedTitle,
      link: articles.link,
      pubDate: articles.pubDate,
      contentSnippet: articles.contentSnippet,
      translatedSnippet: articles.translatedSnippet,
      imageUrl: articles.imageUrl,
      content: articles.content,
      translatedContent: articles.translatedContent,
      source: feedSources.name,
      language: articles.language,
      isTranslated: articles.isTranslated
    })
    .from(articles)
    .innerJoin(feedSources, eq(articles.sourceId, feedSources.id))
    .where(eq(articles.id, id))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  return toNewsItem({
    id: row.id,
    title: row.title,
    translatedTitle: row.translatedTitle,
    link: row.link,
    pubDate: row.pubDate,
    contentSnippet: row.contentSnippet,
    translatedSnippet: row.translatedSnippet,
    imageUrl: row.imageUrl,
    content: row.content,
    translatedContent: row.translatedContent,
    source: row.source,
    language: row.language,
    isTranslated: row.isTranslated
  });
}

export async function getSitemapNews(limit = 100): Promise<DbSitemapRow[]> {
  const rows = await db
    .select({
      id: articles.id,
      pubDate: articles.pubDate
    })
    .from(articles)
    .orderBy(desc(articles.pubDate))
    .limit(limit);

  return rows.map((row) => ({ id: row.id, pubDate: row.pubDate }));
}

export async function getDbStats(): Promise<DbStatsRow> {
  // Optimized: Single query to get all stats
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM ${feedSources}) AS sources_count,
      (SELECT count(*)::int FROM ${articles}) AS articles_count,
      (SELECT pub_date FROM ${articles} ORDER BY pub_date DESC LIMIT 1) AS latest_article_at
  `);

  // Type assertion since raw execution returns any
  const row = result.rows[0] as unknown as {
    sources_count: number;
    articles_count: number;
    latest_article_at: unknown;
  };

  return {
    sourcesCount: row?.sources_count ?? 0,
    articlesCount: row?.articles_count ?? 0,
    latestArticleAt: toNullableDate(row?.latest_article_at)
  };
}
