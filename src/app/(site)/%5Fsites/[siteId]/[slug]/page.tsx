import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { RenderedContent } from '@/components/editor/rendered-content';
import { getPublicSite, getPublishedPost } from '@/lib/db/queries/public-sites';
import { getEnv } from '@/lib/env';
import { siteUrl } from '@/lib/tenant/host';

type Params = Promise<{ siteId: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { siteId, slug } = await params;
  const [site, page] = await Promise.all([
    getPublicSite(siteId),
    getPublishedPost(siteId, slug, { type: 'page' }),
  ]);

  if (!site || !page) return { title: 'Nicht gefunden', robots: { index: false } };

  const url = `${siteUrl(site.subdomain, getEnv().ROOT_DOMAIN)}/${page.slug}`;
  const title = page.seoTitle ?? page.title;
  const description = page.seoDescription ?? page.excerpt ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', title, description, url, siteName: site.name, locale: 'de_DE' },
  };
}

/** Static pages live directly under the site root, without a prefix. */
export default async function PublicPage({ params }: { params: Params }) {
  const { siteId, slug } = await params;
  const page = await getPublishedPost(siteId, slug, { type: 'page' });

  if (!page) notFound();

  return (
    <article>
      <header className="post-header">
        <h1 data-testid="page-title">{page.title}</h1>
      </header>
      <RenderedContent html={page.contentHtml} />
    </article>
  );
}
