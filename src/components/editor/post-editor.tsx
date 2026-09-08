'use client';

import type { Editor } from '@tiptap/react';
import { ArrowLeft, Check, CloudOff, Eye, Loader2, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { RichTextEditor } from './rich-text-editor';
import { LogoMark } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { savePostAction } from '@/lib/actions/posts';
import { useAutosave, type SaveState } from '@/lib/editor/use-autosave';
import type { JSONContent } from '@/lib/editor/types';
import { countWords, readingMinutes } from '@/lib/format';
import { POST_TYPE_LABELS, type PostType } from '@/lib/posts/constants';
import { cn } from '@/lib/utils';

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

/** Word count straight from the document; avoids re-rendering HTML on every key. */
function wordsIn(content: JSONContent): number {
  let text = '';
  const walk = (node: JSONContent) => {
    if (typeof node.text === 'string') text += `${node.text} `;
    node.content?.forEach(walk);
  };
  walk(content);
  return countWords(text);
}

function SaveIndicator({ state }: { state: SaveState }) {
  const icon =
    state === 'saving' ? (
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
    ) : state === 'saved' ? (
      <Check className="text-success size-3.5" aria-hidden />
    ) : state === 'error' ? (
      <CloudOff className="text-danger size-3.5" aria-hidden />
    ) : null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs',
        state === 'error' ? 'text-danger' : 'text-muted-foreground',
      )}
      role="status"
    >
      {icon}
      <span data-testid="save-state">{SAVE_LABELS[state]}</span>
    </span>
  );
}

export function PostEditor({
  siteId,
  postId,
  type,
  siteName,
  backHref,
  previewHref,
  initialTitle,
  initialContent,
  aside,
}: {
  siteId: string;
  postId: string;
  type: PostType;
  siteName: string;
  backHref: string;
  previewHref: string;
  initialTitle: string;
  initialContent: JSONContent;
  /** Publish, taxonomy and settings panels, rendered on the server. */
  aside: ReactNode;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [words, setWords] = useState(() => wordsIn(initialContent));
  const editorRef = useRef<Editor | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  // The latest draft lives in a ref: keyboard shortcuts, editor callbacks and
  // the submit guard below all read it without depending on render timing.
  const draft = useRef<Draft>({ title: initialTitle, content: initialContent });

  const save = useCallback(
    async (draft: Draft) => {
      const result = await savePostAction({
        siteId,
        postId,
        title: draft.title,
        contentJson: JSON.stringify(draft.content),
      });
      if (!result.ok) throw new Error(result.error);
    },
    [siteId, postId],
  );

  const { state, schedule, saveNow } = useAutosave<Draft>(save);
  const unsaved = state === 'dirty' || state === 'saving';
  const unsavedRef = useRef(unsaved);

  useEffect(() => {
    unsavedRef.current = unsaved;
  }, [unsaved]);

  // Ctrl/Cmd+S saves immediately instead of opening the browser's dialog.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveNow(draft.current);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveNow]);

  // Client-side navigation skips `beforeunload`, so the links out of the
  // editor wait for pending text themselves instead of dropping it.
  const leaveAfterSave = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      if (!unsavedRef.current || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      void saveNow().then((ok) => {
        if (ok) router.push(href);
      });
    },
    [router, saveNow],
  );

  // Every form in the side panel acts on the server copy of the post, so
  // pending text is written first. Otherwise "Jetzt veröffentlichen" right
  // after typing would publish the previous version — and look like it worked.
  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;

    let resubmitting = false;
    const handler = (event: SubmitEvent) => {
      if (resubmitting || !unsavedRef.current) return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      event.preventDefault();
      event.stopPropagation();
      const submitter = event.submitter instanceof HTMLElement ? event.submitter : undefined;

      void saveNow().then((ok) => {
        // A failed save shows its own message; publishing on top of it would
        // ship stale content.
        if (!ok) return;
        resubmitting = true;
        try {
          form.requestSubmit(submitter);
        } finally {
          resubmitting = false;
        }
      });
    };

    // Capture phase, so React's own submit handling further up never sees the
    // first attempt.
    aside.addEventListener('submit', handler, true);
    return () => aside.removeEventListener('submit', handler, true);
  }, [saveNow]);

  // A fresh post already has its title; the cursor belongs in the text.
  const handleReady = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      if (wordsIn(initialContent) === 0) editor.commands.focus('end');
    },
    [initialContent],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon" aria-label="Zurück zur Übersicht">
                <Link href={backHref} onClick={(event) => leaveAfterSave(event, backHref)}>
                  <ArrowLeft />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zurück zur Übersicht</TooltipContent>
          </Tooltip>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/dashboard"
              aria-label="Zum Dashboard"
              className="focus-visible:ring-ring rounded-md outline-none focus-visible:ring-[3px]"
            >
              <LogoMark className="size-6" />
            </Link>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-muted-foreground max-w-40 truncate text-sm" title={siteName}>
              {siteName}
            </span>
            <Badge variant="outline">{POST_TYPE_LABELS[type]}</Badge>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <SaveIndicator state={state} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void saveNow(draft.current)}
                >
                  Jetzt speichern
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span className="flex items-center gap-2">
                  Speichern{' '}
                  <Kbd className="border-background/30 bg-background/15 text-background">
                    Strg+S
                  </Kbd>
                </span>
              </TooltipContent>
            </Tooltip>
            <Button asChild variant="outline" size="sm">
              <Link
                href={previewHref}
                data-testid="preview-link"
                onClick={(event) => leaveAfterSave(event, previewHref)}
              >
                <Eye />
                <span className="hidden sm:inline">Vorschau</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Einstellungen"
            >
              <a href="#einstellungen">
                <SlidersHorizontal />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[46rem] px-5 pt-10 pb-24 sm:px-8">
            <textarea
              name="title"
              aria-label="Titel"
              rows={1}
              value={title}
              placeholder="Titel"
              className="editor-title placeholder:text-muted-foreground/50 mb-6 w-full bg-transparent text-3xl leading-tight font-semibold tracking-tight outline-none sm:text-4xl"
              onChange={(event) => {
                setTitle(event.target.value);
                draft.current = { ...draft.current, title: event.target.value };
                schedule(draft.current);
              }}
              onKeyDown={(event) => {
                // Enter moves on to the text; a title has no line breaks.
                if (event.key === 'Enter') {
                  event.preventDefault();
                  editorRef.current?.commands.focus('start');
                }
              }}
            />

            <RichTextEditor
              siteId={siteId}
              initialContent={initialContent}
              onReady={handleReady}
              placeholder={
                type === 'page'
                  ? 'Was soll auf dieser Seite stehen?'
                  : 'Schreib hier deinen Beitrag…'
              }
              onChange={(next) => {
                setWords(wordsIn(next));
                draft.current = { ...draft.current, content: next };
                schedule(draft.current);
              }}
            />

            <p className="text-muted-foreground mt-10 border-t pt-4 text-xs tabular-nums">
              {words} {words === 1 ? 'Wort' : 'Wörter'} · etwa {readingMinutes(words)} Min. Lesezeit
            </p>
          </div>
        </div>

        <aside
          ref={asideRef}
          id="einstellungen"
          className="app-scroll bg-card border-t lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:w-[21rem] lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-l"
          aria-label="Beitragseinstellungen"
        >
          {aside}
        </aside>
      </div>
    </div>
  );
}
