'use client';

import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect } from 'react';
import { EditorToolbar } from './toolbar';
import { editorExtensions } from '@/lib/editor/extensions';
import type { JSONContent } from '@/lib/editor/types';

export function RichTextEditor({
  initialContent,
  onChange,
  editable = true,
}: {
  initialContent: JSONContent;
  onChange: (content: JSONContent) => void;
  editable?: boolean;
}) {
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
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
