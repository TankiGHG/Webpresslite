import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicSite, listPublishedPosts } from '@/lib/db/queries/public-sites';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteId: string }>;
}): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  return { title: site?.name ?? 'Site' };
}

export default async function SiteHomePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) notFound();

  const posts = await listPublishedPosts(siteId);

  return (
    <div className="space-y-8">
      <p className="text-xs text-[var(--color-muted-foreground)]" data-testid="site-subdomain">
        {site.subdomain}
      </p>

      {posts.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="no-published">
          Hier ist noch nichts veröffentlicht.
        </p>
      ) : (
        <ul className="space-y-6" data-testid="published-list">
          {posts.map((post) => (
            <li key={post.id} className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                <Link href={`/beitrag/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              {post.publishedAt ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  <time dateTime={post.publishedAt.toISOString()}>
                    {post.publishedAt.toLocaleDateString('de-DE')}
                  </time>
                </p>
              ) : null}
              {post.excerpt ? <p className="text-sm">{post.excerpt}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
