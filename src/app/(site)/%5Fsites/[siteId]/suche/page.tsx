import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicSite, searchPosts } from '@/lib/db/queries/public-sites';

type Params = Promise<{ siteId: string }>;

const dateFormat = new Intl.DateTimeFormat('de-DE', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

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
    <div>
      <header className="post-header">
        <h1>Suche</h1>
        {query ? (
          <p className="post-meta" aria-live="polite">
            {hits.length === 0
              ? 'Keine Treffer'
              : hits.length === 1
                ? 'Ein Treffer'
                : `${hits.length} Treffer`}{' '}
            für {'„'}
            {query}
            {'“'}
          </p>
        ) : null}
      </header>

      <form action="/suche" method="get" className="site-search-form" role="search">
        <label htmlFor="q" className="sr-only">
          Suchbegriff
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Wonach suchst du?"
          autoFocus={query === ''}
        />
        <button type="submit">Suchen</button>
      </form>

      {query === '' ? null : hits.length === 0 ? (
        <div className="site-empty" data-testid="no-results">
          <p>
            Nichts gefunden für {'„'}
            {query}
            {'“'}.
          </p>
          <p className="post-meta">Versuch es mit einem anderen Begriff oder stöbere im Archiv.</p>
          <p>
            <Link href="/archiv">Zum Archiv</Link>
          </p>
        </div>
      ) : (
        <ul className="post-list" data-testid="search-results">
          {hits.map((hit) => (
            <li key={hit.id} className="post-list-item">
              <div>
                {hit.publishedAt ? (
                  <p className="post-meta">
                    <time dateTime={new Date(hit.publishedAt).toISOString()}>
                      {dateFormat.format(new Date(hit.publishedAt))}
                    </time>
                    <span className="dot" aria-hidden />
                    <span>{hit.readingMinutes} Min. Lesezeit</span>
                  </p>
                ) : null}
                <h2>
                  <Link href={`/beitrag/${hit.slug}`}>{hit.title}</Link>
                </h2>
                {/* Sanitized in the query layer down to <mark>. */}
                <p className="post-excerpt" dangerouslySetInnerHTML={{ __html: hit.headline }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
