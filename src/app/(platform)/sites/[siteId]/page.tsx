import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DeleteSiteForm } from '@/components/sites/delete-site-form';
import { requireSession } from '@/lib/auth/session';
import { countPendingComments } from '@/lib/db/queries/comments';
import { countPosts } from '@/lib/db/queries/posts';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { getEnv } from '@/lib/env';
import { roleAtLeast } from '@/lib/sites/roles';
import { siteUrl } from '@/lib/tenant/host';

export const metadata: Metadata = { title: 'Site — webpresslite' };

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}`);

  // Returns null both for a foreign site and a nonexistent one, so the 404 does
  // not confirm that some other user's site id exists.
  const site = await getSiteForUser(siteId, user.id);
  if (!site) notFound();

  const rootDomain = getEnv().ROOT_DOMAIN;
  const postCount = await countPosts(site.id, user.id);
  // Only editors and above may moderate, so the badge stays hidden for authors.
  const pendingComments = roleAtLeast(site.role, 'editor')
    ? await countPendingComments(site.id, user.id)
    : 0;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="site-detail-name">
          {site.name}
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          <a href={siteUrl(site.subdomain, rootDomain)} className="font-mono hover:underline">
            {site.subdomain}.{rootDomain}
          </a>{' '}
          · Rolle: <span data-testid="site-role">{site.role}</span> · Plan: {site.plan}
        </p>
      </header>

      <section className="rounded-lg border p-6">
        <h2 className="font-medium">Inhalte</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {postCount === 0
            ? 'Noch keine Beiträge oder Seiten.'
            : `${postCount} ${postCount === 1 ? 'Eintrag' : 'Einträge'}.`}
        </p>
        <p className="mt-3 text-sm">
          <Link href={`/sites/${site.id}/posts`} className="underline underline-offset-4">
            Inhalte verwalten
          </Link>
        </p>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="font-medium">Kategorien und Tags</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Beiträge einordnen und Archive füllen.
        </p>
        <p className="mt-3 text-sm">
          <Link href={`/sites/${site.id}/taxonomien`} className="underline underline-offset-4">
            Taxonomien verwalten
          </Link>
        </p>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="font-medium">Kommentare</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {pendingComments === 0
            ? 'Nichts wartet auf Freigabe.'
            : `${pendingComments} ${pendingComments === 1 ? 'Kommentar wartet' : 'Kommentare warten'} auf Freigabe.`}
        </p>
        <p className="mt-3 text-sm">
          <Link href={`/sites/${site.id}/kommentare`} className="underline underline-offset-4">
            Kommentare moderieren
          </Link>
        </p>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="font-medium">Medien</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Bilder hochladen, Alt-Texte pflegen, aufräumen.
        </p>
        <p className="mt-3 text-sm">
          <Link href={`/sites/${site.id}/medien`} className="underline underline-offset-4">
            Medien verwalten
          </Link>
        </p>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="font-medium">Design</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Theme, Farben, Schrift und Logo.
        </p>
        <p className="mt-3 text-sm">
          <Link href={`/sites/${site.id}/design`} className="underline underline-offset-4">
            Design anpassen
          </Link>
        </p>
      </section>

      {site.role === 'owner' ? (
        <section className="space-y-3">
          <h2 className="font-medium">Gefahrenzone</h2>
          <DeleteSiteForm siteId={site.id} subdomain={site.subdomain} />
        </section>
      ) : null}

      <p className="text-sm">
        <Link href="/dashboard" className="underline underline-offset-4">
          Zurück zum Dashboard
        </Link>
      </p>
    </div>
  );
}
