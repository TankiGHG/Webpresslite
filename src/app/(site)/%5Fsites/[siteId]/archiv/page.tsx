import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getPublicSite,
  listAllPublished,
  listPublicCategories,
} from '@/lib/db/queries/public-sites';

const dayFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' });

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

  const [published, categories] = await Promise.all([
    listAllPublished(siteId),
    listPublicCategories(siteId),
  ]);
  const entries = published.filter((entry) => entry.type === 'post');

  // Group by year, newest first. Empty years simply do not appear.
  const byYear = new Map<number, typeof entries>();
  for (const entry of entries) {
    const year = entry.publishedAt?.getFullYear() ?? 0;
    const bucket = byYear.get(year);
    if (bucket) bucket.push(entry);
    else byYear.set(year, [entry]);
  }

  return (
    <div>
      <header className="post-header">
        <h1 data-testid="archive-title">Archiv</h1>
        <p className="post-meta">
          {entries.length === 1 ? 'Ein Beitrag' : `${entries.length} Beiträge`}
          {categories.length > 0 ? (
            <>
              <span className="dot" aria-hidden />
              {categories.length === 1 ? 'Eine Kategorie' : `${categories.length} Kategorien`}
            </>
          ) : null}
        </p>
      </header>

      {categories.length > 0 ? (
        <nav className="post-taxonomies archive-categories" aria-label="Kategorien">
          {categories.map((category) => (
            <Link key={category.id} href={`/kategorie/${category.slug}`}>
              {category.name} <span className="count">{category.postCount}</span>
            </Link>
          ))}
        </nav>
      ) : null}

      {entries.length === 0 ? (
        <div className="site-empty" data-testid="empty-archive">
          <p>Noch keine veröffentlichten Beiträge.</p>
        </div>
      ) : (
        <div data-testid="archive" className="archive">
          {[...byYear.entries()]
            .sort(([a], [b]) => b - a)
            .map(([year, yearEntries]) => (
              <section key={year} className="archive-year">
                <h2 className="site-section-title">{year}</h2>
                <ul>
                  {yearEntries.map((entry) => (
                    <li key={entry.id}>
                      {entry.publishedAt ? (
                        <time dateTime={entry.publishedAt.toISOString()}>
                          {dayFormat.format(entry.publishedAt)}
                        </time>
                      ) : (
                        <span aria-hidden />
                      )}
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
