'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { checkSubdomainAction, createSiteAction, type ActionState } from '@/lib/actions/sites';
import { suggestSubdomain } from '@/lib/tenant/validation';

type Availability = { state: 'idle' | 'checking' } | { state: 'result'; ok: boolean; text: string };

export function CreateSiteForm({ rootDomain }: { rootDomain: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createSiteAction, {});
  const [subdomain, setSubdomain] = useState('');
  const [touched, setTouched] = useState(false);
  const [availability, setAvailability] = useState<Availability>({ state: 'idle' });
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!subdomain) {
      setAvailability({ state: 'idle' });
      return;
    }

    setAvailability({ state: 'checking' });

    // Debounced so typing does not fire a request per keystroke.
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await checkSubdomainAction(subdomain);
        setAvailability({
          state: 'result',
          ok: result.available,
          text: result.available ? 'Verfügbar.' : (result.reason ?? 'Nicht verfügbar.'),
        });
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [subdomain]);

  return (
    <form action={formAction} className="space-y-4">
      {state.formError ? <Alert>{state.formError}</Alert> : null}

      <Field
        label="Name der Site"
        name="name"
        required
        error={state.errors?.name}
        disabled={pending}
        onChange={(event) => {
          // Prefill the subdomain until the user edits it themselves.
          if (!touched) setSubdomain(suggestSubdomain(event.target.value));
        }}
      />

      <div className="space-y-1.5">
        <Field
          label="Subdomain"
          name="subdomain"
          required
          value={subdomain}
          error={state.errors?.subdomain}
          disabled={pending}
          onChange={(event) => {
            setTouched(true);
            setSubdomain(event.target.value);
          }}
        />
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Deine Site erscheint unter{' '}
          <span className="font-mono">
            {subdomain || 'name'}.{rootDomain}
          </span>
        </p>
        {availability.state === 'result' ? (
          <p
            className={`text-xs ${availability.ok ? 'text-green-700' : 'text-red-700'}`}
            data-testid="subdomain-availability"
          >
            {availability.text}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Site wird angelegt…' : 'Site anlegen'}
      </Button>
    </form>
  );
}
