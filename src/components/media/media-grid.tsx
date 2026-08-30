'use client';

import { useActionState, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteMediaAction, updateAltAction, type ActionState } from '@/lib/actions/media';
import { formatBytes } from '@/lib/media/constants';
import type { MediaItem } from '@/lib/db/queries/media';

function AltForm({ siteId, item }: { siteId: string; item: MediaItem }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateAltAction, {});

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="mediaId" value={item.id} />

      <div className="space-y-1">
        <Label htmlFor={`alt-${item.id}`} className="text-xs">
          Alt-Text
        </Label>
        <Input
          id={`alt-${item.id}`}
          name="alt"
          defaultValue={item.alt ?? ''}
          placeholder="Was ist auf dem Bild zu sehen?"
          aria-invalid={state.errors?.alt ? true : undefined}
        />
      </div>

      {state.errors?.alt ? <p className="text-xs text-red-700">{state.errors.alt}</p> : null}
      {state.saved ? (
        <p className="text-xs text-green-700" role="status">
          Gespeichert.
        </p>
      ) : null}

      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Speichert…' : 'Alt-Text speichern'}
      </Button>
    </form>
  );
}

function DeleteForm({
  siteId,
  item,
  onDeleted,
}: {
  siteId: string;
  item: MediaItem;
  onDeleted: (id: string) => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteMediaAction, {});
  const [confirming, setConfirming] = useState(false);

  // The server revalidates its own render; the list held in client state has
  // to drop the entry too, otherwise a deleted image lingers until a reload.
  useEffect(() => {
    if (state.saved) onDeleted(item.id);
  }, [state.saved, item.id, onDeleted]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="mediaId" value={item.id} />

      {state.formError ? <Alert>{state.formError}</Alert> : null}

      {confirming ? (
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Löscht…' : 'Wirklich löschen'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Abbrechen
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          Löschen
        </Button>
      )}
    </form>
  );
}

export function MediaGrid({
  siteId,
  items,
  onDeleted,
}: {
  siteId: string;
  items: MediaItem[];
  onDeleted: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="no-media">
        Noch keine Bilder hochgeladen.
      </p>
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2" data-testid="media-grid">
      {items.map((item) => (
        <li key={item.id} className="space-y-3 rounded-lg border p-4" data-media-id={item.id}>
          {/* Variants come from our own storage; next/image would add a second
              resizing step on top of the ones sharp already produced. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.urls.thumb}
            alt={item.alt ?? ''}
            width={item.width ?? undefined}
            height={item.height ?? undefined}
            loading="lazy"
            className="h-40 w-full rounded border object-contain"
          />

          <div className="text-xs text-[var(--color-muted-foreground)]">
            <p className="truncate font-medium text-[var(--color-foreground)]">{item.fileName}</p>
            <p>
              {item.width}×{item.height} · {formatBytes(item.size)} · {item.mime}
            </p>
          </div>

          <AltForm siteId={siteId} item={item} />
          <DeleteForm siteId={siteId} item={item} onDeleted={onDeleted} />
        </li>
      ))}
    </ul>
  );
}
