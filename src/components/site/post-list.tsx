import Link from 'next/link';
import type { PublicPostListItem } from '@/lib/db/queries/public-sites';

export function PostList({ posts }: { posts: PublicPostListItem[] }) {
  return (
    <ul className="post-list" data-testid="published-list">
      {posts.map((post) => (
        <li key={post.id} className="post-list-item">
          <h2>
            <Link href={`/beitrag/${post.slug}`}>{post.title}</Link>
          </h2>
          {post.publishedAt ? (
            <p className="post-meta">
              <time dateTime={post.publishedAt.toISOString()}>
                {post.publishedAt.toLocaleDateString('de-DE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </p>
          ) : null}
          {post.excerpt ? <p className="post-excerpt">{post.excerpt}</p> : null}
        </li>
      ))}
    </ul>
  );
}
