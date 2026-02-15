import { desc, eq, sql } from 'drizzle-orm';
import type { NewsItem } from '$lib/types';
import { db } from './index';
import { articles, feedSources } from './schema';

interface DbNewsRow {
  id: string;
  title: string;
  link: string;
  pubDate: Date;
  contentSnippet: string | null;
  imageUrl: string | null;
  content: string | null;
  source: string;
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

function toNewsItem(row: DbNewsRow): NewsItem {
  return {
    id: row.id,
    title: row.title,
    link: row.link,
    pubDate: toIsoString(row.pubDate),
    contentSnippet: row.contentSnippet ?? '',
    source: row.source,
    imageUrl: row.imageUrl ?? undefined,
    content: row.content ?? undefined
  };
}

export async function getLatestNews(limit = 50): Promise<NewsItem[]> {
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      link: articles.link,
      pubDate: articles.pubDate,
      contentSnippet: articles.contentSnippet,
      imageUrl: articles.imageUrl,
      content: articles.content,
      source: feedSources.name
    })
    .from(articles)
    .innerJoin(feedSources, eq(articles.sourceId, feedSources.id))
    .orderBy(desc(articles.pubDate))
    .limit(limit);

  return rows.map((row) =>
    toNewsItem({
      id: row.id,
      title: row.title,
      link: row.link,
      pubDate: row.pubDate,
      contentSnippet: row.contentSnippet,
      imageUrl: row.imageUrl,
      content: row.content,
      source: row.source
    })
  );
}

export async function getNewsById(id: string): Promise<NewsItem | null> {
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      link: articles.link,
      pubDate: articles.pubDate,
      contentSnippet: articles.contentSnippet,
      imageUrl: articles.imageUrl,
      content: articles.content,
      source: feedSources.name
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
    link: row.link,
    pubDate: row.pubDate,
    contentSnippet: row.contentSnippet,
    imageUrl: row.imageUrl,
    content: row.content,
    source: row.source
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
    latest_article_at: Date | null;
  };

  return {
    sourcesCount: row?.sources_count ?? 0,
    articlesCount: row?.articles_count ?? 0,
    latestArticleAt: row?.latest_article_at ?? null
  };
}
