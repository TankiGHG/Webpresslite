import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AppHeader } from '@/components/platform/app-header';
import { UserManager } from '@/components/platform-admin/user-manager';
import { requireSession } from '@/lib/auth/session';
import { listAllUsers, PlatformAccessError } from '@/lib/db/queries/platform-users';
import { listSitesForUser } from '@/lib/db/queries/sites';

export const metadata: Metadata = { title: 'Nutzerverwaltung — webpresslite' };

export default async function AdminUsersPage() {
  const { user } = await requireSession('/admin/users');

  const [sites, users] = await Promise.all([
    listSitesForUser(user.id),
    listAllUsers(user.id).catch((error) => {
      if (error instanceof PlatformAccessError) notFound();
      throw error;
    }),
  ]);

  return (
    <div className="min-h-dvh">
      <AppHeader userName={user.name} sites={sites} isPlatformAdmin={user.isPlatformAdmin} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-10">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Nutzerverwaltung</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Alle registrierten Nutzer der Plattform. Nur für Platform-Admins sichtbar.
            </p>
          </header>

          <UserManager users={users} currentUserId={user.id} />
        </div>
      </main>
    </div>
  );
}
