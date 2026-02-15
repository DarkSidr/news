import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, setHeaders }) => {
  setHeaders({
    'Cache-Control': 'public, max-age=3600, s-maxage=3600'
  });

  const baseUrl = `${url.protocol}//${url.host}`;
  const sitemapUrl = `${baseUrl}/sitemap.xml`;

  const robots = `
User-agent: *
Disallow:

Sitemap: ${sitemapUrl}
`.trim();

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
