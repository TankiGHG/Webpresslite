import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ModerationList } from '@/components/comments/moderation-list';
import { requireSession } from '@/lib/auth/session';
import { COMMENT_STATUSES, COMMENT_STATUS_LABELS } from '@/lib/comments/constants';
import type { CommentStatus } from '@/lib/comments/constants';
import { commentCounts, listCommentsForModeration } from '@/lib/db/queries/comments';
import { getSiteForUser } from '@/lib/db/queries/sites';

export const metadata: Metadata = { title: 'Kommentare — webpresslite' };

function parseStatus(value: string | undefined): CommentStatus | undefined {
  return value && (COMMENT_STATUSES as readonly string[]).includes(value)
    ? (value as CommentStatus)
    : undefined;
}

export default async function CommentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { siteId } = await params;
  const { status: rawStatus } = await searchParams;
  const { user } = await requireSession(`/sites/${siteId}/kommentare`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site) notFound();

  // Default view is what actually needs a decision.
  const status = parseStatus(rawStatus) ?? 'pending';

  const [comments, counts] = await Promise.all([
    listCommentsForModeration(siteId, user.id, status),
    commentCounts(siteId, user.id),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kommentare</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{site.name}</p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Filter">
        {COMMENT_STATUSES.map((value) => (
          <Link
            key={value}
            href={`/sites/${siteId}/kommentare?status=${value}`}
            data-testid={`filter-${value}`}
            aria-current={status === value ? 'page' : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${
              status === value
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : ''
            }`}
          >
            {COMMENT_STATUS_LABELS[value]} ({counts[value]})
          </Link>
        ))}
      </nav>

      <ModerationList siteId={siteId} comments={comments} />

      <p className="text-sm">
        <Link href={`/sites/${siteId}`} className="underline underline-offset-4">
          Zurück zur Site
        </Link>
      </p>
    </div>
  );
}
