import type { Metadata } from 'next';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { getSessionContext } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Konto gesperrt — webpresslite' };

/**
 * Deliberately does not call `requireSession` — that would redirect right
 * back here for a banned user, and to `/login` for anyone else, which makes
 * this page unreachable for the one visitor it is not that.
 */
export default async function BannedPage() {
  const context = await getSessionContext();
  if (!context) redirect('/login');
  if (!context.user.bannedAt) redirect('/dashboard');

  return (
    <div className="mx-auto max-w-md space-y-4 px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Konto gesperrt</h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Dieses Konto wurde von einem Platform-Admin gesperrt. Bei Fragen wende dich an die
        Betreiberin oder den Betreiber der Plattform.
      </p>
      <div className="flex justify-center">
        <SignOutButton />
      </div>
    </div>
  );
}
