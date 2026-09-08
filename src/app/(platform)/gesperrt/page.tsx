import { Lock } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { Logo } from '@/components/brand/logo';
import { Card, CardContent } from '@/components/ui/card';
import { getSessionContext } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Konto gesperrt' };

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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <Logo />
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 py-8 text-center">
          <span className="bg-danger-soft text-danger mx-auto flex size-12 items-center justify-center rounded-full">
            <Lock className="size-5" aria-hidden />
          </span>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">Konto gesperrt</h1>
            <p className="text-muted-foreground text-sm">
              Dieses Konto wurde von einem Platform-Admin gesperrt. Bei Fragen wende dich an die
              Betreiberin oder den Betreiber der Plattform.
            </p>
          </div>
          <div className="flex justify-center">
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
