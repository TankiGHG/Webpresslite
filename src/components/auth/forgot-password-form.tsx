'use client';

import { useState, type FormEvent } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { requestPasswordReset } from '@/lib/auth/client';
import { fieldErrors, forgotPasswordSchema } from '@/lib/auth/validation';

export function ForgotPasswordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({ email: form.get('email') });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setPending(true);

    await requestPasswordReset({
      email: parsed.data.email,
      redirectTo: '/reset-password',
    });

    // The confirmation is deliberately identical whether or not the address is
    // known, so the form cannot be used to probe for existing accounts.
    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <Alert variant="success">
        Wenn es zu dieser Adresse ein Konto gibt, ist eine E-Mail mit einem Link zum Zurücksetzen
        unterwegs. Der Link ist eine Stunde gültig.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={errors.email}
        disabled={pending}
      />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Wird gesendet…' : 'Link zum Zurücksetzen senden'}
      </Button>
    </form>
  );
}
