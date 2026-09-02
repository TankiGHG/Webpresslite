import type { ReactNode } from 'react';
import { AppHeader } from '@/components/platform/app-header';
import { requireSession } from '@/lib/auth/session';
import { listSitesForUser } from '@/lib/db/queries/sites';

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSession('/profile');
  const sites = await listSitesForUser(user.id);

  return (
    <div className="min-h-dvh">
      <AppHeader userName={user.name} sites={sites} isPlatformAdmin={user.isPlatformAdmin} />
      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
    </div>
  );
}
