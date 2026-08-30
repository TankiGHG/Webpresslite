'use client';

import { useActionState } from 'react';
import { Field } from '@/components/auth/field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { savePostSettingsAction, type ActionState } from '@/lib/actions/posts';

export function PostSettingsForm({
  siteId,
  postId,
  slug,
  excerpt,
  seoTitle,
  seoDescription,
}: {
  siteId: string;
  postId: string;
  slug: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    savePostSettingsAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <h2 className="font-medium">Einstellungen</h2>

      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="postId" value={postId} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}

      <Field
        label="Slug"
        name="slug"
        defaultValue={slug}
        error={state.errors?.slug}
        disabled={pending}
      />
      <Field
        label="Auszug"
        name="excerpt"
        defaultValue={excerpt}
        error={state.errors?.excerpt}
        disabled={pending}
      />
      <Field
        label="SEO-Titel"
        name="seoTitle"
        defaultValue={seoTitle}
        error={state.errors?.seoTitle}
        disabled={pending}
      />
      <Field
        label="SEO-Beschreibung"
        name="seoDescription"
        defaultValue={seoDescription}
        error={state.errors?.seoDescription}
        disabled={pending}
      />

      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Wird gespeichert…' : 'Einstellungen speichern'}
      </Button>
    </form>
  );
}
