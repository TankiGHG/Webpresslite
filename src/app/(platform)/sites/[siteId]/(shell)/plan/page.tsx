import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PlanForm } from '@/components/sites/plan-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { countMedia } from '@/lib/db/queries/media';
import { countPosts } from '@/lib/db/queries/posts';
import { listMembers } from '@/lib/db/queries/members';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { can } from '@/lib/sites/permissions';
import { limitsFor, PLAN_LABELS } from '@/lib/sites/plans';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Plan' };

export default async function PlanPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/plan`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site || !can(site.role, 'site:plan')) notFound();

  const limits = limitsFor(site.plan);
  const [posts, media, members] = await Promise.all([
    countPosts(siteId, user.id),
    countMedia(siteId, user.id),
    listMembers(siteId, user.id),
  ]);

  const usage = [
    { label: 'Inhalte', used: posts, limit: limits.postsPerSite },
    { label: 'Medien', used: media, limit: limits.mediaPerSite },
    { label: 'Mitglieder', used: members.length, limit: limits.membersPerSite },
  ];

  return (
    <div>
      <PageHeader
        title="Plan"
        description={`Diese Site läuft im Plan ${PLAN_LABELS[site.plan]}.`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Aktuelle Nutzung</CardTitle>
            <CardDescription>Was von den Limits schon belegt ist.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4" data-testid="plan-usage">
              {usage.map((entry) => {
                const share = Math.min(100, Math.round((entry.used / entry.limit) * 100));
                return (
                  <li key={entry.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span>{entry.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {entry.used} / {entry.limit}
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
                      <div
                        className={cn(
                          'h-full rounded-full',
                          share >= 90 ? 'bg-danger' : share >= 70 ? 'bg-warning' : 'bg-primary',
                        )}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <PlanForm siteId={siteId} plan={site.plan} />
      </div>
    </div>
  );
}
