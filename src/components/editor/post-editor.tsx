'use client';

import { useCallback, useState } from 'react';
import { RichTextEditor } from './rich-text-editor';
import { Input } from '@/components/ui/input';
import { savePostAction } from '@/lib/actions/posts';
import { useAutosave, type SaveState } from '@/lib/editor/use-autosave';
import type { JSONContent } from '@/lib/editor/types';

const SAVE_LABELS: Record<SaveState, string> = {
  idle: 'Keine Änderungen',
  dirty: 'Nicht gespeichert',
  saving: 'Wird gespeichert…',
  saved: 'Gespeichert',
  error: 'Speichern fehlgeschlagen',
};

interface Draft {
  title: string;
  content: JSONContent;
}

export function PostEditor({
  siteId,
  postId,
  initialTitle,
  initialContent,
}: {
  siteId: string;
  postId: string;
  initialTitle: string;
  initialContent: JSONContent;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  const save = useCallback(
    async (draft: Draft) => {
      const result = await savePostAction({
        siteId,
        postId,
        title: draft.title,
        content: draft.content,
      });
      if (!result.ok) throw new Error(result.error);
    },
    [siteId, postId],
  );

  const { state, schedule, saveNow } = useAutosave<Draft>(save);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <label className="flex-1">
          <span className="sr-only">Titel</span>
          <Input
            name="title"
            aria-label="Titel"
            value={title}
            placeholder="Titel"
            className="h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
            onChange={(event) => {
              setTitle(event.target.value);
              schedule({ title: event.target.value, content });
            }}
          />
        </label>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className="text-xs text-[var(--color-muted-foreground)]"
            data-testid="save-state"
            role="status"
          >
            {SAVE_LABELS[state]}
          </span>
          <button
            type="button"
            className="text-sm underline underline-offset-4"
            onClick={() => void saveNow({ title, content })}
          >
            Jetzt speichern
          </button>
        </div>
      </div>

      <RichTextEditor
        initialContent={initialContent}
        onChange={(next) => {
          setContent(next);
          schedule({ title, content: next });
        }}
      />
    </div>
  );
}
