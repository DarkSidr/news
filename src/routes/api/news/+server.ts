import { json } from '@sveltejs/kit';
import { getLatestNewsPaged } from '$lib/server/db/news-repository';
import type { RequestHandler } from '@sveltejs/kit';

/**
 * Пагинированный endpoint для главной ленты.
 * Query params:
 * - offset: смещение (default: 0)
 * - limit: кол-во элементов (default: 30, max: 50)
 */
export const GET: RequestHandler = async ({ url }) => {
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '30', 10) || 30));
  const source = url.searchParams.get('source') || null;

  const { items, hasMore, total } = await getLatestNewsPaged(offset, limit, source);

  return json({ items, hasMore, total });
};
