'use client';

import { useCallback, useState } from 'react';
import { completeUploadAction, requestUploadAction } from '@/lib/actions/media';
import { validateUpload } from '@/lib/media/constants';
import type { MediaItem } from '@/lib/db/queries/media';

export type UploadStatus =
  | { state: 'idle' }
  | { state: 'uploading'; fileName: string }
  | { state: 'processing'; fileName: string }
  | { state: 'error'; message: string };

/**
 * Three step upload: ask the server for a presigned URL, PUT the bytes straight
 * to storage, then tell the server to generate the variants. The file never
 * passes through the application server.
 */
export function useUpload(siteId: string, onUploaded: (item: MediaItem) => void) {
  const [status, setStatus] = useState<UploadStatus>({ state: 'idle' });

  const upload = useCallback(
    async (file: File) => {
      // The same rule the server enforces, checked here to fail fast.
      const rejection = validateUpload({ mimeType: file.type, size: file.size });
      if (rejection) {
        setStatus({ state: 'error', message: rejection.reason });
        return;
      }

      setStatus({ state: 'uploading', fileName: file.name });

      const ticket = await requestUploadAction({
        siteId,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });

      if (!ticket.ok) {
        setStatus({ state: 'error', message: ticket.error });
        return;
      }

      const response = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'content-type': file.type },
      });

      if (!response.ok) {
        setStatus({ state: 'error', message: 'Der Upload wurde vom Speicher abgelehnt.' });
        return;
      }

      setStatus({ state: 'processing', fileName: file.name });

      const result = await completeUploadAction({ siteId, mediaId: ticket.mediaId });

      if (!result.ok) {
        setStatus({ state: 'error', message: result.error });
        return;
      }

      setStatus({ state: 'idle' });
      onUploaded(result.media);
    },
    [siteId, onUploaded],
  );

  return { status, upload, reset: () => setStatus({ state: 'idle' }) };
}
