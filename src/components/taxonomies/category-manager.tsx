'use client';

import { useActionState } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  createCategoryAction,
  deleteCategoryAction,
  type ActionState,
} from '@/lib/actions/taxonomies';
import type { TaxonomyWithCount } from '@/lib/db/queries/taxonomies';

function DeleteCategory({ siteId, category }: { siteId: string; category: TaxonomyWithCount }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    deleteCategoryAction,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="categoryId" value={category.id} />
      {state.formError ? <Alert>{state.formError}</Alert> : null}
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending ? 'Löscht…' : 'Löschen'}
      </Button>
    </form>
  );
}

export function CategoryManager({
  siteId,
  categories,
}: {
  siteId: string;
  categories: TaxonomyWithCount[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createCategoryAction,
    {},
  );

  return (
    <section className="space-y-4">
      <h2 className="font-medium">Kategorien</h2>

      {categories.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="no-categories">
          Noch keine Kategorien.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border" data-testid="category-list">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{category.name}</p>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                  <span className="font-mono">{category.slug}</span> · {category.postCount}{' '}
                  {category.postCount === 1 ? 'Beitrag' : 'Beiträge'}
                </p>
              </div>
              <DeleteCategory siteId={siteId} category={category} />
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="siteId" value={siteId} />
        {state.formError ? (
          <div className="w-full">
            <Alert>{state.formError}</Alert>
          </div>
        ) : null}

        <div className="min-w-56 flex-1">
          <Field label="Neue Kategorie" name="name" required error={state.errors?.name} />
        </div>
        <div className="min-w-56 flex-1">
          <Field label="Beschreibung" name="description" error={state.errors?.description} />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? 'Legt an…' : 'Anlegen'}
        </Button>
      </form>
    </section>
  );
}
