import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = { title: 'Registrieren — webpresslite' };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Konto anlegen"
      description="Ein Konto, beliebig viele Sites."
      footer={
        <p>
          Schon registriert?{' '}
          <Link href="/login" className="underline underline-offset-4">
            Anmelden
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
