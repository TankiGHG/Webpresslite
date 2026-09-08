import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagination } from '@/components/site/pagination';
import { PostList } from '@/components/site/post-list';
import { after } from 'next/server';
import {
  getPublicSite,
  getPublishedPage,
  listPublicCategories,
} from '@/lib/db/queries/public-sites';
import { recordView } from '@/lib/db/queries/stats';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteId: string }>;
}): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) return { title: 'Nicht gefunden' };

  return {
    title: site.name,
    description: site.description ?? `Beiträge von ${site.name}`,
    alternates: { types: { 'application/rss+xml': '/feed.xml' } },
  };
}

export default async function SiteHomePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) notFound();

  const [{ posts, page, pageCount }, categories] = await Promise.all([
    getPublishedPage(siteId, 1),
    listPublicCategories(siteId),
  ]);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  // A site-level view: no post id, so the home page counts towards the total
  // without polluting the per-post ranking.
  after(async () => {
    await recordView({ siteId, postId: null });
  });

  return (
    <div>
      {site.description ? (
        <header className="site-hero">
          <h1>{site.name}</h1>
          <p>{site.description}</p>
        </header>
      ) : (
        <h1 className="sr-only">{site.name}</h1>
      )}

      {posts.length === 0 ? (
        <div className="site-empty" data-testid="no-published">
          <p>Hier ist noch nichts veröffentlicht.</p>
          <p className="post-meta">Der erste Beitrag erscheint hier, sobald er live ist.</p>
        </div>
      ) : (
        <>
          <h2 className="site-section-title">Neueste Beiträge</h2>
          <PostList posts={posts} categories={categoryById} />
          <Pagination page={page} pageCount={pageCount} />
        </>
      )}
    </div>
  );
}
