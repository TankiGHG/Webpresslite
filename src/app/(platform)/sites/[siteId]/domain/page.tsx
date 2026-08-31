import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DomainForm } from '@/components/sites/domain-form';
import { requireSession } from '@/lib/auth/session';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { can } from '@/lib/sites/permissions';
import { limitsFor } from '@/lib/sites/plans';

export const metadata: Metadata = { title: 'Domain — webpresslite' };

export default async function DomainPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/domain`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site || !can(site.role, 'site:domain')) notFound();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Eigene Domain</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{site.name}</p>
      </header>

      <DomainForm
        siteId={siteId}
        domain={site.customDomain}
        token={site.domainVerificationToken}
        verifiedAt={site.domainVerifiedAt?.toISOString() ?? null}
        allowed={limitsFor(site.plan).customDomain}
      />

      <p className="text-sm">
        <Link href={`/sites/${siteId}`} className="underline underline-offset-4">
          Zurück zur Site
        </Link>
      </p>
    </div>
  );
}
