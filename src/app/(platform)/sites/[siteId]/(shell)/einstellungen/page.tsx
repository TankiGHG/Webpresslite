import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DeleteSiteForm } from '@/components/sites/delete-site-form';
import { SiteSettingsForm } from '@/components/sites/site-settings-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { getEnv } from '@/lib/env';
import { can } from '@/lib/sites/permissions';

export const metadata: Metadata = { title: 'Einstellungen' };

export default async function SiteSettingsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/einstellungen`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site || !can(site.role, 'site:settings')) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Einstellungen"
        description="Name, Untertitel und Kommentare. Adresse und Domain verwaltest du unter „Domain“."
      />

      <Card>
        <CardHeader>
          <CardTitle>Allgemein</CardTitle>
          <CardDescription>
            Die Site ist unter{' '}
            <span className="font-mono">
              {site.subdomain}.{getEnv().ROOT_DOMAIN}
            </span>{' '}
            erreichbar. Die Subdomain lässt sich nicht ändern.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SiteSettingsForm
            siteId={site.id}
            name={site.name}
            description={site.description}
            commentsEnabled={site.commentsEnabled}
          />
        </CardContent>
      </Card>

      {can(site.role, 'site:delete') ? (
        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="text-danger">Gefahrenzone</CardTitle>
            <CardDescription>
              Eine gelöschte Site kann nicht wiederhergestellt werden — auch nicht aus dem Backup
              der Plattform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteSiteForm siteId={site.id} subdomain={site.subdomain} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
