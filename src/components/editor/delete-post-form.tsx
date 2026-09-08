'use client';

import { Trash2 } from 'lucide-react';
import { useActionState, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { deletePostAction, type ActionState } from '@/lib/actions/posts';

export function DeletePostForm({ siteId, postId }: { siteId: string; postId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deletePostAction, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="postId" value={postId} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}

      {confirming ? (
        <div className="border-danger/40 bg-danger-soft/60 space-y-3 rounded-lg border p-3">
          <p className="text-sm">Das lässt sich nicht rückgängig machen.</p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="danger" loading={pending}>
              {pending ? 'Wird gelöscht…' : 'Wirklich löschen'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="danger-outline"
          onClick={() => setConfirming(true)}
        >
          <Trash2 />
          Beitrag löschen
        </Button>
      )}
    </form>
  );
}
