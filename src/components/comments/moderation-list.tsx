'use client';

import { Check, MessageSquare, ShieldAlert, Trash2, Undo2 } from 'lucide-react';
import { useActionState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { moderateCommentAction, type ModerationState } from '@/lib/actions/comments';
import { COMMENT_STATUS_LABELS, type CommentStatus } from '@/lib/comments/constants';
import type { ModerationComment } from '@/lib/db/queries/comments';
import { formatDateTime } from '@/lib/format';

const STATUS_VARIANT: Record<CommentStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  spam: 'danger',
};

const EMPTY_COPY: Record<CommentStatus, { title: string; description: string }> = {
  pending: {
    title: 'Alles erledigt',
    description: 'Neue Kommentare landen hier, bis du sie freigibst.',
  },
  approved: {
    title: 'Noch nichts freigegeben',
    description: 'Freigegebene Kommentare erscheinen öffentlich unter dem Beitrag.',
  },
  spam: {
    title: 'Kein Spam',
    description: 'Als Spam markierte Kommentare bleiben hier, bis du sie löschst.',
  },
};

function ModerationActions({ siteId, comment }: { siteId: string; comment: ModerationComment }) {
  const [state, formAction, pending] = useActionState<ModerationState, FormData>(
    moderateCommentAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="commentId" value={comment.id} />

      {state.formError ? (
        <div className="w-full">
          <Alert>{state.formError}</Alert>
        </div>
      ) : null}

      {comment.status !== 'approved' ? (
        <Button type="submit" name="intent" value="approved" size="sm" disabled={pending}>
          <Check />
          Freigeben
        </Button>
      ) : (
        <Button
          type="submit"
          name="intent"
          value="pending"
          size="sm"
          variant="outline"
          disabled={pending}
        >
          <Undo2 />
          Freigabe zurücknehmen
        </Button>
      )}

      {comment.status !== 'spam' ? (
        <Button
          type="submit"
          name="intent"
          value="spam"
          size="sm"
          variant="outline"
          disabled={pending}
        >
          <ShieldAlert />
          Als Spam markieren
        </Button>
      ) : null}

      <Button
        type="submit"
        name="intent"
        value="delete"
        size="sm"
        variant="ghost"
        className="text-danger hover:text-danger"
        disabled={pending}
      >
        <Trash2 />
        Löschen
      </Button>
    </form>
  );
}

export function ModerationList({
  siteId,
  comments,
  status,
}: {
  siteId: string;
  comments: ModerationComment[];
  status: CommentStatus;
}) {
  if (comments.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title={EMPTY_COPY[status].title}
        description={EMPTY_COPY[status].description}
        data-testid="no-comments"
      />
    );
  }

  return (
    <ul className="space-y-3" data-testid="moderation-list">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className="bg-card rounded-xl border p-4 shadow-[var(--shadow-card)] sm:p-5"
          data-status={comment.status}
        >
          <div className="flex items-start gap-3">
            <Avatar name={comment.authorName} className="mt-0.5" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {comment.authorName}
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      {comment.authorEmail}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    zu {'„'}
                    {comment.postTitle}
                    {'“'} · {formatDateTime(comment.createdAt)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[comment.status]}>
                  {COMMENT_STATUS_LABELS[comment.status]}
                </Badge>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.body}</p>

              <ModerationActions siteId={siteId} comment={comment} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
