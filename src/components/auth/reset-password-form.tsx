'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { resetPassword } from '@/lib/auth/client';
import { fieldErrors, resetPasswordSchema } from '@/lib/auth/validation';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const form = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      password: form.get('password'),
      confirmPassword: form.get('confirmPassword'),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setPending(true);

    const { error } = await resetPassword({ newPassword: parsed.data.password, token });

    if (error) {
      setPending(false);
      setFormError('Der Link ist ungültig oder abgelaufen. Fordere bitte einen neuen Link an.');
      return;
    }

    router.push('/login');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? <Alert>{formError}</Alert> : null}

      <Field
        label="Neues Passwort"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={errors.password}
        disabled={pending}
      />
      <Field
        label="Neues Passwort wiederholen"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
        disabled={pending}
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Wird gespeichert…' : 'Passwort speichern'}
      </Button>
    </form>
  );
}
