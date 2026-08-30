'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { signUp } from '@/lib/auth/client';
import { fieldErrors, registerSchema } from '@/lib/auth/validation';

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const form = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setPending(true);

    const { error } = await signUp.email(parsed.data);

    if (error) {
      setPending(false);
      if (error.status === 429) {
        setFormError('Zu viele Registrierungen. Bitte versuche es später erneut.');
      } else if (error.code === 'USER_ALREADY_EXISTS') {
        setFormError('Für diese E-Mail-Adresse gibt es bereits ein Konto.');
      } else {
        setFormError('Die Registrierung ist fehlgeschlagen. Bitte versuche es erneut.');
      }
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? <Alert>{formError}</Alert> : null}

      <Field
        label="Name"
        name="name"
        autoComplete="name"
        required
        error={errors.name}
        disabled={pending}
      />
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
        autoComplete="new-password"
        required
        error={errors.password}
        disabled={pending}
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Konto wird angelegt…' : 'Konto anlegen'}
      </Button>
    </form>
  );
}
