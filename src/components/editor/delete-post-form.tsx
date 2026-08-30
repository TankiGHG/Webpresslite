'use client';

import { useActionState, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { deletePostAction, type ActionState } from '@/lib/actions/posts';

export function DeletePostForm({ siteId, postId }: { siteId: string; postId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deletePostAction, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="postId" value={postId} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}

      {confirming ? (
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Wird gelöscht…' : 'Wirklich löschen'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Abbrechen
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>
          Beitrag löschen
        </Button>
      )}
    </form>
  );
}
