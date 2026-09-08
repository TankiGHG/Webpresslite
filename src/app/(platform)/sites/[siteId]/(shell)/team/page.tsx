import { Check, Minus } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { TeamManager } from '@/components/members/team-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { listInvitations, listMembers } from '@/lib/db/queries/members';
import { getSiteForUser } from '@/lib/db/queries/sites';
import {
  assignableRoles,
  can,
  CAPABILITIES,
  CAPABILITY_LABELS,
  ROLE_CAPABILITIES,
} from '@/lib/sites/permissions';
import { limitsFor } from '@/lib/sites/plans';
import { ROLE_LABELS, SITE_ROLES } from '@/lib/sites/roles';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/team`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site || !can(site.role, 'site:members')) notFound();

  const [members, invitations] = await Promise.all([
    listMembers(siteId, user.id),
    listInvitations(siteId, user.id),
  ]);

  const limits = limitsFor(site.plan);
  const seatsUsed = members.length + invitations.length;

  return (
    <div>
      <PageHeader
        title="Team"
        description={`${seatsUsed} von ${limits.membersPerSite} Plätzen belegt. Wer eingeladen wird, bekommt eine Mail mit Link.`}
      />

      <div className="space-y-6">
        <TeamManager
          siteId={siteId}
          members={members}
          invitations={invitations}
          assignable={assignableRoles(site.role)}
          seatsUsed={seatsUsed}
          seatLimit={limits.membersPerSite}
        />

        <Card>
          <CardHeader>
            <CardTitle>Wer darf was</CardTitle>
            <CardDescription>
              Die Rollen bauen aufeinander auf; Eigentümer:innen dürfen alles.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="permission-matrix">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Recht
                  </th>
                  {SITE_ROLES.map((role) => (
                    <th key={role} scope="col" className="px-2 py-2 text-center font-medium">
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((capability) => (
                  <tr key={capability} className="border-b last:border-0">
                    <th scope="row" className="py-2 pr-4 text-left font-normal">
                      {CAPABILITY_LABELS[capability]}
                    </th>
                    {SITE_ROLES.map((role) => {
                      const allowed = ROLE_CAPABILITIES[role].includes(capability);
                      return (
                        <td key={role} className="px-2 py-2 text-center">
                          {/* The word carries the meaning; the symbol is decoration. */}
                          {allowed ? (
                            <Check className="text-success mx-auto size-4" aria-hidden />
                          ) : (
                            <Minus
                              className="text-muted-foreground/50 mx-auto size-4"
                              aria-hidden
                            />
                          )}
                          <span className="sr-only">{allowed ? 'ja' : 'nein'}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
