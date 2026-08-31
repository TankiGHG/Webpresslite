'use client';

import { useActionState } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { setDomainAction, verifyDomainAction, type ActionState } from '@/lib/actions/domains';
import { verificationHost, verificationRecord } from '@/lib/domains/validation';

function VerifyForm({ siteId }: { siteId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    verifyDomainAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="siteId" value={siteId} />

      {state.formError ? (
        <Alert>
          <span data-testid="verify-error">{state.formError}</span>
          {state.found && state.found.length > 0 ? (
            <p className="mt-1 text-xs">Gefunden: {state.found.join(', ')}</p>
          ) : null}
        </Alert>
      ) : null}
      {state.notice ? (
        <Alert variant="success">
          <span data-testid="verify-success">{state.notice}</span>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending} data-testid="verify-domain">
        {pending ? 'Wird geprüft…' : 'TXT-Eintrag prüfen'}
      </Button>
    </form>
  );
}

export function DomainForm({
  siteId,
  domain,
  token,
  verifiedAt,
  allowed,
}: {
  siteId: string;
  domain: string | null;
  token: string | null;
  verifiedAt: string | null;
  allowed: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setDomainAction, {});

  return (
    <div className="space-y-8">
      {!allowed ? (
        <Alert>
          <span data-testid="plan-blocked">
            Custom Domains gibt es im Pro-Plan. Der Plan lässt sich unter „Plan“ wechseln.
          </span>
        </Alert>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="siteId" value={siteId} />

        {state.formError ? <Alert>{state.formError}</Alert> : null}
        {state.notice ? <Alert variant="success">{state.notice}</Alert> : null}

        <Field
          label="Eigene Domain"
          name="domain"
          defaultValue={domain ?? ''}
          placeholder="meineseite.de"
          error={state.errors?.domain}
          disabled={pending || !allowed}
        />
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Nur die Domain, ohne https:// und ohne Pfad. Leer lassen entfernt sie wieder.
        </p>

        <Button type="submit" disabled={pending || !allowed}>
          {pending ? 'Wird gespeichert…' : 'Domain speichern'}
        </Button>
      </form>

      {domain && token ? (
        <section className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Verifizierung</h2>
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              data-testid="domain-status"
              data-verified={verifiedAt ? 'true' : 'false'}
            >
              {verifiedAt ? 'Verifiziert' : 'Nicht verifiziert'}
            </span>
          </div>

          <p className="text-sm">
            Lege bei deinem DNS-Anbieter diesen TXT-Eintrag an. Danach hier prüfen — die Site ist
            erst nach erfolgreicher Prüfung unter der Domain erreichbar.
          </p>

          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-[var(--color-muted-foreground)]">Name</dt>
              <dd className="font-mono break-all" data-testid="txt-host">
                {verificationHost(domain)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-muted-foreground)]">Typ</dt>
              <dd className="font-mono">TXT</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-muted-foreground)]">Wert</dt>
              <dd className="font-mono break-all" data-testid="txt-value">
                {verificationRecord(token)}
              </dd>
            </div>
          </dl>

          <p className="text-sm">
            Zusätzlich muss die Domain selbst auf die Plattform zeigen — ein A- oder CNAME-Eintrag,
            wie es dein Hosting vorsieht.
          </p>

          {verifiedAt ? null : <VerifyForm siteId={siteId} />}
        </section>
      ) : null}
    </div>
  );
}
