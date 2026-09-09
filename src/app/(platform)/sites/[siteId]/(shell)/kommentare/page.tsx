import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ModerationList } from '@/components/comments/moderation-list';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { LinkTabs } from '@/components/ui/tabs';
import { requireSession } from '@/lib/auth/session';
import { COMMENT_STATUSES, COMMENT_STATUS_LABELS } from '@/lib/comments/constants';
import type { CommentStatus } from '@/lib/comments/constants';
import { commentCounts, listCommentsForModeration } from '@/lib/db/queries/comments';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { can } from '@/lib/sites/permissions';

export const metadata: Metadata = { title: 'Kommentare' };

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
  // Checked before the queries run, so a member without the right gets a 404
  // rather than an error page.
  if (!site || !can(site.role, 'comment:moderate')) notFound();

  // Default view is what actually needs a decision.
  const status = parseStatus(rawStatus) ?? 'pending';

  const [comments, counts] = await Promise.all([
    listCommentsForModeration(siteId, user.id, status),
    commentCounts(siteId, user.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Kommentare"
        description={
          counts.pending === 0
            ? 'Nichts wartet auf eine Entscheidung.'
            : `${counts.pending} ${counts.pending === 1 ? 'Kommentar wartet' : 'Kommentare warten'} auf Freigabe.`
        }
      />

      {/* Without this, an empty pending list looks like quiet readers rather
          than a switch someone flipped. */}
      {site.commentsEnabled ? null : (
        <Alert className="mb-6" variant="info">
          Kommentare sind für diese Site ausgeschaltet — es kommen keine neuen dazu. Einzelne
          Beiträge können sie trotzdem erlauben. Umschalten unter{' '}
          <Link href={`/sites/${siteId}/einstellungen`} className="underline">
            Einstellungen
          </Link>
          .
        </Alert>
      )}

      <LinkTabs
        className="mb-6"
        tabs={COMMENT_STATUSES.map((value) => ({
          href: `/sites/${siteId}/kommentare?status=${value}`,
          label: COMMENT_STATUS_LABELS[value],
          count: counts[value],
          active: status === value,
          testId: `filter-${value}`,
        }))}
      />

      <ModerationList siteId={siteId} comments={comments} status={status} />
    </div>
  );
}
