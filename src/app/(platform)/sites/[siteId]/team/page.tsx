import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { TeamManager } from '@/components/members/team-manager';
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

export const metadata: Metadata = { title: 'Team — webpresslite' };

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

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{site.name}</p>
      </header>

      <TeamManager
        siteId={siteId}
        members={members}
        invitations={invitations}
        assignable={assignableRoles(site.role)}
        seatsUsed={members.length + invitations.length}
        seatLimit={limits.membersPerSite}
      />

      <section className="space-y-3">
        <h2 className="font-medium">Wer darf was</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="permission-matrix">
            <thead>
              <tr className="border-b text-left">
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
                  <th scope="row" className="py-1.5 pr-4 text-left font-normal">
                    {CAPABILITY_LABELS[capability]}
                  </th>
                  {SITE_ROLES.map((role) => {
                    const allowed = ROLE_CAPABILITIES[role].includes(capability);
                    return (
                      <td key={role} className="px-2 py-1.5 text-center">
                        {/* The word carries the meaning; the symbol is decoration. */}
                        <span aria-hidden="true">{allowed ? '✓' : '·'}</span>
                        <span className="sr-only">{allowed ? 'ja' : 'nein'}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-sm">
        <Link href={`/sites/${siteId}`} className="underline underline-offset-4">
          Zurück zur Site
        </Link>
      </p>
    </div>
  );
}
