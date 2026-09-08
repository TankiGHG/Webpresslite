import type { ReactNode } from 'react';

/** The editor and its preview run without the site sidebar: writing needs room. */
export default function EditorLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh">{children}</div>;
}
