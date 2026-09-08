'use client';

import { Plus } from 'lucide-react';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createPostAction, type ActionState } from '@/lib/actions/posts';
import { POST_TYPE_LABELS, POST_TYPES, type PostType } from '@/lib/posts/constants';

/**
 * Inline quick-create: one line, title + type, straight into the editor.
 * The type select stays visible so a page can be created from the posts list.
 */
export function CreatePostForm({
  siteId,
  defaultType = 'post',
}: {
  siteId: string;
  defaultType?: PostType;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createPostAction, {});

  return (
    <form action={formAction} className="space-y-3" id="neu">
      <input type="hidden" name="siteId" value={siteId} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="title">Titel</Label>
          <Input
            id="title"
            name="title"
            required
            autoComplete="off"
            placeholder={defaultType === 'page' ? 'Titel der neuen Seite' : 'Worüber schreibst du?'}
            aria-invalid={state.errors?.title ? true : undefined}
            aria-describedby={state.errors?.title ? 'title-error' : undefined}
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5 sm:w-40">
          <Label htmlFor="type">Art</Label>
          <Select id="type" name="type" defaultValue={defaultType} disabled={pending}>
            {POST_TYPES.map((type) => (
              <option key={type} value={type}>
                {POST_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>

        <Button type="submit" loading={pending} className="sm:w-auto">
          {pending ? null : <Plus />}
          {pending ? 'Wird angelegt…' : 'Anlegen'}
        </Button>
      </div>

      {state.errors?.title ? (
        <p id="title-error" className="text-danger text-sm">
          {state.errors.title}
        </p>
      ) : null}
    </form>
  );
}
