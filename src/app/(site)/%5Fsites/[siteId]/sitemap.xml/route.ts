import {
  getPublicSite,
  listAllPublished,
  POSTS_PER_PAGE,
  countPublishedPosts,
} from '@/lib/db/queries/public-sites';
import { getEnv } from '@/lib/env';
import { siteUrl } from '@/lib/tenant/host';

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET(_request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) return new Response('Not found', { status: 404 });

  const base = siteUrl(site.subdomain, getEnv().ROOT_DOMAIN);
  const entries = await listAllPublished(siteId);
  const total = await countPublishedPosts(siteId);
  const pageCount = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));

  const urls: { loc: string; lastmod?: Date; priority: string }[] = [
    { loc: base, lastmod: entries[0]?.publishedAt ?? undefined, priority: '1.0' },
    { loc: `${base}/archiv`, priority: '0.5' },
  ];

  // Paginated listings are noindex, so only page 2 and up as crawl paths.
  for (let page = 2; page <= pageCount; page += 1) {
    urls.push({ loc: `${base}/seite/${page}`, priority: '0.3' });
  }

  for (const entry of entries) {
    urls.push({
      loc: entry.type === 'page' ? `${base}/${entry.slug}` : `${base}/beitrag/${entry.slug}`,
      lastmod: entry.updatedAt,
      priority: entry.type === 'page' ? '0.6' : '0.8',
    });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${xml(url.loc)}</loc>
${url.lastmod ? `    <lastmod>${url.lastmod.toISOString()}</lastmod>\n` : ''}    <priority>${url.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
