'use client';

import { useActionState } from 'react';
import { CountedField } from './char-count';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { savePostSettingsAction, type ActionState } from '@/lib/actions/posts';

export function PostSettingsForm({
  siteId,
  postId,
  slug,
  pathPrefix,
  excerpt,
  seoTitle,
  seoDescription,
}: {
  siteId: string;
  postId: string;
  slug: string;
  /** Shown before the slug so the author sees the resulting path. */
  pathPrefix: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    savePostSettingsAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="postId" value={postId} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}

      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <div className="flex items-stretch">
          <span className="border-input bg-muted text-muted-foreground inline-flex items-center rounded-l-md border border-r-0 px-2.5 font-mono text-xs">
            {pathPrefix}
          </span>
          <Input
            id="slug"
            name="slug"
            defaultValue={slug}
            className="rounded-l-none font-mono"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={state.errors?.slug ? true : undefined}
            aria-describedby={state.errors?.slug ? 'slug-error' : undefined}
            disabled={pending}
          />
        </div>
        {state.errors?.slug ? (
          <p id="slug-error" className="text-danger text-sm">
            {state.errors.slug}
          </p>
        ) : null}
      </div>

      <CountedField
        label="Auszug"
        name="excerpt"
        max={300}
        multiline
        defaultValue={excerpt}
        hint="Leer lassen, dann wird der Anfang des Textes verwendet."
        error={state.errors?.excerpt}
        disabled={pending}
      />

      <CountedField
        label="SEO-Titel"
        name="seoTitle"
        max={70}
        defaultValue={seoTitle}
        error={state.errors?.seoTitle}
        disabled={pending}
      />

      <CountedField
        label="SEO-Beschreibung"
        name="seoDescription"
        max={160}
        multiline
        defaultValue={seoDescription}
        error={state.errors?.seoDescription}
        disabled={pending}
      />

      <Button type="submit" size="sm" variant="outline" loading={pending}>
        {pending ? 'Wird gespeichert…' : 'Einstellungen speichern'}
      </Button>
    </form>
  );
}
