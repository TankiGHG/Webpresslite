import { getPublicSite } from '@/lib/db/queries/public-sites';
import { publicSiteUrl } from '@/lib/tenant/public-url';

export async function GET(_request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) return new Response('Not found', { status: 404 });

  const base = publicSiteUrl(site);

  const body = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${base}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
