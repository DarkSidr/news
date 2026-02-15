import type { RequestHandler } from '@sveltejs/kit';
import { fetchAllNews } from '$lib/server/news-service';

const SITE_URL = 'https://technews.dmitry.art'; // Update with actual domain

interface SitemapUrl {
  loc: string;
  priority: string;
  changefreq: string;
  lastmod?: string;
}

export const GET: RequestHandler = async ({ fetch, url }) => {
  const baseUrl = `${url.protocol}//${url.host}`;

  try {
    // Fetch current news for sitemap
    const news = await fetchAllNews(fetch);

    const urls: SitemapUrl[] = [
      { loc: baseUrl, priority: '1.0', changefreq: 'daily' },
      ...news.slice(0, 100).map((item) => ({
        loc: `${baseUrl}/news/${encodeURIComponent(item.id)}`,
        priority: '0.8',
        changefreq: 'daily',
        lastmod: item.pubDate.split('T')[0]
      }))
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u: SitemapUrl) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <priority>${u.priority}</priority>
    <changefreq>${u.changefreq}</changefreq>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);

    // Return basic sitemap with just homepage
    const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(baseUrl)}</loc>
    <priority>1.0</priority>
    <changefreq>hourly</changefreq>
  </url>
</urlset>`;

    return new Response(basicSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
