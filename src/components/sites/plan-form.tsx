'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { changePlanAction, type ActionState } from '@/lib/actions/domains';
import { PLAN_LABELS, PLAN_LIMITS } from '@/lib/sites/plans';
import { SITE_PLANS, type SitePlan } from '@/lib/sites/roles';

const ROWS: { label: string; read: (plan: SitePlan) => string }[] = [
  { label: 'Inhalte pro Site', read: (plan) => String(PLAN_LIMITS[plan].postsPerSite) },
  { label: 'Medien pro Site', read: (plan) => String(PLAN_LIMITS[plan].mediaPerSite) },
  { label: 'Team-Mitglieder', read: (plan) => String(PLAN_LIMITS[plan].membersPerSite) },
  { label: 'Eigene Domain', read: (plan) => (PLAN_LIMITS[plan].customDomain ? 'ja' : 'nein') },
];

export function PlanForm({ siteId, plan }: { siteId: string; plan: SitePlan }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(changePlanAction, {});

  return (
    <div className="space-y-6">
      {state.formError ? <Alert>{state.formError}</Alert> : null}
      {state.notice ? (
        <Alert variant="success">
          <span data-testid="plan-notice">{state.notice}</span>
        </Alert>
      ) : null}

      <table className="w-full text-sm" data-testid="plan-table">
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="py-2 font-medium">
              Limit
            </th>
            {SITE_PLANS.map((value) => (
              <th key={value} scope="col" className="px-2 py-2 text-right font-medium">
                {PLAN_LABELS[value]}
                {plan === value ? (
                  <span className="ml-1 text-xs font-normal text-[var(--color-muted-foreground)]">
                    (aktiv)
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-b last:border-0">
              <th scope="row" className="py-1.5 text-left font-normal">
                {row.label}
              </th>
              {SITE_PLANS.map((value) => (
                <td key={value} className="px-2 py-1.5 text-right tabular-nums">
                  {row.read(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <form action={formAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="siteId" value={siteId} />
        {SITE_PLANS.filter((value) => value !== plan).map((value) => (
          <Button
            key={value}
            type="submit"
            name="plan"
            value={value}
            disabled={pending}
            data-testid={`switch-to-${value}`}
          >
            Zu {PLAN_LABELS[value]} wechseln
          </Button>
        ))}
      </form>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        Es ist kein Zahlungsanbieter angebunden. Der Planwechsel läuft über einen Stub in
        <span className="font-mono"> src/lib/billing/stub.ts</span>; es wird nichts berechnet.
      </p>
    </div>
  );
}
