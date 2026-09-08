import Link from 'next/link';
import type { PublicPostListItem, PublicTaxonomy } from '@/lib/db/queries/public-sites';

const dateFormat = new Intl.DateTimeFormat('de-DE', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/** Lists posts on the home page and in archives; every item links to the post. */
export function PostList({
  posts,
  categories = new Map(),
}: {
  posts: PublicPostListItem[];
  /** Category by id, so the list can label posts without a query per item. */
  categories?: Map<string, PublicTaxonomy>;
}) {
  return (
    <ul className="post-list" data-testid="published-list">
      {posts.map((post) => {
        const category = post.categoryId ? categories.get(post.categoryId) : undefined;
        return (
          <li key={post.id} className={post.cover ? 'post-list-item has-cover' : 'post-list-item'}>
            <div>
              <p className="post-meta">
                {category ? (
                  <Link href={`/kategorie/${category.slug}`} className="post-category">
                    {category.name}
                  </Link>
                ) : null}
                {category && post.publishedAt ? <span className="dot" aria-hidden /> : null}
                {post.publishedAt ? (
                  <time dateTime={post.publishedAt.toISOString()}>
                    {dateFormat.format(post.publishedAt)}
                  </time>
                ) : null}
                <span className="dot" aria-hidden />
                <span>{post.readingMinutes} Min. Lesezeit</span>
              </p>
              <h2>
                <Link href={`/beitrag/${post.slug}`}>{post.title}</Link>
              </h2>
              {post.excerpt ? <p className="post-excerpt">{post.excerpt}</p> : null}
              <Link
                href={`/beitrag/${post.slug}`}
                className="post-readmore"
                aria-hidden
                tabIndex={-1}
              >
                Weiterlesen →
              </Link>
            </div>
            {post.cover ? (
              <Link href={`/beitrag/${post.slug}`} tabIndex={-1} aria-hidden>
                {/* Variants from our own storage with known dimensions. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.cover.urls.medium}
                  srcSet={post.cover.srcset}
                  sizes="(max-width: 40rem) 100vw, 14rem"
                  alt=""
                  width={post.cover.width ?? undefined}
                  height={post.cover.height ?? undefined}
                  loading="lazy"
                  className="post-cover-thumb"
                />
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
