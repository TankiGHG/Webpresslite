import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PostList } from '@/components/site/post-list';
import { getPublicSite, getTagBySlug, listPostsWithTag } from '@/lib/db/queries/public-sites';

type Params = Promise<{ siteId: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { siteId, slug } = await params;
  const [site, tag] = await Promise.all([getPublicSite(siteId), getTagBySlug(siteId, slug)]);

  if (!site || !tag) return { title: 'Nicht gefunden', robots: { index: false } };

  return { title: `${tag.name} — ${site.name}`, description: `Beiträge mit dem Tag ${tag.name}` };
}

export default async function TagArchivePage({ params }: { params: Params }) {
  const { siteId, slug } = await params;
  const tag = await getTagBySlug(siteId, slug);

  if (!tag) notFound();

  const posts = await listPostsWithTag(siteId, tag.id);

  return (
    <div className="space-y-6">
      <header className="post-header">
        <h1 data-testid="archive-title">Tag: {tag.name}</h1>
      </header>

      {posts.length === 0 ? (
        <p className="post-meta" data-testid="empty-archive">
          Mit diesem Tag ist noch nichts veröffentlicht.
        </p>
      ) : (
        <PostList posts={posts} />
      )}
    </div>
  );
}
