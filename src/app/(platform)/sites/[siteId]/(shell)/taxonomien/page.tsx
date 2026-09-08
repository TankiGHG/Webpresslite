import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CategoryManager } from '@/components/taxonomies/category-manager';
import { TagOverview } from '@/components/taxonomies/tag-overview';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { can } from '@/lib/sites/permissions';
import { listCategories, listTags } from '@/lib/db/queries/taxonomies';

export const metadata: Metadata = { title: 'Kategorien und Tags' };

export default async function TaxonomiesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/taxonomien`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site || !can(site.role, 'taxonomy:manage')) notFound();

  const [categories, tags] = await Promise.all([
    listCategories(siteId, user.id),
    listTags(siteId, user.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Kategorien und Tags"
        description="Kategorien ordnen Beiträge in feste Rubriken, Tags entstehen beim Schreiben."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <CategoryManager siteId={siteId} categories={categories} />
        <TagOverview siteId={siteId} tags={tags} />
      </div>
    </div>
  );
}
