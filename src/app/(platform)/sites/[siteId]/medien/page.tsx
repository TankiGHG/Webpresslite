import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MediaLibrary } from '@/components/media/media-library';
import { requireSession } from '@/lib/auth/session';
import { listMedia } from '@/lib/db/queries/media';
import { getSiteForUser } from '@/lib/db/queries/sites';

export const metadata: Metadata = { title: 'Medien — webpresslite' };

export default async function MediaPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/medien`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site) notFound();

  const items = await listMedia(siteId, user.id);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Medien</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {site.name} · {items.length} {items.length === 1 ? 'Bild' : 'Bilder'}
        </p>
      </header>

      <MediaLibrary siteId={siteId} initial={items} />

      <p className="text-sm">
        <Link href={`/sites/${siteId}`} className="underline underline-offset-4">
          Zurück zur Site
        </Link>
      </p>
    </div>
  );
}
