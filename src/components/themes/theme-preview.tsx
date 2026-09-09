import type { CSSProperties } from 'react';
import { FONT_STACKS, type ThemeDefinition, type ThemeTokens } from '@/lib/themes/definitions';

/**
 * A miniature of the public site drawn from the theme's own tokens, so the
 * card shows what the reader will get rather than a stock thumbnail. The body
 * follows the theme's layout — picking a theme also picks an arrangement, and
 * a preview that hid that would be a preview of the wrong thing.
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
        <span
          className={theme.layout === 'block' ? 'font-semibold uppercase' : 'font-semibold'}
          style={{ fontFamily: FONT_STACKS[tokens.headingFont] }}
        >
          Meine Site
        </span>
        <span className="flex gap-1.5" style={{ color: tokens.mutedForeground }}>
          <span>Start</span>
          <span>Archiv</span>
        </span>
      </div>
      <PreviewBody theme={theme} />
    </div>
  );
}

function PreviewBody({ theme }: { theme: ThemeDefinition }) {
  const { tokens, layout } = theme;

  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-1.5 p-2.5">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="overflow-hidden rounded-sm border"
            style={{ borderColor: tokens.border, background: tokens.background }}
          >
            <div className="h-5" style={{ background: tokens.muted }} />
            <div className="space-y-1 p-1.5">
              <Heading tokens={tokens} className="text-[0.5rem]">
                Beitrag
              </Heading>
              <Bar tokens={tokens} width="80%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'block') {
    return (
      <div className="space-y-2 p-2.5">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="space-y-1 p-1.5"
            style={{
              border: `1.5px solid ${tokens.border}`,
              background: tokens.background,
              boxShadow: `3px 3px 0 ${tokens.border}`,
            }}
          >
            <Heading tokens={tokens} className="text-[0.625rem] uppercase">
              Ein Beitrag
            </Heading>
            <Bar tokens={tokens} width="100%" />
            <Bar tokens={tokens} width="70%" />
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'glass') {
    return (
      <div
        className="space-y-2 p-2.5"
        style={{
          backgroundImage: `radial-gradient(6rem 3rem at 15% 0%, ${tokens.accent}, transparent 65%)`,
        }}
      >
        {[0, 1].map((index) => (
          <div
            key={index}
            className="space-y-1 rounded-md p-1.5"
            style={{ border: `1px solid ${tokens.border}`, background: tokens.muted }}
          >
            <Heading tokens={tokens} className="text-[0.625rem]">
              Ein Beitrag
            </Heading>
            <Bar tokens={tokens} width="100%" />
            <Bar tokens={tokens} width="70%" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 px-2.5 py-2.5">
      <div className="h-1 w-8 rounded-full" style={{ background: tokens.accent, opacity: 0.9 }} />
      <Heading tokens={tokens} className="text-[0.75rem]">
        Ein Beitrag mit Titel
      </Heading>
      <div className="space-y-1">
        <Bar tokens={tokens} width="100%" />
        <Bar tokens={tokens} width="92%" />
        <Bar tokens={tokens} width="75%" />
      </div>
      <span
        className="mt-1 inline-block rounded-full px-1.5 py-0.5 font-semibold"
        style={{ background: tokens.accent, color: tokens.accentForeground }}
      >
        Weiterlesen
      </span>
    </div>
  );
}

function Heading({
  tokens,
  className,
  children,
}: {
  tokens: ThemeTokens;
  className: string;
  children: string;
}) {
  return (
    <p
      className={`leading-tight font-bold ${className}`}
      style={{ fontFamily: FONT_STACKS[tokens.headingFont] }}
    >
      {children}
    </p>
  );
}

/**
 * A line of stand-in text, drawn instead of set so the miniature stays legible.
 * Faded text colour rather than the muted surface — a panel already uses that
 * surface, and a bar the same colour as its card would be invisible.
 */
function Bar({ tokens, width }: { tokens: ThemeTokens; width: string }) {
  return (
    <div
      className="h-1 rounded-full"
      style={{ background: tokens.mutedForeground, opacity: 0.35, width }}
    />
  );
}
