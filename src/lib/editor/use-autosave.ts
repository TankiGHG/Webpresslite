'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/**
 * Debounced autosave.
 *
 * Saves are serialised: while one is in flight, a further change is remembered
 * and written afterwards, so a fast typist cannot have two saves race and the
 * older one win.
 */
export function useAutosave<T>(save: (value: T) => Promise<void>, delayMs = 1500) {
  const [state, setState] = useState<SaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  /** Writes everything pending; resolves to whether it all went through. */
  const flush = useCallback((): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;
    if (!pending.current) return Promise.resolve(true);

    const run = (async () => {
      setState('saving');

      while (pending.current) {
        const { value } = pending.current;
        pending.current = null;

        try {
          await saveRef.current(value);
        } catch {
          setState('error');
          return false;
        }
      }

      setState('saved');
      return true;
    })();

    inFlight.current = run;
    void run.finally(() => {
      inFlight.current = null;
    });
    return run;
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      setState('dirty');

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delayMs);
    },
    [delayMs, flush],
  );

  /**
   * Skips the debounce. Without a value it only writes what is pending, so
   * callers can make sure nothing is left unsaved before acting on the server
   * copy — publishing, for instance.
   */
  const saveNow = useCallback(
    async (value?: T): Promise<boolean> => {
      if (value !== undefined) pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      // A save that is already running picks up anything pending itself, but
      // a change made in its very last moment could slip past; look again.
      if (inFlight.current) await inFlight.current;
      return flush();
    },
    [flush],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Warn before leaving with unsaved changes rather than losing them silently.
  useEffect(() => {
    if (state !== 'dirty' && state !== 'saving') return;

    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state]);

  return { state, schedule, saveNow };
}
