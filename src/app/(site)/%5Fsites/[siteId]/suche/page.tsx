import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicSite, searchPosts } from '@/lib/db/queries/public-sites';

type Params = Promise<{ siteId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) return { title: 'Nicht gefunden' };

  // Search result pages have nothing to offer an index.
  return { title: `Suche — ${site.name}`, robots: { index: false, follow: true } };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ q?: string }>;
}) {
  const { siteId } = await params;
  const { q } = await searchParams;
  const site = await getPublicSite(siteId);

  if (!site) notFound();

  const query = (q ?? '').trim();
  const hits = query ? await searchPosts(siteId, query) : [];

  return (
    <div className="space-y-6">
      <header className="post-header">
        <h1>Suche</h1>
      </header>

      <form action="/suche" method="get" className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Suchbegriff
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Wonach suchst du?"
          className="h-10 flex-1 rounded-md border bg-transparent px-3 text-base"
          style={{ borderColor: 'var(--site-border)' }}
        />
        <button
          type="submit"
          className="h-10 rounded-md px-4 text-sm font-medium"
          style={{
            background: 'var(--site-accent)',
            color: 'var(--site-accent-foreground)',
          }}
        >
          Suchen
        </button>
      </form>

      {query === '' ? null : hits.length === 0 ? (
        <p className="post-meta" data-testid="no-results">
          Nichts gefunden für {'\u201e'}
          {query}
          {'\u201c'}
        </p>
      ) : (
        <ul className="post-list" data-testid="search-results">
          {hits.map((hit) => (
            <li key={hit.id} className="post-list-item">
              <h2>
                <Link href={`/beitrag/${hit.slug}`}>{hit.title}</Link>
              </h2>
              {hit.publishedAt ? (
                <p className="post-meta">
                  <time dateTime={new Date(hit.publishedAt).toISOString()}>
                    {new Date(hit.publishedAt).toLocaleDateString('de-DE')}
                  </time>
                </p>
              ) : null}
              {/* Sanitized in the query layer down to <mark>. */}
              <p className="post-excerpt" dangerouslySetInnerHTML={{ __html: hit.headline }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
