import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { SiteShell } from '@/components/platform/site-shell';
import { requireSession } from '@/lib/auth/session';
import { countPendingComments } from '@/lib/db/queries/comments';
import { getSiteForUser, listSitesForUser } from '@/lib/db/queries/sites';
import { getEnv } from '@/lib/env';
import { can } from '@/lib/sites/permissions';
import { publicSiteUrl } from '@/lib/tenant/public-url';

export default async function SiteShellLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}`);

  const [site, sites] = await Promise.all([
    getSiteForUser(siteId, user.id),
    listSitesForUser(user.id),
  ]);
  if (!site) notFound();

  // Only moderators see the badge, and the count is cheap enough per request.
  const pendingComments = can(site.role, 'comment:moderate')
    ? await countPendingComments(site.id, user.id)
    : 0;

  const env = getEnv();

  return (
    <SiteShell
      site={{ id: site.id, name: site.name, subdomain: site.subdomain, role: site.role }}
      sites={sites.map((entry) => ({
        id: entry.id,
        name: entry.name,
        subdomain: entry.subdomain,
        role: entry.role,
      }))}
      siteUrl={publicSiteUrl(site)}
      rootDomain={env.ROOT_DOMAIN}
      user={{ name: user.name, email: user.email, isPlatformAdmin: user.isPlatformAdmin }}
      badges={{ pendingComments }}
    >
      {children}
    </SiteShell>
  );
}
