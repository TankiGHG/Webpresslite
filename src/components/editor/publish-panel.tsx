'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePostStatusAction, type ActionState } from '@/lib/actions/posts';
import { POST_STATUS_LABELS, type PostStatus } from '@/lib/posts/constants';

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
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Veröffentlichung</h2>
        <span
          className="rounded-full border px-2 py-0.5 text-xs"
          data-testid="post-status"
          data-status={status}
        >
          {POST_STATUS_LABELS[status]}
        </span>
      </div>

      {state.formError ? <Alert>{state.formError}</Alert> : null}

      {status === 'published' && publishedAt ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Seit {new Date(publishedAt).toLocaleString('de-DE')} öffentlich unter{' '}
          <a href={publicUrl} className="font-mono underline underline-offset-4">
            {publicUrl}
          </a>
        </p>
      ) : null}

      {status === 'scheduled' && publishedAt ? (
        <p className="text-xs text-[var(--color-muted-foreground)]" data-testid="scheduled-for">
          Geplant für {new Date(publishedAt).toLocaleString('de-DE')}
        </p>
      ) : null}

      {!canPublish ? (
        <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="cannot-publish">
          Veröffentlichen übernimmt die Redaktion. Dein Entwurf ist gespeichert.
        </p>
      ) : (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="postId" value={postId} />

          <div className="flex flex-wrap gap-2">
            {status !== 'published' ? (
              <Button type="submit" name="intent" value="publish" disabled={pending}>
                Jetzt veröffentlichen
              </Button>
            ) : (
              <Button
                type="submit"
                name="intent"
                value="unpublish"
                variant="outline"
                disabled={pending}
              >
                Zurück zum Entwurf
              </Button>
            )}
          </div>

          <div className="space-y-1.5 border-t pt-3">
            <Label htmlFor="scheduledFor">Später veröffentlichen</Label>
            <Input
              id="scheduledFor"
              name="scheduledFor"
              type="datetime-local"
              defaultValue={defaultSchedule}
              aria-invalid={state.errors?.scheduledFor ? true : undefined}
              disabled={pending}
            />
            {state.errors?.scheduledFor ? (
              <p className="text-sm text-red-700">{state.errors.scheduledFor}</p>
            ) : null}
            <Button
              type="submit"
              name="intent"
              value="schedule"
              variant="outline"
              size="sm"
              disabled={pending}
            >
              Veröffentlichung planen
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
