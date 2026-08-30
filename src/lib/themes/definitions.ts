/**
 * Themes are pure CSS variable sets. Switching one changes no markup, which
 * keeps the public pages cacheable and means a site can change its look
 * without re-rendering stored content.
 */
export const THEME_IDS = ['minimal', 'journal', 'contrast'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

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
  contentWidth: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
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
    },
  },
  journal: {
    id: 'journal',
    name: 'Journal',
    description: 'Serifen, warmer Papierton, für lange Texte.',
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
    },
  },
  contrast: {
    id: 'contrast',
    name: 'Kontrast',
    description: 'Dunkel, hoher Kontrast, kräftige Überschriften.',
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
