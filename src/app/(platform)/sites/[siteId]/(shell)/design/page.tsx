import { ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ThemeForm } from '@/components/themes/theme-form';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { can } from '@/lib/sites/permissions';
import { publicSiteUrl } from '@/lib/tenant/public-url';
import { parseThemeSettings } from '@/lib/themes/settings';

export const metadata: Metadata = { title: 'Design' };

export default async function DesignPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/design`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site || !can(site.role, 'site:design')) notFound();

  return (
    <div>
      <PageHeader
        title="Design"
        description="Theme, Farben, Schrift und Logo deiner öffentlichen Site."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={publicSiteUrl(site)} target="_blank" rel="noreferrer">
              Site ansehen
              <ExternalLink />
            </a>
          </Button>
        }
      />

      <ThemeForm
        siteId={site.id}
        theme={site.theme}
        settings={parseThemeSettings(site.themeSettings)}
      />
    </div>
  );
}
