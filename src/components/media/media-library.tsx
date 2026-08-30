'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { MediaGrid } from './media-grid';
import { UploadButton } from './upload-button';
import type { MediaItem } from '@/lib/db/queries/media';

export function MediaLibrary({ siteId, initial }: { siteId: string; initial: MediaItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);

  const handleDeleted = useCallback(
    (id: string) => {
      setItems((current) => current.filter((item) => item.id !== id));
      router.refresh();
    },
    [router],
  );

  return (
    <div className="space-y-8">
      <UploadButton
        siteId={siteId}
        onUploaded={(item) => {
          setItems((current) => [item, ...current]);
          // Keeps the server rendered list in step with what we just added.
          router.refresh();
        }}
      />

      <MediaGrid siteId={siteId} items={items} onDeleted={handleDeleted} />
    </div>
  );
}
