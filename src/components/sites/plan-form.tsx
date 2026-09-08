'use client';

import { Check, Minus } from 'lucide-react';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { changePlanAction, type ActionState } from '@/lib/actions/domains';
import { PLAN_LABELS, PLAN_LIMITS } from '@/lib/sites/plans';
import { SITE_PLANS, type SitePlan } from '@/lib/sites/roles';

const ROWS: { label: string; read: (plan: SitePlan) => string | boolean }[] = [
  {
    label: 'Inhalte pro Site',
    read: (plan) => PLAN_LIMITS[plan].postsPerSite.toLocaleString('de-DE'),
  },
  {
    label: 'Medien pro Site',
    read: (plan) => PLAN_LIMITS[plan].mediaPerSite.toLocaleString('de-DE'),
  },
  {
    label: 'Team-Mitglieder',
    read: (plan) => PLAN_LIMITS[plan].membersPerSite.toLocaleString('de-DE'),
  },
  { label: 'Eigene Domain', read: (plan) => PLAN_LIMITS[plan].customDomain },
];

export function PlanForm({ siteId, plan }: { siteId: string; plan: SitePlan }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(changePlanAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pläne im Vergleich</CardTitle>
        <CardDescription>
          Der Wechsel wirkt sofort; Inhalte bleiben in jedem Fall erhalten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.formError ? <Alert>{state.formError}</Alert> : null}
        {state.notice ? (
          <Alert variant="success">
            <span data-testid="plan-notice">{state.notice}</span>
          </Alert>
        ) : null}

        <table className="w-full text-sm" data-testid="plan-table">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th scope="col" className="py-2 font-medium">
                Limit
              </th>
              {SITE_PLANS.map((value) => (
                <th key={value} scope="col" className="px-2 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-2">
                    {PLAN_LABELS[value]}
                    {plan === value ? <Badge variant="primary">aktiv</Badge> : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <th scope="row" className="py-2.5 text-left font-normal">
                  {row.label}
                </th>
                {SITE_PLANS.map((value) => {
                  const cell = row.read(value);
                  return (
                    <td key={value} className="px-2 py-2.5 text-right tabular-nums">
                      {typeof cell === 'boolean' ? (
                        <>
                          {cell ? (
                            <Check className="text-success ml-auto size-4" aria-hidden />
                          ) : (
                            <Minus
                              className="text-muted-foreground/50 ml-auto size-4"
                              aria-hidden
                            />
                          )}
                          <span className="sr-only">{cell ? 'ja' : 'nein'}</span>
                        </>
                      ) : (
                        cell
                      )}
                    </td>
                  );
                })}
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
              variant={value === 'pro' ? 'default' : 'outline'}
              loading={pending}
              data-testid={`switch-to-${value}`}
            >
              Zu {PLAN_LABELS[value]} wechseln
            </Button>
          ))}
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-xs">
          Diese Installation hat keinen Zahlungsanbieter angebunden — der Wechsel ist sofort
          wirksam, berechnet wird nichts.
        </p>
      </CardFooter>
    </Card>
  );
}
