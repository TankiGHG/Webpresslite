import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Anmelden — webpresslite' };

/** Only same-origin paths are accepted, so `?redirectTo=` cannot bounce elsewhere. */
function safeRedirect(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <AuthCard
      title="Anmelden"
      description="Melde dich an, um deine Sites zu verwalten."
      footer={
        <div className="space-y-1">
          <p>
            <Link href="/forgot-password" className="underline underline-offset-4">
              Passwort vergessen?
            </Link>
          </p>
          <p>
            Noch kein Konto?{' '}
            <Link href="/register" className="underline underline-offset-4">
              Jetzt registrieren
            </Link>
          </p>
        </div>
      }
    >
      <LoginForm redirectTo={safeRedirect(redirectTo)} />
    </AuthCard>
  );
}
