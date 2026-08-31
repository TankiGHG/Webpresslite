import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CategoryManager } from '@/components/taxonomies/category-manager';
import { TagOverview } from '@/components/taxonomies/tag-overview';
import { requireSession } from '@/lib/auth/session';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { can } from '@/lib/sites/permissions';
import { listCategories, listTags } from '@/lib/db/queries/taxonomies';

export const metadata: Metadata = { title: 'Kategorien und Tags — webpresslite' };

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
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kategorien und Tags</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{site.name}</p>
      </header>

      <CategoryManager siteId={siteId} categories={categories} />
      <TagOverview siteId={siteId} tags={tags} />

      <p className="text-sm">
        <Link href={`/sites/${siteId}`} className="underline underline-offset-4">
          Zurück zur Site
        </Link>
      </p>
    </div>
  );
}
