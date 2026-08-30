'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/client';
import { fieldErrors, profileSchema } from '@/lib/auth/validation';

export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'saved' | 'failed'>('idle');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('idle');

    const form = new FormData(event.currentTarget);
    const parsed = profileSchema.safeParse({ name: form.get('name') });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setPending(true);

    const { error } = await authClient.updateUser({ name: parsed.data.name });

    setPending(false);
    setStatus(error ? 'failed' : 'saved');

    if (!error) router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {status === 'saved' ? <Alert variant="success">Profil gespeichert.</Alert> : null}
      {status === 'failed' ? (
        <Alert>Speichern fehlgeschlagen. Bitte erneut versuchen.</Alert>
      ) : null}

      <Field
        label="Name"
        name="name"
        defaultValue={name}
        autoComplete="name"
        required
        error={errors.name}
        disabled={pending}
      />

      <Button type="submit" disabled={pending}>
        {pending ? 'Wird gespeichert…' : 'Speichern'}
      </Button>
    </form>
  );
}
