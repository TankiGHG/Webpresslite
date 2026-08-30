'use client';

import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface ToolbarButton {
  label: string;
  title: string;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

const BUTTONS: ToolbarButton[] = [
  {
    label: 'H2',
    title: 'Überschrift 2',
    isActive: (e) => e.isActive('heading', { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: 'H3',
    title: 'Überschrift 3',
    isActive: (e) => e.isActive('heading', { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: 'B',
    title: 'Fett',
    isActive: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    label: 'I',
    title: 'Kursiv',
    isActive: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    label: '„“',
    title: 'Zitat',
    isActive: (e) => e.isActive('blockquote'),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    label: '•',
    title: 'Aufzählung',
    isActive: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: '1.',
    title: 'Nummerierte Liste',
    isActive: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: '</>',
    title: 'Code-Block',
    isActive: (e) => e.isActive('codeBlock'),
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
];

export function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap gap-1 border-b p-2" role="toolbar" aria-label="Formatierung">
      {BUTTONS.map((button) => {
        const active = button.isActive(editor);
        return (
          <button
            key={button.label}
            type="button"
            title={button.title}
            aria-label={button.title}
            aria-pressed={active}
            onClick={() => button.run(editor)}
            className={cn(
              'h-8 min-w-8 rounded px-2 text-sm font-medium transition-colors',
              active
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : 'hover:bg-[var(--color-muted)]',
            )}
          >
            {button.label}
          </button>
        );
      })}

      <button
        type="button"
        title="Link setzen"
        aria-label="Link setzen"
        onClick={() => {
          const previous = editor.getAttributes('link').href as string | undefined;
          const href = window.prompt('Link-Adresse', previous ?? 'https://');
          if (href === null) return;
          if (href === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
        }}
        className={cn(
          'h-8 rounded px-2 text-sm font-medium transition-colors',
          editor.isActive('link')
            ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
            : 'hover:bg-[var(--color-muted)]',
        )}
      >
        Link
      </button>
    </div>
  );
}
