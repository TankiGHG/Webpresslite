import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = { title: 'Passwort vergessen — webpresslite' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Passwort vergessen"
      description="Wir schicken dir einen Link, mit dem du ein neues Passwort vergeben kannst."
      footer={
        <p>
          <Link href="/login" className="underline underline-offset-4">
            Zurück zur Anmeldung
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
