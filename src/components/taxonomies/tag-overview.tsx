'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { pruneTagsAction, type ActionState } from '@/lib/actions/taxonomies';
import type { TaxonomyWithCount } from '@/lib/db/queries/taxonomies';

export function TagOverview({ siteId, tags }: { siteId: string; tags: TaxonomyWithCount[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(pruneTagsAction, {});
  const unused = tags.filter((tag) => tag.postCount === 0).length;

  return (
    <section className="space-y-4">
      <h2 className="font-medium">Tags</h2>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Tags entstehen beim Schreiben: was im Beitrag eingetragen wird, wird angelegt.
      </p>

      {tags.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="no-tags">
          Noch keine Tags.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2" data-testid="tag-list">
          {tags.map((tag) => (
            <li
              key={tag.id}
              className="rounded-full border px-3 py-1 text-sm"
              data-count={tag.postCount}
            >
              {tag.name}{' '}
              <span className="text-xs text-[var(--color-muted-foreground)]">{tag.postCount}</span>
            </li>
          ))}
        </ul>
      )}

      {unused > 0 ? (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="siteId" value={siteId} />
          {state.formError ? <Alert>{state.formError}</Alert> : null}
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {pending ? 'Räumt auf…' : `${unused} ungenutzte Tags entfernen`}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
