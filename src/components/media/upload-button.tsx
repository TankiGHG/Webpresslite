'use client';

import { useRef } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useUpload } from './use-upload';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, formatBytes } from '@/lib/media/constants';
import type { MediaItem } from '@/lib/db/queries/media';

export function UploadButton({
  siteId,
  onUploaded,
  label = 'Bild hochladen',
}: {
  siteId: string;
  onUploaded: (item: MediaItem) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { status, upload } = useUpload(siteId, onUploaded);
  const busy = status.state === 'uploading' || status.state === 'processing';

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(',')}
        className="sr-only"
        aria-label={label}
        data-testid="media-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />

      <div className="flex items-center gap-3">
        <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
          {status.state === 'uploading'
            ? 'Wird hochgeladen…'
            : status.state === 'processing'
              ? 'Wird verarbeitet…'
              : label}
        </Button>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          JPEG, PNG, WebP, AVIF oder GIF, bis {formatBytes(MAX_UPLOAD_BYTES)}
        </span>
      </div>

      {status.state === 'error' ? (
        <Alert>
          <span data-testid="upload-error">{status.message}</span>
        </Alert>
      ) : null}

      <p className="sr-only" role="status">
        {busy ? `${status.fileName} wird verarbeitet` : ''}
      </p>
    </div>
  );
}
