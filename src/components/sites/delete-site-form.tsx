'use client';

import { useActionState, useState } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { deleteSiteAction, type ActionState } from '@/lib/actions/sites';

export function DeleteSiteForm({ siteId, subdomain }: { siteId: string; subdomain: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteSiteAction, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Site löschen
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-red-200 p-4">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="subdomain" value={subdomain} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}

      <p className="text-sm">
        Das löscht die Site <strong>{subdomain}</strong> mit allen Inhalten. Tippe zur Bestätigung{' '}
        <span className="font-mono">{subdomain}</span> ein.
      </p>

      <Field
        label="Bestätigung"
        name="confirmation"
        autoComplete="off"
        required
        error={state.errors?.confirmation}
        disabled={pending}
      />

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Wird gelöscht…' : 'Endgültig löschen'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
