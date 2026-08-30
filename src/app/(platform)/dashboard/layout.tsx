import type { ReactNode } from 'react';
import { AppHeader } from '@/components/platform/app-header';
import { requireSession } from '@/lib/auth/session';
import { listSitesForUser } from '@/lib/db/queries/sites';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSession('/dashboard');
  const sites = await listSitesForUser(user.id);

  return (
    <div className="min-h-dvh">
      <AppHeader userName={user.name} sites={sites} />
      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
    </div>
  );
}
