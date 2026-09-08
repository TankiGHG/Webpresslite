'use client';

import type { Editor } from '@tiptap/react';
import { Link2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ToolbarButton } from './toolbar-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Accepts bare domains too; the link extension only allows http(s) and mailto. */
function normalizeHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^(https?:\/\/|mailto:)/i.test(value)) return value;
  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) return `mailto:${value}`;
  return `https://${value}`;
}

export function LinkPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState('');
  const active = editor.isActive('link');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = normalizeHref(href);
    if (!next) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: next }).run();
    }
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const current = editor.getAttributes('link').href;
          setHref(typeof current === 'string' ? current : '');
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <ToolbarButton title="Link" active={active}>
          <Link2 className="size-4" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        onOpenAutoFocus={(event) => {
          // Focus the field directly; Radix would otherwise focus the wrapper.
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.querySelector('input')?.focus();
        }}
      >
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="link-href">Link-Adresse</Label>
            <Input
              id="link-href"
              name="href"
              type="text"
              inputMode="url"
              autoComplete="off"
              placeholder="https://…"
              value={href}
              onChange={(event) => setHref(event.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            {active ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger"
                onClick={() => {
                  editor.chain().focus().extendMarkRange('link').unsetLink().run();
                  setOpen(false);
                }}
              >
                Entfernen
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm">
              Übernehmen
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
