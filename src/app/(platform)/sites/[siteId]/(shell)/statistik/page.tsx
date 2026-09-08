import { BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { StatTile } from '@/components/stats/stat-tile';
import { ViewsChart } from '@/components/stats/views-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { getSiteStats } from '@/lib/db/queries/stats';
import { formatDate } from '@/lib/format';
import { can } from '@/lib/sites/permissions';

export const metadata: Metadata = { title: 'Statistik' };

function percentChange(current: number, previous: number): number | null {
  // A jump from nothing is not a percentage; showing one would be nonsense.
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export default async function StatsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/statistik`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site || !can(site.role, 'stats:view')) notFound();

  const stats = await getSiteStats(siteId, user.id, 30);
  const change = percentChange(stats.total, stats.previousTotal);
  const best = stats.daily.reduce<{ day: string; views: number } | null>(
    (current, entry) => (current === null || entry.views > current.views ? entry : current),
    null,
  );
  const topViews = stats.topPosts[0]?.views ?? 0;

  return (
    <div>
      <PageHeader
        title="Statistik"
        description={`Aufrufe der letzten ${stats.days} Tage. Gezählt wird ohne Cookies und ohne Tracking-Skript.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3" data-testid="stat-tiles">
        <StatTile
          label="Aufrufe"
          value={stats.total.toLocaleString('de-DE')}
          delta={
            change === null
              ? null
              : { percent: change, label: `gegenüber den ${stats.days} Tagen davor` }
          }
          hint={change === null ? `in den letzten ${stats.days} Tagen` : undefined}
        />
        <StatTile
          label="Bester Tag"
          value={(best?.views ?? 0).toLocaleString('de-DE')}
          hint={best && best.views > 0 ? formatDate(new Date(best.day)) : 'Noch kein Ausschlag'}
        />
        <StatTile
          label="Beiträge mit Aufrufen"
          value={stats.topPosts.length.toLocaleString('de-DE')}
          hint={
            topViews > 0
              ? `Spitzenreiter: ${topViews.toLocaleString('de-DE')} Aufrufe`
              : 'Noch nichts gelesen'
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Aufrufe pro Tag</CardTitle>
            <CardDescription>
              Ein Balken je Tag; Anfang, Ende und Spitze sind beschriftet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ViewsChart data={stats.daily} />
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Meistgelesen</CardTitle>
            <CardDescription>Beiträge nach Aufrufen im Zeitraum.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topPosts.length === 0 ? (
              <EmptyState
                compact
                icon={BarChart3}
                title="Noch keine Aufrufe gezählt"
                description="Sobald jemand einen Beitrag liest, taucht er hier auf."
                data-testid="no-stats"
              />
            ) : (
              // The list doubles as the accessible reading of the chart.
              <ol className="space-y-3" data-testid="top-posts">
                {stats.topPosts.map((post, index) => {
                  const share = topViews === 0 ? 0 : Math.round((post.views / topViews) * 100);
                  return (
                    <li key={post.postId} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="text-muted-foreground w-4 shrink-0 text-xs tabular-nums">
                            {index + 1}
                          </span>
                          <Link
                            href={`/sites/${siteId}/posts/${post.postId}`}
                            className="truncate font-medium hover:underline"
                          >
                            {post.title}
                          </Link>
                        </span>
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                          {post.views.toLocaleString('de-DE')}
                        </span>
                      </div>
                      <div className="bg-muted ml-6 h-1.5 overflow-hidden rounded-full" aria-hidden>
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
