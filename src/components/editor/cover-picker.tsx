'use client';

import { ImagePlus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MediaPicker } from '@/components/media/media-picker';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { setCoverAction } from '@/lib/actions/posts';
import type { MediaItem } from '@/lib/db/queries/media';

/** The cover is stored immediately on selection; there is nothing else to fill in. */
export function CoverPicker({
  siteId,
  postId,
  cover,
}: {
  siteId: string;
  postId: string;
  cover: MediaItem | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = (mediaId: string | null) => {
    setError(null);
    startTransition(async () => {
      const result = await setCoverAction({ siteId, postId, mediaId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {error ? <Alert>{error}</Alert> : null}

      {cover ? (
        <figure className="bg-muted overflow-hidden rounded-lg border">
          {/* Variant URL from our own storage; dimensions are known. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.urls.medium}
            alt={cover.alt ?? ''}
            width={cover.width ?? undefined}
            height={cover.height ?? undefined}
            className="aspect-[16/9] w-full object-cover"
            data-testid="cover-image"
          />
          <figcaption className="text-muted-foreground flex items-center justify-between gap-2 px-3 py-2 text-xs">
            <span className="truncate">{cover.alt || cover.fileName}</span>
            <span className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setOpen(true)}
              >
                Ändern
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-danger hover:text-danger"
                aria-label="Titelbild entfernen"
                disabled={pending}
                onClick={() => apply(null)}
              >
                <Trash2 />
              </Button>
            </span>
          </figcaption>
        </figure>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:border-primary/60 hover:bg-accent/40 hover:text-foreground focus-visible:ring-ring flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-sm transition-colors outline-none focus-visible:ring-[3px]"
        >
          <ImagePlus className="size-5" />
          <span>Titelbild wählen</span>
          <span className="text-xs">Erscheint in der Übersicht und beim Teilen.</span>
        </button>
      )}

      <MediaPicker
        siteId={siteId}
        open={open}
        title="Titelbild wählen"
        onClose={() => setOpen(false)}
        onSelect={(item: MediaItem) => apply(item.id)}
      />
    </div>
  );
}
