import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MediaLibrary } from '@/components/media/media-library';
import { PageHeader } from '@/components/ui/page-header';
import { requireSession } from '@/lib/auth/session';
import { listMedia } from '@/lib/db/queries/media';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { formatBytes } from '@/lib/media/constants';

export const metadata: Metadata = { title: 'Medien' };

export default async function MediaPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/medien`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site) notFound();

  const items = await listMedia(siteId, user.id);
  const totalBytes = items.reduce((sum, item) => sum + item.size, 0);

  return (
    <div>
      <PageHeader
        title="Medien"
        description={
          items.length === 0
            ? 'Bilder für Beiträge, Seiten und Titelbilder.'
            : `${items.length} ${items.length === 1 ? 'Bild' : 'Bilder'} · ${formatBytes(totalBytes)}`
        }
      />

      <MediaLibrary siteId={siteId} initial={items} />
    </div>
  );
}
