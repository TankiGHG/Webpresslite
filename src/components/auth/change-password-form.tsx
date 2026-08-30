'use client';

import { useState, type FormEvent } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/client';
import { fieldErrors, resetPasswordSchema } from '@/lib/auth/validation';

export function ChangePasswordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaved(false);

    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get('currentPassword') ?? '');
    const parsed = resetPasswordSchema.safeParse({
      password: data.get('password'),
      confirmPassword: data.get('confirmPassword'),
    });

    if (!currentPassword) {
      setErrors({ currentPassword: 'Bitte gib dein aktuelles Passwort ein.' });
      return;
    }

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setPending(true);

    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword: parsed.data.password,
      revokeOtherSessions: true,
    });

    setPending(false);

    if (error) {
      setFormError('Das aktuelle Passwort stimmt nicht.');
      return;
    }

    form.reset();
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? <Alert>{formError}</Alert> : null}
      {saved ? (
        <Alert variant="success">Passwort geändert. Andere Sitzungen wurden abgemeldet.</Alert>
      ) : null}

      <Field
        label="Aktuelles Passwort"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        error={errors.currentPassword}
        disabled={pending}
      />
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

      <Button type="submit" disabled={pending}>
        {pending ? 'Wird geändert…' : 'Passwort ändern'}
      </Button>
    </form>
  );
}
