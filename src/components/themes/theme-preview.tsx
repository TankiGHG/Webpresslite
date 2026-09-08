import type { CSSProperties } from 'react';
import { FONT_STACKS, type ThemeDefinition } from '@/lib/themes/definitions';

/**
 * A miniature of the public site drawn from the theme's own tokens, so the
 * card shows what the reader will get rather than a stock thumbnail.
 */
export function ThemePreview({ theme }: { theme: ThemeDefinition }) {
  const { tokens } = theme;
  const style = {
    background: tokens.background,
    color: tokens.foreground,
    borderColor: tokens.border,
    fontFamily: FONT_STACKS[tokens.bodyFont],
  } satisfies CSSProperties;

  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-md border text-[0.5rem] leading-none select-none"
      style={style}
    >
      <div
        className="flex items-center justify-between border-b px-2.5 py-1.5"
        style={{ borderColor: tokens.border }}
      >
        <span className="font-semibold" style={{ fontFamily: FONT_STACKS[tokens.headingFont] }}>
          Meine Site
        </span>
        <span className="flex gap-1.5" style={{ color: tokens.mutedForeground }}>
          <span>Start</span>
          <span>Archiv</span>
        </span>
      </div>
      <div className="space-y-1.5 px-2.5 py-2.5">
        <div className="h-1 w-8 rounded-full" style={{ background: tokens.accent, opacity: 0.9 }} />
        <p
          className="text-[0.75rem] leading-tight font-bold"
          style={{ fontFamily: FONT_STACKS[tokens.headingFont] }}
        >
          Ein Beitrag mit Titel
        </p>
        <div className="space-y-1">
          <div className="h-1 w-full rounded-full" style={{ background: tokens.muted }} />
          <div className="h-1 w-11/12 rounded-full" style={{ background: tokens.muted }} />
          <div className="h-1 w-3/4 rounded-full" style={{ background: tokens.muted }} />
        </div>
        <span
          className="mt-1 inline-block rounded-full px-1.5 py-0.5 font-semibold"
          style={{ background: tokens.accent, color: tokens.accentForeground }}
        >
          Weiterlesen
        </span>
      </div>
    </div>
  );
}
