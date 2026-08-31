'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { moderateCommentAction, type ModerationState } from '@/lib/actions/comments';
import { COMMENT_STATUS_LABELS } from '@/lib/comments/constants';
import type { ModerationComment } from '@/lib/db/queries/comments';

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
          Als Spam markieren
        </Button>
      ) : null}

      <Button
        type="submit"
        name="intent"
        value="delete"
        size="sm"
        variant="ghost"
        disabled={pending}
      >
        Löschen
      </Button>
    </form>
  );
}

export function ModerationList({
  siteId,
  comments,
}: {
  siteId: string;
  comments: ModerationComment[];
}) {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="no-comments">
        Keine Kommentare in dieser Ansicht.
      </p>
    );
  }

  return (
    <ul className="space-y-4" data-testid="moderation-list">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className="space-y-3 rounded-lg border p-4"
          data-status={comment.status}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">
              {comment.authorName}{' '}
              <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                {comment.authorEmail}
              </span>
            </p>
            <span className="rounded-full border px-2 py-0.5 text-xs">
              {COMMENT_STATUS_LABELS[comment.status]}
            </span>
          </div>

          <p className="text-xs text-[var(--color-muted-foreground)]">
            zu {'\u201e'}
            {comment.postTitle}
            {'\u201c'} · {comment.createdAt.toLocaleString('de-DE')}
          </p>

          <p className="text-sm whitespace-pre-wrap">{comment.body}</p>

          <ModerationActions siteId={siteId} comment={comment} />
        </li>
      ))}
    </ul>
  );
}
