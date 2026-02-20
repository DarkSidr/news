import { desc, eq, gte, lt, sql, and } from 'drizzle-orm';
import type { NewsItem, SourceWithCount } from '$lib/types';
import { db } from './index';
import { articles, feedSources } from './schema';
import { NEWS_RETENTION_DAYS, BLOCKED_KEYWORDS } from '../config';
import { isAllowedNewsLanguage } from '../news-utils';

interface DbNewsRow {
  id: string;
  title: string;
  translatedTitle: string | null;
  link: string;
  pubDate: Date;
  contentSnippet: string | null;
  translatedSnippet: string | null;
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
    content: hasContentTranslation ? row.translatedContent! : row.content ?? undefined
  };
}

export async function getLatestNews(): Promise<NewsItem[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - NEWS_RETENTION_DAYS);

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      translatedTitle: articles.translatedTitle,
      link: articles.link,
      pubDate: articles.pubDate,
      contentSnippet: articles.contentSnippet,
      translatedSnippet: articles.translatedSnippet,
      content: articles.content,
      translatedContent: articles.translatedContent,
      source: feedSources.name,
      language: articles.language,
      isTranslated: articles.isTranslated
    })
    .from(articles)
    .innerJoin(feedSources, eq(articles.sourceId, feedSources.id))
    .where(gte(articles.pubDate, cutoffDate))
    .orderBy(desc(articles.pubDate));

  const items = rows.map((row) =>
    toNewsItem({
      id: row.id,
      title: row.title,
      translatedTitle: row.translatedTitle,
      link: row.link,
      pubDate: row.pubDate,
      contentSnippet: row.contentSnippet,
      translatedSnippet: row.translatedSnippet,
      content: row.content,
      translatedContent: row.translatedContent,
      source: row.source,
      language: row.language,
      isTranslated: row.isTranslated
    })
  );

  return items.filter((item) => {
    if (!isAllowedNewsLanguage(item)) return false;
    const text = `${item.title} ${item.originalTitle ?? ''} ${item.contentSnippet} ${item.originalContentSnippet ?? ''} ${item.content ?? ''}`.toLowerCase();
    return !BLOCKED_KEYWORDS.some((keyword) => text.includes(keyword));
  });
}

export async function getLatestNewsPaged(
  offset: number,
  limit: number,
  sourceName?: string | null
): Promise<{ items: NewsItem[]; hasMore: boolean; total: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - NEWS_RETENTION_DAYS);

  const conditions = [gte(articles.pubDate, cutoffDate)];
  if (sourceName && sourceName !== 'Все источники') {
    conditions.push(eq(feedSources.name, sourceName));
  }

  // Загружаем все данные для правильной фильтрации
  const allRows = await db
    .select({
      id: articles.id,
      title: articles.title,
      translatedTitle: articles.translatedTitle,
      link: articles.link,
      pubDate: articles.pubDate,
      contentSnippet: articles.contentSnippet,
      translatedSnippet: articles.translatedSnippet,
      content: articles.content,
      translatedContent: articles.translatedContent,
      source: feedSources.name,
      language: articles.language,
      isTranslated: articles.isTranslated
    })
    .from(articles)
    .innerJoin(feedSources, eq(articles.sourceId, feedSources.id))
    .where(conditions.length > 1 ? and(...conditions) : conditions[0])
    .orderBy(desc(articles.pubDate));

  // Применяем клиентскую фильтрацию (язык + ключевые слова)
  const allFiltered = allRows
    .map((row) =>
      toNewsItem({
        id: row.id,
        title: row.title,
        translatedTitle: row.translatedTitle,
        link: row.link,
        pubDate: row.pubDate,
        contentSnippet: row.contentSnippet,
        translatedSnippet: row.translatedSnippet,
        content: row.content,
        translatedContent: row.translatedContent,
        source: row.source,
        language: row.language,
        isTranslated: row.isTranslated
      })
    )
    .filter((item) => {
      if (!isAllowedNewsLanguage(item)) return false;
      const text =
        `${item.title} ${item.originalTitle ?? ''} ${item.contentSnippet} ${item.originalContentSnippet ?? ''} ${item.content ?? ''}`.toLowerCase();
      return !BLOCKED_KEYWORDS.some((keyword) => text.includes(keyword));
    });

  // Правильная пагинация и total
  const totalFiltered = allFiltered.length;
  const items = allFiltered.slice(offset, offset + limit);
  const hasMore = totalFiltered > offset + limit;

  return {
    items,
    hasMore,
    total: totalFiltered
  };
}

export async function getActiveSources(): Promise<SourceWithCount[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - NEWS_RETENTION_DAYS);

  // Получаем все новости с применением тех же фильтров, что и в getLatestNewsPaged
  const allRows = await db
    .select({
      id: articles.id,
      title: articles.title,
      translatedTitle: articles.translatedTitle,
      contentSnippet: articles.contentSnippet,
      translatedSnippet: articles.translatedSnippet,
      content: articles.content,
      translatedContent: articles.translatedContent,
      source: feedSources.name,
      language: articles.language,
      isTranslated: articles.isTranslated,
      link: articles.link,
      pubDate: articles.pubDate
    })
    .from(articles)
    .innerJoin(feedSources, eq(articles.sourceId, feedSources.id))
    .where(gte(articles.pubDate, cutoffDate));

  // Применяем те же фильтры (язык + ключевые слова)
  const filtered = allRows
    .map((row) =>
      toNewsItem({
        id: row.id,
        title: row.title,
        translatedTitle: row.translatedTitle,
        link: row.link,
        pubDate: row.pubDate,
        contentSnippet: row.contentSnippet,
        translatedSnippet: row.translatedSnippet,
        content: row.content,
        translatedContent: row.translatedContent,
        source: row.source,
        language: row.language,
        isTranslated: row.isTranslated
      })
    )
    .filter((item) => {
      if (!isAllowedNewsLanguage(item)) return false;
      const text =
        `${item.title} ${item.originalTitle ?? ''} ${item.contentSnippet} ${item.originalContentSnippet ?? ''} ${item.content ?? ''}`.toLowerCase();
      return !BLOCKED_KEYWORDS.some((keyword) => text.includes(keyword));
    });

  // Подсчитываем по источникам
  const sourceCounts = filtered.reduce((acc, item) => {
    acc[item.source] = (acc[item.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Преобразуем в массив и сортируем по количеству
  return Object.entries(sourceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function deleteOldNewsFromDb(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - NEWS_RETENTION_DAYS);

  const deletedRows = await db
    .delete(articles)
    .where(lt(articles.pubDate, cutoffDate))
    .returning({ id: articles.id });

  return deletedRows.length;
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
