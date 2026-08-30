'use client';

import { useActionState } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createPostAction, type ActionState } from '@/lib/actions/posts';
import { POST_TYPE_LABELS, POST_TYPES } from '@/lib/posts/constants';

export function CreatePostForm({ siteId }: { siteId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createPostAction, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="siteId" value={siteId} />

      {state.formError ? (
        <div className="w-full">
          <Alert>{state.formError}</Alert>
        </div>
      ) : null}

      <div className="min-w-64 flex-1">
        <Field label="Titel" name="title" required error={state.errors?.title} disabled={pending} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="type">Art</Label>
        <select
          id="type"
          name="type"
          defaultValue="post"
          disabled={pending}
          className="h-9 rounded-md border bg-transparent px-2 text-sm"
        >
          {POST_TYPES.map((type) => (
            <option key={type} value={type}>
              {POST_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Wird angelegt…' : 'Anlegen'}
      </Button>
    </form>
  );
}
