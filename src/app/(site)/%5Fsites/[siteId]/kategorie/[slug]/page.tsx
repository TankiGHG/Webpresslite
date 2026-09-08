import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PostList } from '@/components/site/post-list';
import {
  getCategoryBySlug,
  getPublicSite,
  listPostsInCategory,
} from '@/lib/db/queries/public-sites';

type Params = Promise<{ siteId: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { siteId, slug } = await params;
  const [site, category] = await Promise.all([
    getPublicSite(siteId),
    getCategoryBySlug(siteId, slug),
  ]);

  if (!site || !category) return { title: 'Nicht gefunden', robots: { index: false } };

  return {
    title: `${category.name} — ${site.name}`,
    description: category.description ?? `Beiträge in der Kategorie ${category.name}`,
  };
}

export default async function CategoryArchivePage({ params }: { params: Params }) {
  const { siteId, slug } = await params;
  const category = await getCategoryBySlug(siteId, slug);

  if (!category) notFound();

  const posts = await listPostsInCategory(siteId, category.id);

  return (
    <div>
      <header className="post-header">
        <p className="post-meta">Kategorie</p>
        <h1 data-testid="archive-title">{category.name}</h1>
        {category.description ? <p className="post-lead">{category.description}</p> : null}
      </header>

      {posts.length === 0 ? (
        <div className="site-empty" data-testid="empty-archive">
          <p>In dieser Kategorie ist noch nichts veröffentlicht.</p>
        </div>
      ) : (
        <PostList posts={posts} />
      )}
    </div>
  );
}
