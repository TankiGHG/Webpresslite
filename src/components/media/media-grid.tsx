'use client';

import { ImageIcon, Trash2 } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
        <div className="flex gap-2">
          <Input
            id={`alt-${item.id}`}
            name="alt"
            defaultValue={item.alt ?? ''}
            placeholder="Was ist auf dem Bild zu sehen?"
            aria-invalid={state.errors?.alt ? true : undefined}
            className="h-8 text-sm"
          />
          <Button type="submit" size="sm" variant="outline" loading={pending}>
            {pending ? 'Speichert…' : 'Alt-Text speichern'}
          </Button>
        </div>
      </div>

      {state.errors?.alt ? <p className="text-danger text-xs">{state.errors.alt}</p> : null}
      {state.saved ? (
        <p className="text-success text-xs" role="status">
          Gespeichert.
        </p>
      ) : null}
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
        <div className="bg-danger-soft flex items-center gap-2 rounded-lg px-3 py-2">
          <span className="text-danger text-xs">Das Bild verschwindet auch aus Beiträgen.</span>
          <Button type="submit" size="sm" variant="danger" loading={pending} className="ml-auto">
            {pending ? 'Löscht…' : 'Wirklich löschen'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Abbrechen
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-danger hover:text-danger"
          onClick={() => setConfirming(true)}
        >
          <Trash2 />
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
      <EmptyState
        icon={ImageIcon}
        title="Noch keine Bilder"
        description="Lade oben ein Bild hoch — du kannst es danach in jeden Beitrag einfügen oder als Titelbild wählen."
        data-testid="no-media"
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="media-grid">
      {items.map((item) => (
        <li
          key={item.id}
          className="bg-card flex flex-col overflow-hidden rounded-xl border shadow-[var(--shadow-card)]"
          data-media-id={item.id}
        >
          <div className="bg-muted grid aspect-[4/3] place-items-center">
            {/* Variants come from our own storage; next/image would add a second
                resizing step on top of the ones sharp already produced. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.urls.thumb}
              alt={item.alt ?? ''}
              width={item.width ?? undefined}
              height={item.height ?? undefined}
              loading="lazy"
              className="size-full object-contain"
            />
          </div>

          <div className="space-y-3 p-4">
            <div className="text-muted-foreground text-xs">
              <p className="text-foreground truncate font-medium" title={item.fileName}>
                {item.fileName}
              </p>
              <p className="tabular-nums">
                {item.width}×{item.height} · {formatBytes(item.size)} · {item.mime}
              </p>
            </div>

            <AltForm siteId={siteId} item={item} />
            <DeleteForm siteId={siteId} item={item} onDeleted={onDeleted} />
          </div>
        </li>
      ))}
    </ul>
  );
}
