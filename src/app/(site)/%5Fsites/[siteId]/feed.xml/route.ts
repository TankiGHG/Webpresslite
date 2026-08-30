import { getPublicSite, listAllPublished } from '@/lib/db/queries/public-sites';
import { getEnv } from '@/lib/env';
import { siteUrl } from '@/lib/tenant/host';

/** Escapes the five characters that are not legal as XML character data. */
function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(_request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) return new Response('Not found', { status: 404 });

  const base = siteUrl(site.subdomain, getEnv().ROOT_DOMAIN);
  const entries = (await listAllPublished(siteId)).filter((entry) => entry.type === 'post');
  const updated = entries[0]?.publishedAt ?? new Date();

  const items = entries
    .map((entry) => {
      const url = `${base}/beitrag/${entry.slug}`;
      const description = entry.excerpt
        ? `      <description>${xml(entry.excerpt)}</description>\n`
        : '';

      return `    <item>
      <title>${xml(entry.title)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <pubDate>${(entry.publishedAt ?? new Date()).toUTCString()}</pubDate>
${description}    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(site.name)}</title>
    <link>${xml(base)}</link>
    <description>${xml(`Beiträge von ${site.name}`)}</description>
    <language>de</language>
    <lastBuildDate>${updated.toUTCString()}</lastBuildDate>
    <atom:link href="${xml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
