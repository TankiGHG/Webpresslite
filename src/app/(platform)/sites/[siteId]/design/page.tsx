import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ThemeForm } from '@/components/themes/theme-form';
import { requireSession } from '@/lib/auth/session';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { getEnv } from '@/lib/env';
import { siteUrl } from '@/lib/tenant/host';
import { parseThemeSettings } from '@/lib/themes/settings';

export const metadata: Metadata = { title: 'Design — webpresslite' };

export default async function DesignPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/design`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site) notFound();

  const base = siteUrl(site.subdomain, getEnv().ROOT_DOMAIN);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Design</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {site.name} ·{' '}
          <a href={base} className="font-mono hover:underline">
            Site ansehen
          </a>
        </p>
      </header>

      <ThemeForm
        siteId={site.id}
        theme={site.theme}
        settings={parseThemeSettings(site.themeSettings)}
      />

      <p className="text-sm">
        <Link href={`/sites/${siteId}`} className="underline underline-offset-4">
          Zurück zur Site
        </Link>
      </p>
    </div>
  );
}
