import { json } from '@sveltejs/kit';
import { desc, gte, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { articles, feedSources } from '$lib/server/db/schema';
import type { RequestHandler } from '@sveltejs/kit';
import { isAllowedNewsLanguage } from '$lib/server/news-utils';

export const GET: RequestHandler = async ({ url }) => {
  const limitParam = url.searchParams.get('limit');
  const sinceParam = url.searchParams.get('since');

  const limit = Math.min(parseInt(limitParam ?? '20', 10) || 20, 100);
  const fetchLimit = Math.min(limit * 4, 400);

  const sinceDate = sinceParam ? new Date(sinceParam) : null;
  const validSince = sinceDate && !isNaN(sinceDate.getTime()) ? sinceDate : null;

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      translatedTitle: articles.translatedTitle,
      link: articles.link,
      pubDate: articles.pubDate,
      source: feedSources.name,
      language: articles.language,
      contentSnippet: articles.contentSnippet,
      translatedSnippet: articles.translatedSnippet
    })
    .from(articles)
    .innerJoin(feedSources, eq(articles.sourceId, feedSources.id))
    .where(validSince ? gte(articles.pubDate, validSince) : undefined)
    .orderBy(desc(articles.pubDate))
    .limit(fetchLimit);

  const filteredRows = rows.filter((row) =>
    isAllowedNewsLanguage({
      title: row.translatedTitle ?? row.title,
      contentSnippet: row.translatedSnippet ?? row.contentSnippet ?? '',
      content: undefined
    })
  );

  return json(
    filteredRows.slice(0, limit).map((row) => ({
      id: row.id,
      title: row.title,
      translatedTitle: row.translatedTitle ?? null,
      snippet: row.translatedSnippet ?? row.contentSnippet ?? null,
      link: row.link,
      pubDate: row.pubDate.toISOString(),
      source: row.source,
      language: row.language
    }))
  );
};
