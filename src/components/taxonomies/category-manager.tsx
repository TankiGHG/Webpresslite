'use client';

import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import { useActionState } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
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
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="categoryId" value={category.id} />
      {state.formError ? <span className="text-danger text-xs">{state.formError}</span> : null}
      <Button
        type="submit"
        size="icon-sm"
        variant="ghost"
        className="text-muted-foreground hover:text-danger"
        aria-label={`Kategorie ${category.name} löschen`}
        loading={pending}
      >
        {pending ? null : <Trash2 />}
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
    <Card>
      <CardHeader>
        <CardTitle>Kategorien</CardTitle>
        <CardDescription>
          Jeder Beitrag gehört in höchstens eine Kategorie. Leere Kategorien bleiben auf der Site
          unsichtbar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {categories.length === 0 ? (
          <EmptyState
            compact
            icon={FolderOpen}
            title="Noch keine Kategorien"
            description="Leg unten die erste an, zum Beispiel „Reisen“ oder „Rezepte“."
            data-testid="no-categories"
          />
        ) : (
          <ul className="divide-y rounded-lg border" data-testid="category-list">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{category.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {category.description ? <>{category.description} · </> : null}
                    <span className="font-mono">/kategorie/{category.slug}</span>
                  </p>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {category.postCount} {category.postCount === 1 ? 'Beitrag' : 'Beiträge'}
                </span>
                <DeleteCategory siteId={siteId} category={category} />
              </li>
            ))}
          </ul>
        )}

        <form action={formAction} className="space-y-3 border-t pt-5">
          <input type="hidden" name="siteId" value={siteId} />
          {state.formError ? <Alert>{state.formError}</Alert> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Neue Kategorie"
              name="name"
              required
              placeholder="z. B. Reisen"
              error={state.errors?.name}
            />
            <Field
              label="Beschreibung"
              name="description"
              placeholder="Optional, erscheint im Archiv"
              error={state.errors?.description}
            />
          </div>

          <Button type="submit" loading={pending}>
            {pending ? null : <Plus />}
            {pending ? 'Legt an…' : 'Anlegen'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
