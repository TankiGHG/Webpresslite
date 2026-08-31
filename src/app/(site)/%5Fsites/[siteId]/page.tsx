import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagination } from '@/components/site/pagination';
import { PostList } from '@/components/site/post-list';
import { after } from 'next/server';
import { getPublicSite, getPublishedPage } from '@/lib/db/queries/public-sites';
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
    description: `Beiträge von ${site.name}`,
    alternates: { types: { 'application/rss+xml': '/feed.xml' } },
  };
}

export default async function SiteHomePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) notFound();

  const { posts, page, pageCount } = await getPublishedPage(siteId, 1);

  // A site-level view: no post id, so the home page counts towards the total
  // without polluting the per-post ranking.
  after(async () => {
    await recordView({ siteId, postId: null });
  });

  return (
    <div>
      {posts.length === 0 ? (
        <p className="post-meta" data-testid="no-published">
          Hier ist noch nichts veröffentlicht.
        </p>
      ) : (
        <>
          <h1 className="sr-only">Beiträge von {site.name}</h1>
          <PostList posts={posts} />
          <Pagination page={page} pageCount={pageCount} />
        </>
      )}
    </div>
  );
}
