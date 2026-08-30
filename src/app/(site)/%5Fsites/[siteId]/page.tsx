import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicSite } from '@/lib/db/queries/public-sites';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteId: string }>;
}): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  return { title: site?.name ?? 'Site' };
}

export default async function SiteHomePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) notFound();

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Willkommen bei {site.name}</h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Diese Site ist angelegt, aber noch ohne Inhalte. Beiträge kommen in Phase 3.
      </p>
      <p className="text-xs text-[var(--color-muted-foreground)]" data-testid="site-subdomain">
        {site.subdomain}
      </p>
    </div>
  );
}
