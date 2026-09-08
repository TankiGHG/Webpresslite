import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PostList } from '@/components/site/post-list';
import {
  getPublicSite,
  getTagBySlug,
  listPostsWithTag,
  listPublicCategories,
} from '@/lib/db/queries/public-sites';

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

  const [posts, categories] = await Promise.all([
    listPostsWithTag(siteId, tag.id),
    listPublicCategories(siteId),
  ]);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return (
    <div>
      <header className="post-header">
        <p className="post-meta">Tag</p>
        <h1 data-testid="archive-title">#{tag.name}</h1>
      </header>

      {posts.length === 0 ? (
        <div className="site-empty" data-testid="empty-archive">
          <p>Mit diesem Tag ist noch nichts veröffentlicht.</p>
        </div>
      ) : (
        <PostList posts={posts} categories={categoryById} />
      )}
    </div>
  );
}
