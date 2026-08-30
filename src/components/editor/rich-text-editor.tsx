'use client';

import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { EditorToolbar } from './toolbar';
import { MediaPicker } from '@/components/media/media-picker';
import { buildSrcSet, IMAGE_SIZES } from '@/lib/media/srcset';
import { editorExtensions } from '@/lib/editor/extensions';
import type { JSONContent } from '@/lib/editor/types';

export function RichTextEditor({
  initialContent,
  onChange,
  editable = true,
  siteId,
}: {
  initialContent: JSONContent;
  onChange: (content: JSONContent) => void;
  editable?: boolean;
  siteId?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      ...editorExtensions,
      Placeholder.configure({ placeholder: 'Schreib hier deinen Beitrag…' }),
    ],
    content: initialContent,
    editable,
    // The editor is only ever rendered in the browser; rendering it on the
    // server first causes a hydration mismatch.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose-editor min-h-80 px-4 py-3 focus:outline-none',
        'aria-label': 'Beitragsinhalt',
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getJSON() as JSONContent),
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) {
    return <div className="min-h-96 rounded-lg border" aria-busy="true" />;
  }

  return (
    <div className="rounded-lg border">
      <EditorToolbar
        editor={editor}
        onInsertImage={siteId ? () => setPickerOpen(true) : undefined}
      />
      <EditorContent editor={editor} />

      {siteId ? (
        <MediaPicker
          siteId={siteId}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            // The extension adds srcset/sizes/width/height, but TipTap's
            // published `setImage` signature only knows src/alt/title.
            const attributes = {
              src: item.urls.medium,
              alt: item.alt ?? '',
              srcset: buildSrcSet(item),
              sizes: IMAGE_SIZES,
              width: item.width,
              height: item.height,
            };

            editor.chain().focus().setImage(attributes).run();
          }}
        />
      ) : null}
    </div>
  );
}
