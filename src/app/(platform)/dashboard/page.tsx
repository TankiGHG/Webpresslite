import Link from 'next/link';
import type { Metadata } from 'next';
import { CreateSiteForm } from '@/components/sites/create-site-form';
import { requireSession } from '@/lib/auth/session';
import { listSitesForUser } from '@/lib/db/queries/sites';
import { getEnv } from '@/lib/env';
import { siteUrl } from '@/lib/tenant/host';

export const metadata: Metadata = { title: 'Dashboard — webpresslite' };

export default async function DashboardPage() {
  const { user } = await requireSession('/dashboard');
  const sites = await listSitesForUser(user.id);
  const rootDomain = getEnv().ROOT_DOMAIN;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Angemeldet als <span data-testid="session-email">{user.email}</span>.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-medium">Deine Sites</h2>

        {sites.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="no-sites">
            Noch keine Site angelegt.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border" data-testid="site-list">
            {sites.map((site) => (
              <li key={site.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/sites/${site.id}`} className="font-medium hover:underline">
                    {site.name}
                  </Link>
                  <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                    <a
                      href={siteUrl(site.subdomain, rootDomain)}
                      className="font-mono hover:underline"
                      rel="noreferrer"
                    >
                      {site.subdomain}.{rootDomain}
                    </a>
                  </p>
                </div>
                <span className="text-xs text-[var(--color-muted-foreground)] uppercase">
                  {site.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Neue Site</h2>
        <CreateSiteForm rootDomain={rootDomain} />
      </section>
    </div>
  );
}
