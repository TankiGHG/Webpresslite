/**
 * Themes are CSS variable sets plus a layout name. Switching one changes no
 * markup, which keeps the public pages cacheable and means a site can change
 * its look without re-rendering stored content.
 */
export const THEME_IDS = [
  'minimal',
  'journal',
  'editorial',
  'ocean',
  'contrast',
  'atelier',
  'neo',
  'aurora',
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/**
 * How a theme arranges and dresses the post list. The layout is an attribute on
 * the site root, not a branch in a component: the list renders the same markup
 * everywhere and CSS turns it into separated rows, a card grid, hard-edged
 * blocks or translucent panels.
 */
export const THEME_LAYOUTS = ['list', 'grid', 'block', 'glass'] as const;
export type ThemeLayout = (typeof THEME_LAYOUTS)[number];

export const FONT_STACKS = {
  sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const;

export type FontId = keyof typeof FONT_STACKS;
export const FONT_IDS = Object.keys(FONT_STACKS) as FontId[];

export const FONT_LABELS: Record<FontId, string> = {
  sans: 'Serifenlos',
  serif: 'Serif',
  mono: 'Monospace',
};

export interface ThemeTokens {
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  bodyFont: FontId;
  headingFont: FontId;
  /** Width of the outer container — header, footer, lists. */
  contentWidth: string;
  /** Width of an article's text. Wide layouts still need a readable measure. */
  readingWidth: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  layout: ThemeLayout;
  tokens: ThemeTokens;
}

/**
 * Colours are stated in oklch. Every foreground/background pair below was
 * chosen to clear WCAG AA at normal text size — the accessibility score in the
 * acceptance criteria depends on it.
 */
export const THEMES: Record<ThemeId, ThemeDefinition> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ruhig, serifenlos, viel Weißraum.',
    layout: 'list',
    tokens: {
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.21 0 0)',
      muted: 'oklch(0.97 0 0)',
      mutedForeground: 'oklch(0.44 0 0)',
      accent: 'oklch(0.45 0.15 250)',
      accentForeground: 'oklch(1 0 0)',
      border: 'oklch(0.9 0 0)',
      bodyFont: 'sans',
      headingFont: 'sans',
      contentWidth: '44rem',
      readingWidth: '44rem',
    },
  },
  journal: {
    id: 'journal',
    name: 'Journal',
    description: 'Serifen, warmer Papierton, für lange Texte.',
    layout: 'list',
    tokens: {
      background: 'oklch(0.99 0.008 85)',
      foreground: 'oklch(0.24 0.015 60)',
      muted: 'oklch(0.95 0.015 85)',
      mutedForeground: 'oklch(0.43 0.02 60)',
      accent: 'oklch(0.42 0.13 35)',
      accentForeground: 'oklch(0.99 0.008 85)',
      border: 'oklch(0.88 0.02 75)',
      bodyFont: 'serif',
      headingFont: 'serif',
      contentWidth: '40rem',
      readingWidth: '40rem',
    },
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazin-Look: Serifen-Titel, klarer Fließtext, roter Akzent.',
    layout: 'list',
    tokens: {
      background: 'oklch(0.985 0.003 90)',
      foreground: 'oklch(0.18 0.01 50)',
      muted: 'oklch(0.955 0.006 90)',
      mutedForeground: 'oklch(0.42 0.015 50)',
      accent: 'oklch(0.5 0.19 27)',
      accentForeground: 'oklch(0.99 0 0)',
      border: 'oklch(0.86 0.01 80)',
      bodyFont: 'sans',
      headingFont: 'serif',
      contentWidth: '46rem',
      readingWidth: '46rem',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ozean',
    description: 'Kühle Blautöne, weich und ruhig.',
    layout: 'list',
    tokens: {
      background: 'oklch(0.98 0.01 220)',
      foreground: 'oklch(0.22 0.03 240)',
      muted: 'oklch(0.94 0.02 220)',
      mutedForeground: 'oklch(0.42 0.04 235)',
      accent: 'oklch(0.45 0.12 215)',
      accentForeground: 'oklch(0.99 0 0)',
      border: 'oklch(0.87 0.03 220)',
      bodyFont: 'sans',
      headingFont: 'sans',
      contentWidth: '44rem',
      readingWidth: '44rem',
    },
  },
  contrast: {
    id: 'contrast',
    name: 'Kontrast',
    description: 'Dunkel, hoher Kontrast, kräftige Überschriften.',
    layout: 'list',
    tokens: {
      background: 'oklch(0.17 0.01 260)',
      foreground: 'oklch(0.97 0.005 260)',
      muted: 'oklch(0.25 0.015 260)',
      mutedForeground: 'oklch(0.79 0.012 260)',
      accent: 'oklch(0.82 0.16 90)',
      accentForeground: 'oklch(0.17 0.01 260)',
      border: 'oklch(0.32 0.015 260)',
      bodyFont: 'sans',
      headingFont: 'sans',
      contentWidth: '44rem',
      readingWidth: '44rem',
    },
  },
  atelier: {
    id: 'atelier',
    name: 'Atelier',
    description: 'Karten-Raster mit großen Bildern — für Portfolio und Fotografie.',
    layout: 'grid',
    tokens: {
      background: 'oklch(0.99 0.003 100)',
      foreground: 'oklch(0.2 0.008 80)',
      muted: 'oklch(0.96 0.006 100)',
      mutedForeground: 'oklch(0.47 0.012 80)',
      accent: 'oklch(0.45 0.1 165)',
      accentForeground: 'oklch(0.99 0 0)',
      border: 'oklch(0.9 0.005 100)',
      bodyFont: 'sans',
      headingFont: 'sans',
      // The grid needs room; the article inside it does not.
      contentWidth: '72rem',
      readingWidth: '42rem',
    },
  },
  neo: {
    id: 'neo',
    name: 'Neo',
    description: 'Kantig und plakativ: harte Kanten, versetzte Schatten, große Typo.',
    layout: 'block',
    tokens: {
      background: 'oklch(0.96 0.025 95)',
      foreground: 'oklch(0.16 0 0)',
      muted: 'oklch(0.92 0.03 95)',
      mutedForeground: 'oklch(0.38 0.01 90)',
      accent: 'oklch(0.5 0.23 285)',
      accentForeground: 'oklch(0.99 0 0)',
      // Black outlines are the whole point here, so the border token carries them.
      border: 'oklch(0.16 0 0)',
      bodyFont: 'sans',
      headingFont: 'sans',
      contentWidth: '52rem',
      readingWidth: '44rem',
    },
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    description: 'Dunkel mit Farbverlauf und Glaseffekt — modern und technisch.',
    layout: 'glass',
    tokens: {
      background: 'oklch(0.16 0.02 275)',
      foreground: 'oklch(0.96 0.01 275)',
      muted: 'oklch(0.24 0.03 275)',
      mutedForeground: 'oklch(0.76 0.02 275)',
      accent: 'oklch(0.72 0.16 305)',
      accentForeground: 'oklch(0.16 0.02 275)',
      border: 'oklch(0.32 0.03 275)',
      bodyFont: 'sans',
      headingFont: 'sans',
      contentWidth: '52rem',
      readingWidth: '44rem',
    },
  },
};

export const DEFAULT_THEME: ThemeId = 'minimal';

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as readonly string[]).includes(value);
}

export function resolveTheme(value: string | null | undefined): ThemeDefinition {
  return value && isThemeId(value) ? THEMES[value] : THEMES[DEFAULT_THEME];
}
