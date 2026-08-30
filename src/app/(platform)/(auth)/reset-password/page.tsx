import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = { title: 'Neues Passwort — webpresslite' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (!token || error) {
    return (
      <AuthCard title="Link ungültig">
        <Alert>Dieser Link ist ungültig oder abgelaufen.</Alert>
        <p className="text-sm">
          <Link href="/forgot-password" className="underline underline-offset-4">
            Neuen Link anfordern
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Neues Passwort vergeben" description="Wähle ein Passwort für dein Konto.">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
