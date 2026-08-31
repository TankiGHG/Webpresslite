'use client';

import { useActionState } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { assignTaxonomiesAction, type ActionState } from '@/lib/actions/taxonomies';
import type { TaxonomyWithCount } from '@/lib/db/queries/taxonomies';

export function PostTaxonomyForm({
  siteId,
  postId,
  categories,
  categoryId,
  tagNames,
}: {
  siteId: string;
  postId: string;
  categories: TaxonomyWithCount[];
  categoryId: string | null;
  tagNames: string[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    assignTaxonomiesAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <h2 className="font-medium">Einordnung</h2>

      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="postId" value={postId} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}
      {state.saved ? <Alert variant="success">Einordnung gespeichert.</Alert> : null}

      <div className="space-y-1.5">
        <Label htmlFor="categoryId">Kategorie</Label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={categoryId ?? ''}
          disabled={pending}
          className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="">Ohne Kategorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {state.errors?.categoryId ? (
          <p className="text-sm text-red-700">{state.errors.categoryId}</p>
        ) : null}
      </div>

      <Field
        label="Tags (durch Komma getrennt)"
        name="tags"
        defaultValue={tagNames.join(', ')}
        error={state.errors?.tags}
        disabled={pending}
      />

      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Wird gespeichert…' : 'Einordnung speichern'}
      </Button>
    </form>
  );
}
