import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { RenderedContent } from '@/components/editor/rendered-content';
import { getPublicSite, getPublishedPost } from '@/lib/db/queries/public-sites';

type Params = Promise<{ siteId: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { siteId, slug } = await params;
  const [site, post] = await Promise.all([getPublicSite(siteId), getPublishedPost(siteId, slug)]);

  if (!post) return { title: 'Nicht gefunden' };

  return {
    title: post.seoTitle ?? `${post.title} — ${site?.name ?? ''}`.trim(),
    description: post.seoDescription ?? post.excerpt ?? undefined,
  };
}

export default async function PublicPostPage({ params }: { params: Params }) {
  const { siteId, slug } = await params;
  const post = await getPublishedPost(siteId, slug);

  if (!post) notFound();

  return (
    <article className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight" data-testid="post-title">
        {post.title}
      </h1>
      {post.publishedAt ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          <time dateTime={post.publishedAt.toISOString()}>
            {post.publishedAt.toLocaleDateString('de-DE')}
          </time>
        </p>
      ) : null}
      <RenderedContent html={post.contentHtml} />
    </article>
  );
}
