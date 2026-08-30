'use client';

import { useCallback, useEffect, useState } from 'react';
import { UploadButton } from './upload-button';
import { Button } from '@/components/ui/button';
import { listMediaAction } from '@/lib/actions/media';
import { formatBytes } from '@/lib/media/constants';
import type { MediaItem } from '@/lib/db/queries/media';

export function MediaPicker({
  siteId,
  open,
  onClose,
  onSelect,
}: {
  siteId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
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

  // Escape closes the dialog, as a dialog is expected to.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Medienbibliothek"
        data-testid="media-picker"
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg border bg-[var(--color-background)] p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Bild einfügen</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Aus der Bibliothek wählen oder ein neues Bild hochladen.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Schließen
          </Button>
        </div>

        <div className="mb-6">
          <UploadButton
            siteId={siteId}
            label="Neues Bild hochladen"
            onUploaded={(item) => {
              setItems((current) => [item, ...current]);
              onSelect(item);
              onClose();
            }}
          />
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Wird geladen…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]" data-testid="picker-empty">
            Die Bibliothek ist noch leer.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="picker-grid">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  data-testid="picker-item"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="w-full rounded border p-2 text-left transition-colors hover:bg-[var(--color-muted)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.urls.thumb}
                    alt={item.alt ?? ''}
                    loading="lazy"
                    className="h-24 w-full rounded object-contain"
                  />
                  <span className="mt-1 block truncate text-xs">{item.fileName}</span>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">
                    {formatBytes(item.size)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
