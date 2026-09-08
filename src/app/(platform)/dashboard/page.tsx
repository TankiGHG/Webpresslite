import { ArrowUpRight, FileText, MessageSquare, PenLine, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CreateSiteForm } from '@/components/sites/create-site-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { listSiteSummaries, type SiteSummary } from '@/lib/db/queries/dashboard';
import { getEnv } from '@/lib/env';
import { formatRelative, greeting } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/sites/roles';
import { publicSiteUrl } from '@/lib/tenant/public-url';

export const metadata: Metadata = { title: 'Dashboard' };

function SiteCard({ site, rootDomain }: { site: SiteSummary; rootDomain: string }) {
  const url = publicSiteUrl(site);
  const host =
    site.customDomain && site.domainVerifiedAt
      ? site.customDomain
      : `${site.subdomain}.${rootDomain}`;
  // The action links say only "Beiträge"/"Ansehen"; the card title provides
  // the site name as their description without changing their names.
  const nameId = `site-${site.id}-name`;

  return (
    <li>
      <Card className="group relative flex h-full flex-col transition-shadow hover:shadow-[var(--shadow-float)]">
        <CardHeader className="flex-row items-start gap-3 pb-4">
          <span
            aria-hidden
            className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-lg text-base font-semibold"
          >
            {site.name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">
              <Link
                id={nameId}
                href={`/sites/${site.id}`}
                className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
              >
                {site.name}
              </Link>
            </CardTitle>
            <CardDescription className="truncate font-mono text-xs">{host}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="mt-auto space-y-4">
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-muted/60 rounded-lg px-3 py-2">
              <dt className="text-muted-foreground text-xs">Live</dt>
              <dd className="text-lg font-semibold tabular-nums">{site.publishedCount}</dd>
            </div>
            <div className="bg-muted/60 rounded-lg px-3 py-2">
              <dt className="text-muted-foreground text-xs">Entwürfe</dt>
              <dd className="text-lg font-semibold tabular-nums">{site.draftCount}</dd>
            </div>
            <div className="bg-muted/60 rounded-lg px-3 py-2">
              <dt className="text-muted-foreground text-xs">Offen</dt>
              <dd className="flex items-center gap-1 text-lg font-semibold tabular-nums">
                {site.pendingComments}
                <MessageSquare className="text-muted-foreground size-3.5" aria-hidden />
              </dd>
            </div>
          </dl>
          <p className="text-muted-foreground truncate text-xs">
            {site.lastEditedAt
              ? `Zuletzt bearbeitet ${formatRelative(site.lastEditedAt)}`
              : 'Noch keine Inhalte'}
          </p>
          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <Badge variant="outline">{ROLE_LABELS[site.role]}</Badge>
            <span className="relative z-10 flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                <Link href={`/sites/${site.id}/posts`} aria-describedby={nameId}>
                  <FileText /> Beiträge
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                <a href={url} target="_blank" rel="noreferrer" aria-describedby={nameId}>
                  <ArrowUpRight /> Ansehen
                </a>
              </Button>
            </span>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

export default async function DashboardPage() {
  const { user } = await requireSession('/dashboard');
  const sites = await listSiteSummaries(user.id);
  const rootDomain = getEnv().ROOT_DOMAIN;

  return (
    <div className="space-y-8">
      <PageHeader
        title={greeting(user.name)}
        description={
          <>
            Angemeldet als <span data-testid="session-email">{user.email}</span>.
            {sites.length > 0
              ? ` Du hast Zugriff auf ${sites.length} ${sites.length === 1 ? 'Site' : 'Sites'}.`
              : ''}
          </>
        }
        actions={
          sites.length > 0 ? (
            <Button asChild variant="outline">
              <a href="#neue-site">
                <Plus /> Neue Site
              </a>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section aria-labelledby="sites-heading" className="space-y-4">
          <h2 id="sites-heading" className="text-base font-semibold tracking-tight">
            Deine Sites
          </h2>

          {sites.length === 0 ? (
            <EmptyState
              icon={PenLine}
              title="Noch keine Site angelegt"
              description="Leg rechts deine erste Site an — Name und Adresse genügen, in einer Minute schreibst du den ersten Beitrag."
              data-testid="no-sites"
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2" data-testid="site-list">
              {sites.map((site) => (
                <SiteCard key={site.id} site={site} rootDomain={rootDomain} />
              ))}
            </ul>
          )}
        </section>

        <Card id="neue-site" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Neue Site anlegen</CardTitle>
            <CardDescription>
              Jede Site bekommt eine eigene Adresse, ein eigenes Design und ein eigenes Team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateSiteForm rootDomain={rootDomain} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
