import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { StatTile } from '@/components/stats/stat-tile';
import { ViewsChart } from '@/components/stats/views-chart';
import { requireSession } from '@/lib/auth/session';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { getSiteStats } from '@/lib/db/queries/stats';
import { can } from '@/lib/sites/permissions';

export const metadata: Metadata = { title: 'Statistik — webpresslite' };

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

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Statistik</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {site.name} · letzte {stats.days} Tage
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3" data-testid="stat-tiles">
        <StatTile
          label="Aufrufe"
          value={stats.total.toLocaleString('de-DE')}
          delta={
            change === null
              ? null
              : { percent: change, label: `gegenüber den ${stats.days} Tagen davor` }
          }
        />
        <StatTile
          label="Bester Tag"
          value={(best?.views ?? 0).toLocaleString('de-DE')}
          hint={best ? new Date(best.day).toLocaleDateString('de-DE') : null}
        />
        <StatTile
          label="Beiträge mit Aufrufen"
          value={stats.topPosts.length.toLocaleString('de-DE')}
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Aufrufe pro Tag</h2>
        <ViewsChart data={stats.daily} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Meistgelesen</h2>

        {stats.topPosts.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="no-stats">
            Noch keine Aufrufe gezählt.
          </p>
        ) : (
          // The table is also the accessible view of the chart above.
          <table className="w-full text-sm" data-testid="top-posts">
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="py-2 font-medium">
                  Beitrag
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Aufrufe
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.topPosts.map((post) => (
                <tr key={post.postId} className="border-b last:border-0">
                  <td className="py-2">
                    <Link
                      href={`/sites/${siteId}/posts/${post.postId}`}
                      className="hover:underline"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {post.views.toLocaleString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-sm">
        <Link href={`/sites/${siteId}`} className="underline underline-offset-4">
          Zurück zur Site
        </Link>
      </p>
    </div>
  );
}
