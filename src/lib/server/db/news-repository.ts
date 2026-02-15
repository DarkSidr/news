import { and, desc, eq, sql } from 'drizzle-orm';
import type { NewsItem } from '$lib/types';
import { initDb } from './index';
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
  const { client, db } = await initDb();

  try {
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
  } finally {
    await client.end();
  }
}

export async function getNewsById(id: string): Promise<NewsItem | null> {
  const { client, db } = await initDb();

  try {
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
  } finally {
    await client.end();
  }
}

export async function getSitemapNews(limit = 100): Promise<DbSitemapRow[]> {
  const { client, db } = await initDb();

  try {
    const rows = await db
      .select({
        id: articles.id,
        pubDate: articles.pubDate
      })
      .from(articles)
      .orderBy(desc(articles.pubDate))
      .limit(limit);

    return rows.map((row) => ({ id: row.id, pubDate: row.pubDate }));
  } finally {
    await client.end();
  }
}

export async function getDbStats(): Promise<DbStatsRow> {
  const { client, db } = await initDb();

  try {
    const [sourcesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedSources);

    const [articlesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles);

    const [latestResult] = await db
      .select({ pubDate: articles.pubDate })
      .from(articles)
      .orderBy(desc(articles.pubDate))
      .limit(1);

    return {
      sourcesCount: sourcesResult?.count ?? 0,
      articlesCount: articlesResult?.count ?? 0,
      latestArticleAt: latestResult?.pubDate ?? null
    };
  } finally {
    await client.end();
  }
}

export async function isFeedSourceExistsByName(name: string): Promise<boolean> {
  const { client, db } = await initDb();

  try {
    const rows = await db
      .select({ id: feedSources.id })
      .from(feedSources)
      .where(and(eq(feedSources.name, name), eq(feedSources.isActive, true)))
      .limit(1);

    return rows.length > 0;
  } finally {
    await client.end();
  }
}
