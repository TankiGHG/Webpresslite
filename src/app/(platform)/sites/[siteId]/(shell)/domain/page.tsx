import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DomainForm } from '@/components/sites/domain-form';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { can } from '@/lib/sites/permissions';
import { limitsFor } from '@/lib/sites/plans';
import { publicSiteUrl } from '@/lib/tenant/public-url';

export const metadata: Metadata = { title: 'Domain' };

export default async function DomainPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/domain`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site || !can(site.role, 'site:domain')) notFound();

  return (
    <div>
      <PageHeader
        title="Eigene Domain"
        description={
          <>
            Deine Site ist unter{' '}
            <a href={publicSiteUrl(site)} className="text-foreground font-medium hover:underline">
              {publicSiteUrl(site).replace(/^https?:\/\//, '')}
            </a>{' '}
            erreichbar. Mit einer eigenen Domain wird daraus deine Adresse.
          </>
        }
      />

      <DomainForm
        siteId={siteId}
        domain={site.customDomain}
        token={site.domainVerificationToken}
        verifiedAt={site.domainVerifiedAt?.toISOString() ?? null}
        allowed={limitsFor(site.plan).customDomain}
      />
    </div>
  );
}
