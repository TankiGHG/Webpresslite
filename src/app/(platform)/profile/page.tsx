import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { ProfileForm } from '@/components/auth/profile-form';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Profil' };

export default async function ProfilePage() {
  const { user } = await requireSession('/profile');

  return (
    <div>
      <PageHeader
        title="Profil"
        description={
          <span className="inline-flex items-center gap-3">
            <Avatar name={user.name} seed={user.email} size="sm" />
            <span>
              Angemeldet als <span data-testid="profile-email">{user.email}</span>
            </span>
          </span>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Angaben</CardTitle>
            <CardDescription>Der Name erscheint im Team und bei Beiträgen.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm name={user.name} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Passwort ändern</CardTitle>
            <CardDescription>
              Mindestens zehn Zeichen; andere Sitzungen bleiben angemeldet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
