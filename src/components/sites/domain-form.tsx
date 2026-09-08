'use client';

import { Globe, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';
import { Field } from '@/components/auth/field';
import { CopyButton } from '@/components/sites/copy-button';
import { Alert } from '@/components/ui/alert';
import { Badge, StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

      <Button type="submit" loading={pending} data-testid="verify-domain">
        {pending ? null : <ShieldCheck />}
        {pending ? 'Wird geprüft…' : 'TXT-Eintrag prüfen'}
      </Button>
    </form>
  );
}

function RecordRow({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="grid grid-cols-[4rem_1fr_auto] items-center gap-3 py-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 font-mono text-sm break-all" data-testid={testId}>
        {value}
      </dd>
      <dd>
        <CopyButton value={value} label={`${label} kopieren`} />
      </dd>
    </div>
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Domain</CardTitle>
          <CardDescription>
            Nur die Domain, ohne https:// und ohne Pfad. Leer lassen entfernt sie wieder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!allowed ? (
            <div className="bg-primary-soft text-primary-soft-foreground mb-4 flex items-start gap-3 rounded-lg px-3 py-3 text-sm">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span data-testid="plan-blocked">
                Custom Domains gibt es im Pro-Plan.{' '}
                <Link
                  href={`/sites/${siteId}/plan`}
                  className="font-medium underline underline-offset-4"
                >
                  Plan wechseln
                </Link>
              </span>
            </div>
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

            <Button type="submit" loading={pending} disabled={!allowed}>
              {pending ? null : <Globe />}
              {pending ? 'Wird gespeichert…' : 'Domain speichern'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {domain && token ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Verifizierung</CardTitle>
              <CardDescription>
                Lege bei deinem DNS-Anbieter diesen TXT-Eintrag an und prüfe ihn danach hier.
              </CardDescription>
            </div>
            <Badge
              variant={verifiedAt ? 'success' : 'warning'}
              data-testid="domain-status"
              data-verified={verifiedAt ? 'true' : 'false'}
            >
              <StatusDot />
              {verifiedAt ? 'Verifiziert' : 'Nicht verifiziert'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="divide-y rounded-lg border px-4">
              <RecordRow label="Name" value={verificationHost(domain)} testId="txt-host" />
              <RecordRow label="Typ" value="TXT" />
              <RecordRow label="Wert" value={verificationRecord(token)} testId="txt-value" />
            </dl>

            <ol className="text-muted-foreground list-decimal space-y-1.5 pl-5 text-sm">
              <li>TXT-Eintrag wie oben anlegen — DNS braucht manchmal ein paar Minuten.</li>
              <li>
                Die Domain selbst per A- oder CNAME-Eintrag auf die Plattform zeigen lassen, wie es
                dein Hosting vorsieht.
              </li>
              <li>Hier prüfen. Erst danach ist die Site unter der Domain erreichbar.</li>
            </ol>

            {verifiedAt ? (
              <p className="text-success text-sm">
                Seit {new Date(verifiedAt).toLocaleDateString('de-DE')} verifiziert — deine Site
                antwortet unter dieser Domain.
              </p>
            ) : (
              <VerifyForm siteId={siteId} />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="self-start">
          <CardHeader>
            <CardTitle>So funktioniert es</CardTitle>
            <CardDescription>
              Drei Schritte, keine Wartezeit auf Support. Der TXT-Eintrag erscheint hier, sobald du
              eine Domain gespeichert hast.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              {[
                [
                  'Domain eintragen',
                  'Links speichern — die Site bleibt solange unter der Subdomain erreichbar.',
                ],
                [
                  'TXT-Eintrag setzen',
                  'Bei deinem DNS-Anbieter, mit dem Wert, der dann hier angezeigt wird.',
                ],
                [
                  'Prüfen lassen',
                  'Ein Klick bestätigt die Domain; danach antwortet die Site unter ihrer neuen Adresse.',
                ],
              ].map(([title, text], index) => (
                <li key={title} className="flex gap-3">
                  <span
                    aria-hidden
                    className="bg-primary-soft text-primary-soft-foreground grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold"
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-medium">{title}</span>
                    <span className="text-muted-foreground block">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
