'use client';

import { useActionState } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateSiteSettingsAction, type ActionState } from '@/lib/actions/sites';

export function SiteSettingsForm({
  siteId,
  name,
  description,
}: {
  siteId: string;
  name: string;
  description: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateSiteSettingsAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="siteId" value={siteId} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}
      {state.saved ? <Alert variant="success">Einstellungen gespeichert.</Alert> : null}

      <Field
        label="Name der Site"
        name="name"
        defaultValue={name}
        required
        maxLength={80}
        error={state.errors?.name}
        disabled={pending}
        hint="Erscheint im Kopf der Site, im Browser-Tab und im Feed."
      />

      <div className="space-y-1.5">
        <Label htmlFor="description">Untertitel</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={description ?? ''}
          maxLength={160}
          rows={2}
          placeholder="Worum geht es hier? Ein Satz genügt."
          aria-invalid={state.errors?.description ? true : undefined}
          disabled={pending}
        />
        <p className="text-muted-foreground text-xs">
          Steht unter dem Namen auf der Startseite und ist die Beschreibung in Suchmaschinen.
          Höchstens 160 Zeichen.
        </p>
        {state.errors?.description ? (
          <p className="text-danger text-sm">{state.errors.description}</p>
        ) : null}
      </div>

      <Button type="submit" loading={pending}>
        {pending ? 'Wird gespeichert…' : 'Einstellungen speichern'}
      </Button>
    </form>
  );
}
