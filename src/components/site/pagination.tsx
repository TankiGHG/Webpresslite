import Link from 'next/link';

export function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  if (pageCount <= 1) return null;

  const previous = page > 1 ? (page === 2 ? '/' : `/seite/${page - 1}`) : null;
  const next = page < pageCount ? `/seite/${page + 1}` : null;

  return (
    <nav className="site-pagination" aria-label="Seitennummerierung" data-testid="pagination">
      {previous ? (
        <Link href={previous} rel="prev">
          ← Neuere Beiträge
        </Link>
      ) : (
        <span />
      )}
      <span className="post-meta">
        Seite {page} von {pageCount}
      </span>
      {next ? (
        <Link href={next} rel="next">
          Ältere Beiträge →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
