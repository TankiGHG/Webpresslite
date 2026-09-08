'use client';

import type { Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { LinkPopover } from './link-popover';
import { ToolbarButton } from './toolbar-button';

interface ToolbarItem {
  id: string;
  icon: LucideIcon;
  title: string;
  shortcut?: string;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

type ToolbarGroup = ToolbarItem[];

const GROUPS: ToolbarGroup[] = [
  [
    {
      id: 'undo',
      icon: Undo2,
      title: 'Rückgängig',
      shortcut: 'Strg+Z',
      isDisabled: (e) => !e.can().undo(),
      run: (e) => e.chain().focus().undo().run(),
    },
    {
      id: 'redo',
      icon: Redo2,
      title: 'Wiederholen',
      shortcut: 'Strg+Umschalt+Z',
      isDisabled: (e) => !e.can().redo(),
      run: (e) => e.chain().focus().redo().run(),
    },
  ],
  [
    {
      id: 'h2',
      icon: Heading2,
      title: 'Überschrift 2',
      shortcut: 'Strg+Alt+2',
      isActive: (e) => e.isActive('heading', { level: 2 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'h3',
      icon: Heading3,
      title: 'Überschrift 3',
      shortcut: 'Strg+Alt+3',
      isActive: (e) => e.isActive('heading', { level: 3 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ],
  [
    {
      id: 'bold',
      icon: Bold,
      title: 'Fett',
      shortcut: 'Strg+B',
      isActive: (e) => e.isActive('bold'),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      id: 'italic',
      icon: Italic,
      title: 'Kursiv',
      shortcut: 'Strg+I',
      isActive: (e) => e.isActive('italic'),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      id: 'strike',
      icon: Strikethrough,
      title: 'Durchgestrichen',
      shortcut: 'Strg+Umschalt+S',
      isActive: (e) => e.isActive('strike'),
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
  ],
  [
    {
      id: 'bullet',
      icon: List,
      title: 'Aufzählung',
      shortcut: 'Strg+Umschalt+8',
      isActive: (e) => e.isActive('bulletList'),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered',
      icon: ListOrdered,
      title: 'Nummerierte Liste',
      shortcut: 'Strg+Umschalt+7',
      isActive: (e) => e.isActive('orderedList'),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'quote',
      icon: Quote,
      title: 'Zitat',
      shortcut: 'Strg+Umschalt+B',
      isActive: (e) => e.isActive('blockquote'),
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'code',
      icon: Code,
      title: 'Code-Block',
      shortcut: 'Strg+Alt+C',
      isActive: (e) => e.isActive('codeBlock'),
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'rule',
      icon: Minus,
      title: 'Trennlinie',
      run: (e) => e.chain().focus().setHorizontalRule().run(),
    },
  ],
];

function ToolbarSeparator() {
  return <span aria-hidden className="bg-border mx-1 h-5 w-px shrink-0" />;
}

export function EditorToolbar({
  editor,
  onInsertImage,
  trailing,
}: {
  editor: Editor;
  onInsertImage?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-0.5 overflow-x-auto px-1 py-1"
      role="toolbar"
      aria-label="Formatierung"
    >
      {GROUPS.map((group, index) => (
        <div key={index} className="flex items-center gap-0.5">
          {index > 0 ? <ToolbarSeparator /> : null}
          {group.map((item) => {
            const Icon = item.icon;
            return (
              <ToolbarButton
                key={item.id}
                title={item.title}
                shortcut={item.shortcut}
                active={item.isActive?.(editor) ?? false}
                disabled={item.isDisabled?.(editor) ?? false}
                onClick={() => item.run(editor)}
              >
                <Icon className="size-4" />
              </ToolbarButton>
            );
          })}
        </div>
      ))}

      <ToolbarSeparator />

      <LinkPopover editor={editor} />

      {onInsertImage ? (
        <ToolbarButton title="Bild einfügen" onClick={onInsertImage} data-testid="insert-image">
          <ImageIcon className="size-4" />
        </ToolbarButton>
      ) : null}

      {trailing ? <div className="ml-auto flex items-center gap-1 pl-2">{trailing}</div> : null}
    </div>
  );
}
