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
  const inFlight = useRef(false);
  const pending = useRef<{ value: T } | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(async () => {
    if (inFlight.current || !pending.current) return;

    inFlight.current = true;
    setState('saving');

    while (pending.current) {
      const { value } = pending.current;
      pending.current = null;

      try {
        await saveRef.current(value);
      } catch {
        inFlight.current = false;
        setState('error');
        return;
      }
    }

    inFlight.current = false;
    setState('saved');
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

  const saveNow = useCallback(
    async (value?: T) => {
      if (value !== undefined) pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      await flush();
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
