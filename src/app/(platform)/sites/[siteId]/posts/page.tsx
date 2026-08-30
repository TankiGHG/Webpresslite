import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CreatePostForm } from '@/components/editor/create-post-form';
import { requireSession } from '@/lib/auth/session';
import { listPosts } from '@/lib/db/queries/posts';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { POST_STATUS_LABELS, POST_TYPE_LABELS } from '@/lib/posts/constants';

export const metadata: Metadata = { title: 'Inhalte — webpresslite' };

export default async function PostsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/posts`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site) notFound();

  const posts = await listPosts(siteId, user.id);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inhalte</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{site.name}</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium">Neu anlegen</h2>
        <CreatePostForm siteId={siteId} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Alle Inhalte</h2>

        {posts.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="no-posts">
            Noch nichts angelegt.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border" data-testid="post-list">
            {posts.map((post) => (
              <li key={post.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/sites/${siteId}/posts/${post.id}`}
                    className="font-medium hover:underline"
                  >
                    {post.title}
                  </Link>
                  <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                    {POST_TYPE_LABELS[post.type]} · <span className="font-mono">{post.slug}</span> ·{' '}
                    {post.authorName}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 text-xs"
                  data-status={post.status}
                >
                  {POST_STATUS_LABELS[post.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm">
        <Link href={`/sites/${siteId}`} className="underline underline-offset-4">
          Zurück zur Site
        </Link>
      </p>
    </div>
  );
}
