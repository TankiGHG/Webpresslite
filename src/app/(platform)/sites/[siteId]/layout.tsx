import type { ReactNode } from 'react';
import { AppHeader } from '@/components/platform/app-header';
import { requireSession } from '@/lib/auth/session';
import { listSitesForUser } from '@/lib/db/queries/sites';

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}`);
  const sites = await listSitesForUser(user.id);

  return (
    <div className="min-h-dvh">
      <AppHeader
        userName={user.name}
        sites={sites}
        currentSiteId={siteId}
        isPlatformAdmin={user.isPlatformAdmin}
      />
      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
    </div>
  );
}
