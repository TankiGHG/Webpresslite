'use client';

import { CalendarClock, ExternalLink, Rocket, Undo2 } from 'lucide-react';
import { useActionState } from 'react';
import { PostStatusBadge } from '@/components/posts/status-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePostStatusAction, type ActionState } from '@/lib/actions/posts';
import { formatDateTime } from '@/lib/format';
import type { PostStatus } from '@/lib/posts/constants';

/** `datetime-local` wants local wall clock time without a timezone suffix. */
function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function PublishPanel({
  siteId,
  postId,
  status,
  publishedAt,
  publicUrl,
  canPublish,
}: {
  siteId: string;
  postId: string;
  status: PostStatus;
  publishedAt: string | null;
  publicUrl: string;
  canPublish: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    changePostStatusAction,
    {},
  );

  const defaultSchedule = toLocalInputValue(
    publishedAt ? new Date(publishedAt) : new Date(Date.now() + 60 * 60 * 1000),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">Status</span>
        <PostStatusBadge status={status} data-testid="post-status" />
      </div>

      {state.formError ? <Alert>{state.formError}</Alert> : null}

      {status === 'published' && publishedAt ? (
        <div className="bg-success-soft text-success rounded-lg px-3 py-2.5 text-xs">
          <p>Öffentlich seit {formatDateTime(new Date(publishedAt))}.</p>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            Auf der Site ansehen
            <ExternalLink className="size-3" />
          </a>
        </div>
      ) : null}

      {status === 'scheduled' && publishedAt ? (
        <div
          className="bg-warning-soft text-warning rounded-lg px-3 py-2.5 text-xs"
          data-testid="scheduled-for"
        >
          Erscheint automatisch am {formatDateTime(new Date(publishedAt))}.
        </div>
      ) : null}

      {!canPublish ? (
        <p className="text-muted-foreground text-sm" data-testid="cannot-publish">
          Veröffentlichen übernimmt die Redaktion. Dein Entwurf ist gespeichert.
        </p>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="postId" value={postId} />

          {status !== 'published' ? (
            <Button
              type="submit"
              name="intent"
              value="publish"
              className="w-full"
              loading={pending}
            >
              {pending ? null : <Rocket />}
              Jetzt veröffentlichen
            </Button>
          ) : (
            <Button
              type="submit"
              name="intent"
              value="unpublish"
              variant="outline"
              className="w-full"
              loading={pending}
            >
              {pending ? null : <Undo2 />}
              Zurück zum Entwurf
            </Button>
          )}

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="scheduledFor">Später veröffentlichen</Label>
            <Input
              id="scheduledFor"
              name="scheduledFor"
              type="datetime-local"
              defaultValue={defaultSchedule}
              aria-invalid={state.errors?.scheduledFor ? true : undefined}
              aria-describedby={state.errors?.scheduledFor ? 'scheduledFor-error' : undefined}
              disabled={pending}
            />
            {state.errors?.scheduledFor ? (
              <p id="scheduledFor-error" className="text-danger text-sm">
                {state.errors.scheduledFor}
              </p>
            ) : null}
            <Button
              type="submit"
              name="intent"
              value="schedule"
              variant="secondary"
              size="sm"
              className="w-full"
              disabled={pending}
            >
              <CalendarClock />
              Veröffentlichung planen
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
