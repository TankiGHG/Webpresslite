import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Circle,
  FileText,
  Globe,
  Palette,
  PenLine,
  Plus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PostStatusBadge } from '@/components/posts/status-badge';
import { CopyButton } from '@/components/sites/copy-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { countPendingComments } from '@/lib/db/queries/comments';
import { getSiteOverview } from '@/lib/db/queries/dashboard';
import { countMedia } from '@/lib/db/queries/media';
import { countMembers } from '@/lib/db/queries/members';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { getSiteStats } from '@/lib/db/queries/stats';
import { formatNumber, formatRelative } from '@/lib/format';
import { POST_TYPE_LABELS } from '@/lib/posts/constants';
import { can } from '@/lib/sites/permissions';
import { PLAN_LABELS } from '@/lib/sites/plans';
import { ROLE_LABELS } from '@/lib/sites/roles';
import { publicSiteUrl } from '@/lib/tenant/public-url';

export const metadata: Metadata = { title: 'Übersicht' };

function Tile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="bg-card hover:bg-accent/40 rounded-xl border p-4 shadow-[var(--shadow-card)] transition-colors"
    >
      {body}
    </Link>
  ) : (
    <div className="bg-card rounded-xl border p-4 shadow-[var(--shadow-card)]">{body}</div>
  );
}

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}`);

  // Returns null both for a foreign site and a nonexistent one, so the 404 does
  // not confirm that some other user's site id exists.
  const site = await getSiteForUser(siteId, user.id);
  if (!site) notFound();

  const canStats = can(site.role, 'stats:view');
  const canModerate = can(site.role, 'comment:moderate');
  const canMembers = can(site.role, 'site:members');

  const [overview, stats, pendingComments, mediaCount, memberCount] = await Promise.all([
    getSiteOverview(site.id, user.id),
    canStats ? getSiteStats(site.id, user.id, 7) : null,
    canModerate ? countPendingComments(site.id, user.id) : 0,
    countMedia(site.id, user.id),
    canMembers ? countMembers(site.id, user.id) : 1,
  ]);

  const url = publicSiteUrl(site);
  const host = url.replace(/^https?:\/\//, '');
  const base = `/sites/${site.id}`;
  const hasContent = overview.publishedCount + overview.draftCount + overview.scheduledCount > 0;

  const steps = [
    {
      done: hasContent,
      label: 'Ersten Beitrag schreiben',
      href: `${base}/posts`,
      icon: PenLine,
      show: can(site.role, 'post:create'),
    },
    {
      done: overview.publishedCount > 0,
      label: 'Etwas veröffentlichen',
      href: hasContent ? `${base}/posts` : `${base}/posts`,
      icon: FileText,
      show: can(site.role, 'post:publish'),
    },
    {
      done: Boolean(site.description),
      label: 'Untertitel der Site festlegen',
      href: `${base}/einstellungen`,
      icon: Globe,
      show: can(site.role, 'site:settings'),
    },
    {
      done: site.theme !== 'minimal' || Object.keys(site.themeSettings ?? {}).length > 0,
      label: 'Design auswählen',
      href: `${base}/design`,
      icon: Palette,
      show: can(site.role, 'site:design'),
    },
    {
      done: memberCount > 1,
      label: 'Team einladen',
      href: `${base}/team`,
      icon: Users,
      show: canMembers,
    },
  ].filter((step) => step.show);
  const openSteps = steps.filter((step) => !step.done);

  return (
    <div className="space-y-8">
      <PageHeader
        title={site.name}
        titleProps={{ 'data-testid': 'site-detail-name' }}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-foreground inline-flex items-center gap-1 font-mono hover:underline"
            >
              {host}
              <ArrowUpRight className="text-muted-foreground size-3.5" aria-hidden />
            </a>
            <CopyButton value={url} label="Adresse kopieren" />
            <Badge variant="outline">
              <span data-testid="site-role">{ROLE_LABELS[site.role]}</span>
            </Badge>
            <Badge variant={site.plan === 'pro' ? 'primary' : 'neutral'}>
              {PLAN_LABELS[site.plan]}
            </Badge>
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <a href={url} target="_blank" rel="noreferrer">
                <ArrowUpRight /> Site ansehen
              </a>
            </Button>
            {can(site.role, 'post:create') ? (
              <Button asChild>
                <Link href={`${base}/posts#neu`}>
                  <Plus /> Neuer Beitrag
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Kennzahlen">
        <Tile
          label="Veröffentlicht"
          value={formatNumber(overview.publishedCount)}
          hint={
            overview.scheduledCount > 0
              ? `${overview.scheduledCount} geplant`
              : `${overview.pageCount} ${overview.pageCount === 1 ? 'Seite' : 'Seiten'}`
          }
          href={`${base}/posts`}
        />
        <Tile
          label="Entwürfe"
          value={formatNumber(overview.draftCount)}
          hint={overview.draftCount === 0 ? 'Alles veröffentlicht' : 'Warten auf dich'}
          href={`${base}/posts?status=draft`}
        />
        {canStats && stats ? (
          <Tile
            label="Aufrufe · 7 Tage"
            value={formatNumber(stats.total)}
            hint={
              stats.previousTotal > 0
                ? `${stats.total >= stats.previousTotal ? '+' : ''}${Math.round(((stats.total - stats.previousTotal) / stats.previousTotal) * 100)} % zur Vorwoche`
                : 'Noch kein Vergleich'
            }
            href={`${base}/statistik`}
          />
        ) : (
          <Tile label="Medien" value={formatNumber(mediaCount)} href={`${base}/medien`} />
        )}
        {canModerate ? (
          <Tile
            label="Offene Kommentare"
            value={formatNumber(pendingComments)}
            hint={pendingComments === 0 ? 'Nichts zu moderieren' : 'Warten auf Freigabe'}
            href={`${base}/kommentare`}
          />
        ) : (
          <Tile label="Team" value={formatNumber(memberCount)} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Zuletzt bearbeitet</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${base}/posts`}>
                Alle Beiträge <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-2 pb-2 sm:px-3 sm:pb-3">
            {overview.recent.length === 0 ? (
              <EmptyState
                compact
                icon={PenLine}
                title="Noch nichts geschrieben"
                description="Der erste Beitrag ist nur einen Klick entfernt."
                action={
                  can(site.role, 'post:create') ? (
                    <Button asChild size="sm">
                      <Link href={`${base}/posts#neu`}>
                        <Plus /> Beitrag anlegen
                      </Link>
                    </Button>
                  ) : null
                }
                className="border-0"
              />
            ) : (
              <ul className="divide-y">
                {overview.recent.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`${base}/posts/${post.id}`}
                      className="hover:bg-accent/60 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                    >
                      <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-md">
                        <FileText className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {post.title || 'Ohne Titel'}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {POST_TYPE_LABELS[post.type]} · {post.authorName} ·{' '}
                          {formatRelative(post.updatedAt)}
                        </span>
                      </span>
                      <PostStatusBadge status={post.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {openSteps.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Nächste Schritte</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 sm:px-3 sm:pb-3">
                <ul className="space-y-0.5">
                  {steps.map((step) => (
                    <li key={step.label}>
                      <Link
                        href={step.href}
                        className="hover:bg-accent/60 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                      >
                        {step.done ? (
                          <CheckCircle2 className="text-success size-4 shrink-0" aria-hidden />
                        ) : (
                          <Circle
                            className="text-muted-foreground/60 size-4 shrink-0"
                            aria-hidden
                          />
                        )}
                        <span className={step.done ? 'text-muted-foreground line-through' : ''}>
                          {step.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {canStats && stats ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Diese Woche</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`${base}/statistik`}>
                    <BarChart3 /> Statistik
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex h-16 items-end gap-1" aria-hidden>
                  {stats.daily.map((entry) => {
                    const max = Math.max(1, ...stats.daily.map((d) => d.views));
                    const height = Math.max(4, Math.round((entry.views / max) * 100));
                    return (
                      <div
                        key={entry.day}
                        className="bg-primary/80 flex-1 rounded-sm"
                        style={{ height: `${height}%`, opacity: entry.views === 0 ? 0.25 : 1 }}
                        title={`${entry.day}: ${entry.views}`}
                      />
                    );
                  })}
                </div>
                <p className="text-muted-foreground mt-3 text-xs">
                  {formatNumber(stats.total)} Aufrufe in den letzten 7 Tagen
                  {stats.topPosts[0] ? ` · meistgelesen: „${stats.topPosts[0].title}"` : ''}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
