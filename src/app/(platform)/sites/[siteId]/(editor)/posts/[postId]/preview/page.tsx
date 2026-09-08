import { ArrowLeft, Eye } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RenderedContent } from '@/components/editor/rendered-content';
import { PostStatusBadge } from '@/components/posts/status-badge';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import { getMedia } from '@/lib/db/queries/media';
import { getPost } from '@/lib/db/queries/posts';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { countWords, formatDate, readingMinutes } from '@/lib/format';

export const metadata: Metadata = { title: 'Vorschau' };

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

  const cover = post.coverMediaId ? await getMedia(siteId, post.coverMediaId, user.id) : null;
  const minutes = readingMinutes(countWords(post.contentText));

  return (
    <div className="min-h-dvh">
      <div className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[46rem] items-center gap-3 px-5 sm:px-8">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/sites/${siteId}/posts/${post.id}`}>
              <ArrowLeft />
              Zurück zum Editor
            </Link>
          </Button>
          <span className="text-muted-foreground ml-auto inline-flex items-center gap-2 text-xs">
            <Eye className="size-3.5" />
            Vorschau · nur für Mitglieder sichtbar
          </span>
          <PostStatusBadge status={post.status} />
        </div>
      </div>

      <article className="mx-auto max-w-[46rem] px-5 pt-12 pb-24 sm:px-8">
        <header className="mb-8 space-y-4">
          <h1
            className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            data-testid="preview-title"
          >
            {post.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {post.publishedAt ? formatDate(post.publishedAt) : 'Noch nicht veröffentlicht'}
            <span className="mx-1.5">·</span>
            {minutes} Min. Lesezeit
          </p>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.urls.full}
              alt={cover.alt ?? ''}
              width={cover.width ?? undefined}
              height={cover.height ?? undefined}
              className="w-full rounded-xl object-cover"
            />
          ) : null}
        </header>
        <RenderedContent html={post.contentHtml} />
      </article>
    </div>
  );
}
