import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { UserManager } from '@/components/platform-admin/user-manager';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { listAllUsers, PlatformAccessError } from '@/lib/db/queries/platform-users';

export const metadata: Metadata = { title: 'Nutzerverwaltung' };

export default async function AdminUsersPage() {
  const { user } = await requireSession('/admin/users');

  const users = await listAllUsers(user.id).catch((error) => {
    if (error instanceof PlatformAccessError) notFound();
    throw error;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nutzerverwaltung"
        description={`${users.length} registrierte ${users.length === 1 ? 'Person' : 'Personen'}. Nur für Platform-Admins sichtbar.`}
      />
      <UserManager users={users} currentUserId={user.id} />
    </div>
  );
}
