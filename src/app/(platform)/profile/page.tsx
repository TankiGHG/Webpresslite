import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { ProfileForm } from '@/components/auth/profile-form';
import { requireSession } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Profil — webpresslite' };

export default async function ProfilePage() {
  const { user } = await requireSession('/profile');

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          E-Mail-Adresse: <span data-testid="profile-email">{user.email}</span>
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-medium">Angaben</h2>
        <ProfileForm name={user.name} />
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Passwort ändern</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
