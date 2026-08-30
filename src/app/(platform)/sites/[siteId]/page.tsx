import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DeleteSiteForm } from '@/components/sites/delete-site-form';
import { requireSession } from '@/lib/auth/session';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { getEnv } from '@/lib/env';
import { siteUrl } from '@/lib/tenant/host';

export const metadata: Metadata = { title: 'Site — webpresslite' };

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}`);

  // Returns null both for a foreign site and a nonexistent one, so the 404 does
  // not confirm that some other user's site id exists.
  const site = await getSiteForUser(siteId, user.id);
  if (!site) notFound();

  const rootDomain = getEnv().ROOT_DOMAIN;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="site-detail-name">
          {site.name}
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          <a href={siteUrl(site.subdomain, rootDomain)} className="font-mono hover:underline">
            {site.subdomain}.{rootDomain}
          </a>{' '}
          · Rolle: <span data-testid="site-role">{site.role}</span> · Plan: {site.plan}
        </p>
      </header>

      <section className="rounded-lg border p-6">
        <h2 className="font-medium">Inhalte</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Beiträge und Seiten kommen in Phase 3.
        </p>
      </section>

      {site.role === 'owner' ? (
        <section className="space-y-3">
          <h2 className="font-medium">Gefahrenzone</h2>
          <DeleteSiteForm siteId={site.id} subdomain={site.subdomain} />
        </section>
      ) : null}

      <p className="text-sm">
        <Link href="/dashboard" className="underline underline-offset-4">
          Zurück zum Dashboard
        </Link>
      </p>
    </div>
  );
}
