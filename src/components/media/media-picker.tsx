'use client';

import { ImageIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { UploadButton } from './upload-button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { listMediaAction } from '@/lib/actions/media';
import { formatBytes } from '@/lib/media/constants';
import type { MediaItem } from '@/lib/db/queries/media';

export function MediaPicker({
  siteId,
  open,
  onClose,
  onSelect,
  title = 'Bild einfügen',
}: {
  siteId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
  title?: string;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const result = await listMediaAction(siteId);
    setItems(result.ok ? result.media : []);
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent size="xl" aria-label="Medienbibliothek" data-testid="media-picker">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Aus der Bibliothek wählen oder ein neues Bild hochladen.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="pb-6">
          <div className="mb-5">
            <UploadButton
              siteId={siteId}
              label="Neues Bild hochladen"
              variant="outline"
              onUploaded={(item) => {
                setItems((current) => [item, ...current]);
                onSelect(item);
                onClose();
              }}
            />
          </div>

          {loading ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" aria-busy="true">
              {Array.from({ length: 8 }, (_, index) => (
                <li key={index} className="bg-muted/60 aspect-square rounded-lg" />
              ))}
            </ul>
          ) : items.length === 0 ? (
            <EmptyState
              compact
              icon={ImageIcon}
              title="Die Bibliothek ist noch leer"
              description="Lade ein Bild hoch – es wird direkt eingefügt."
              data-testid="picker-empty"
            />
          ) : (
            <ul
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
              data-testid="picker-grid"
            >
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    data-testid="picker-item"
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="group bg-card hover:border-primary/60 focus-visible:ring-ring w-full overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow] outline-none hover:shadow-xs focus-visible:ring-[3px]"
                  >
                    <span className="bg-muted block aspect-square overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.urls.thumb}
                        alt={item.alt ?? ''}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </span>
                    <span className="block px-2.5 py-2">
                      <span className="block truncate text-xs font-medium">{item.fileName}</span>
                      <span className="text-muted-foreground block text-[0.6875rem]">
                        {item.width && item.height ? `${item.width} × ${item.height} · ` : ''}
                        {formatBytes(item.size)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
