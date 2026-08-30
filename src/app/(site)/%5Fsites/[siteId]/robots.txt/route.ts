import { getPublicSite } from '@/lib/db/queries/public-sites';
import { getEnv } from '@/lib/env';
import { siteUrl } from '@/lib/tenant/host';

export async function GET(_request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) return new Response('Not found', { status: 404 });

  const base = siteUrl(site.subdomain, getEnv().ROOT_DOMAIN);

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
