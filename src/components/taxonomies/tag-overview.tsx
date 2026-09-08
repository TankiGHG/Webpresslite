'use client';

import { Sparkles, Tags } from 'lucide-react';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { pruneTagsAction, type ActionState } from '@/lib/actions/taxonomies';
import type { TaxonomyWithCount } from '@/lib/db/queries/taxonomies';
import { cn } from '@/lib/utils';

export function TagOverview({ siteId, tags }: { siteId: string; tags: TaxonomyWithCount[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(pruneTagsAction, {});
  const unused = tags.filter((tag) => tag.postCount === 0).length;

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Tags</CardTitle>
        <CardDescription>
          Entstehen beim Schreiben — was du im Beitrag einträgst, wird angelegt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tags.length === 0 ? (
          <EmptyState
            compact
            icon={Tags}
            title="Noch keine Tags"
            description="Trag im Editor unter „Einordnung“ ein paar Stichwörter ein."
            data-testid="no-tags"
          />
        ) : (
          <ul className="flex flex-wrap gap-2" data-testid="tag-list">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm',
                  tag.postCount === 0 && 'text-muted-foreground border-dashed',
                )}
                data-count={tag.postCount}
              >
                {tag.name}
                <span className="text-muted-foreground text-xs tabular-nums">{tag.postCount}</span>
              </li>
            ))}
          </ul>
        )}

        {unused > 0 ? (
          <form action={formAction} className="space-y-2 border-t pt-4">
            <input type="hidden" name="siteId" value={siteId} />
            {state.formError ? <Alert>{state.formError}</Alert> : null}
            <p className="text-muted-foreground text-xs">
              Gestrichelte Tags hängen an keinem Beitrag mehr.
            </p>
            <Button type="submit" size="sm" variant="outline" loading={pending}>
              {pending ? null : <Sparkles />}
              {pending
                ? 'Räumt auf…'
                : `${unused} ${unused === 1 ? 'ungenutzten Tag' : 'ungenutzte Tags'} entfernen`}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
