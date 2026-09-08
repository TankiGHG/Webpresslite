import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Pagination } from '@/components/site/pagination';
import { PostList } from '@/components/site/post-list';
import {
  getPublicSite,
  getPublishedPage,
  listPublicCategories,
} from '@/lib/db/queries/public-sites';

type Params = Promise<{ siteId: string; page: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { siteId, page } = await params;
  const site = await getPublicSite(siteId);

  if (!site) return { title: 'Nicht gefunden' };

  return {
    title: `${site.name} — Seite ${page}`,
    // Paginated listings should not compete with the posts themselves.
    robots: { index: false, follow: true },
  };
}

export default async function PaginatedHomePage({ params }: { params: Params }) {
  const { siteId, page: raw } = await params;
  const site = await getPublicSite(siteId);

  if (!site) notFound();

  const requested = Number.parseInt(raw, 10);
  if (!Number.isFinite(requested) || requested < 2) redirect('/');

  const [{ posts, page, pageCount }, categories] = await Promise.all([
    getPublishedPage(siteId, requested),
    listPublicCategories(siteId),
  ]);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  // Asking for a page beyond the end is a 404, not a silently different page.
  if (requested > pageCount) notFound();

  return (
    <div>
      <h1 className="sr-only">
        Beiträge von {site.name}, Seite {page}
      </h1>
      <h2 className="site-section-title">
        Seite {page} von {pageCount}
      </h2>
      <PostList posts={posts} categories={categoryById} />
      <Pagination page={page} pageCount={pageCount} />
    </div>
  );
}
