'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/auth/client';
import { fieldErrors, loginSchema } from '@/lib/auth/validation';

export function LoginForm({ redirectTo = '/dashboard' }: { redirectTo?: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get('email'),
      password: form.get('password'),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setPending(true);

    const { error } = await signIn.email(parsed.data);

    if (error) {
      setPending(false);
      // Never distinguish "unknown email" from "wrong password" — that would
      // turn the login form into an account enumeration oracle.
      setFormError(
        error.status === 429
          ? 'Zu viele Versuche. Bitte warte einen Moment.'
          : 'E-Mail-Adresse oder Passwort ist falsch.',
      );
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? <Alert>{formError}</Alert> : null}

      <Field
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={errors.email}
        disabled={pending}
      />
      <Field
        label="Passwort"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={errors.password}
        disabled={pending}
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Anmeldung läuft…' : 'Anmelden'}
      </Button>
    </form>
  );
}
