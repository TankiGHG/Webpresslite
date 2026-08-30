import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { RenderedContent } from '@/components/editor/rendered-content';
import { requireSession } from '@/lib/auth/session';
import { getPost } from '@/lib/db/queries/posts';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { POST_STATUS_LABELS } from '@/lib/posts/constants';

export const metadata: Metadata = { title: 'Vorschau — webpresslite' };

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ siteId: string; postId: string }>;
}) {
  const { siteId, postId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/posts/${postId}/preview`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site) notFound();

  const post = await getPost(siteId, postId, user.id);
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 rounded-md border border-dashed px-4 py-2">
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Vorschau · {POST_STATUS_LABELS[post.status]} · nur für Site-Mitglieder sichtbar
        </p>
        <Link
          href={`/sites/${siteId}/posts/${post.id}`}
          className="text-sm underline underline-offset-4"
        >
          Zurück zum Editor
        </Link>
      </div>

      <article className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight" data-testid="preview-title">
          {post.title}
        </h1>
        <RenderedContent html={post.contentHtml} />
      </article>
    </div>
  );
}
