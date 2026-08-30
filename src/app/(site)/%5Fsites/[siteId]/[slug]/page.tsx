import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { RenderedContent } from '@/components/editor/rendered-content';
import { getPublicSite, getPublishedPost } from '@/lib/db/queries/public-sites';

type Params = Promise<{ siteId: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { siteId, slug } = await params;
  const [site, page] = await Promise.all([
    getPublicSite(siteId),
    getPublishedPost(siteId, slug, { type: 'page' }),
  ]);

  if (!page) return { title: 'Nicht gefunden' };

  return {
    title: page.seoTitle ?? `${page.title} — ${site?.name ?? ''}`.trim(),
    description: page.seoDescription ?? page.excerpt ?? undefined,
  };
}

/** Static pages live directly under the site root, without a prefix. */
export default async function PublicPage({ params }: { params: Params }) {
  const { siteId, slug } = await params;
  const page = await getPublishedPost(siteId, slug, { type: 'page' });

  if (!page) notFound();

  return (
    <article className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight" data-testid="page-title">
        {page.title}
      </h1>
      <RenderedContent html={page.contentHtml} />
    </article>
  );
}
