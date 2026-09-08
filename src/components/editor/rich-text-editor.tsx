'use client';

import Placeholder from '@tiptap/extension-placeholder';
import { BubbleMenu, EditorContent, useEditor, type Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorToolbar } from './toolbar';
import { ToolbarButton } from './toolbar-button';
import { MediaPicker } from '@/components/media/media-picker';
import { buildSrcSet, IMAGE_SIZES } from '@/lib/media/srcset';
import { editorExtensions } from '@/lib/editor/extensions';
import type { JSONContent } from '@/lib/editor/types';

export function RichTextEditor({
  initialContent,
  onChange,
  onReady,
  editable = true,
  siteId,
  placeholder = 'Schreib hier deinen Beitrag…',
  toolbarTrailing,
}: {
  initialContent: JSONContent;
  onChange: (content: JSONContent) => void;
  /** Hands the instance up once it exists, e.g. to focus it from the title. */
  onReady?: (editor: Editor) => void;
  editable?: boolean;
  siteId?: string;
  placeholder?: string;
  toolbarTrailing?: ReactNode;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // TipTap binds `onUpdate` once when the editor is created; later renders
  // only update the options object. Reading through a ref keeps the callback
  // current, so the parent never receives changes from a stale closure.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [...editorExtensions, Placeholder.configure({ placeholder })],
    content: initialContent,
    editable,
    // The editor is only ever rendered in the browser; rendering it on the
    // server first causes a hydration mismatch.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose-editor editor-surface focus:outline-none',
        'aria-label': 'Beitragsinhalt',
      },
    },
    onUpdate: ({ editor: instance }) => onChangeRef.current(instance.getJSON() as JSONContent),
  });

  useEffect(() => {
    // Without the second argument TipTap emits `update` here, which would mark
    // a freshly opened post as unsaved before anyone has typed.
    editor?.setEditable(editable, false);
  }, [editor, editable]);

  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

  if (!editor) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="bg-muted/60 h-10 rounded-lg" />
        <div className="min-h-[60vh] space-y-3 pt-2">
          <div className="bg-muted/60 h-4 w-11/12 rounded" />
          <div className="bg-muted/60 h-4 w-9/12 rounded" />
          <div className="bg-muted/60 h-4 w-10/12 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-card/95 sticky top-14 z-20 -mx-1 mb-6 rounded-lg border shadow-xs backdrop-blur">
        <EditorToolbar
          editor={editor}
          onInsertImage={siteId ? () => setPickerOpen(true) : undefined}
          trailing={toolbarTrailing}
        />
      </div>

      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 120, placement: 'top' }}
        shouldShow={({ editor: instance, from, to }) =>
          from !== to && !instance.isActive('image') && !instance.isActive('codeBlock')
        }
      >
        <div className="bg-card flex items-center gap-0.5 rounded-lg border p-1 shadow-[var(--shadow-float)]">
          <ToolbarButton
            title="Fett"
            shortcut="Strg+B"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Kursiv"
            shortcut="Strg+I"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Durchgestrichen"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="size-4" />
          </ToolbarButton>
        </div>
      </BubbleMenu>

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
