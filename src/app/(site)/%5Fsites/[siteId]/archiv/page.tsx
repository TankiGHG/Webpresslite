import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicSite, listAllPublished } from '@/lib/db/queries/public-sites';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteId: string }>;
}): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) return { title: 'Nicht gefunden' };

  return { title: `Archiv — ${site.name}`, description: `Alle Beiträge von ${site.name}` };
}

export default async function ArchivePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) notFound();

  const entries = (await listAllPublished(siteId)).filter((entry) => entry.type === 'post');

  // Group by year, newest first. Empty years simply do not appear.
  const byYear = new Map<number, typeof entries>();
  for (const entry of entries) {
    const year = entry.publishedAt?.getFullYear() ?? 0;
    const bucket = byYear.get(year);
    if (bucket) bucket.push(entry);
    else byYear.set(year, [entry]);
  }

  return (
    <div className="space-y-8">
      <h1 className="post-header">Archiv</h1>

      {entries.length === 0 ? (
        <p className="post-meta" data-testid="empty-archive">
          Noch keine veröffentlichten Beiträge.
        </p>
      ) : (
        <div data-testid="archive">
          {[...byYear.entries()]
            .sort(([a], [b]) => b - a)
            .map(([year, yearEntries]) => (
              <section key={year} className="mb-8">
                <h2 className="mb-3 text-xl font-semibold">{year}</h2>
                <ul className="space-y-2">
                  {yearEntries.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3">
                      {entry.publishedAt ? (
                        <time
                          dateTime={entry.publishedAt.toISOString()}
                          className="post-meta tabular-nums"
                        >
                          {entry.publishedAt.toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </time>
                      ) : null}
                      <Link href={`/beitrag/${entry.slug}`}>{entry.title}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
