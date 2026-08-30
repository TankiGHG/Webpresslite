import { z } from 'zod';
import {
  FONT_IDS,
  FONT_STACKS,
  THEME_IDS,
  resolveTheme,
  type FontId,
  type ThemeDefinition,
} from './definitions';

/**
 * Per-site overrides on top of a theme. Everything is optional: a site that
 * customises nothing renders the theme exactly as defined.
 */
const hexColor = z
  .string()
  .trim()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    'Bitte gib eine Farbe als Hex-Wert an, z. B. #1a2b3c.',
  );

export const themeSettingsSchema = z.object({
  accent: hexColor.optional(),
  background: hexColor.optional(),
  foreground: hexColor.optional(),
  bodyFont: z.enum(FONT_IDS as [FontId, ...FontId[]]).optional(),
  headingFont: z.enum(FONT_IDS as [FontId, ...FontId[]]).optional(),
  logoUrl: z
    .string()
    .trim()
    .url('Bitte gib eine vollständige URL an.')
    .refine(
      (value) => value.startsWith('https://'),
      'Das Logo muss über https ausgeliefert werden.',
    )
    .optional(),
  logoAlt: z.string().trim().max(120, 'Höchstens 120 Zeichen.').optional(),
});

export type ThemeSettings = z.infer<typeof themeSettingsSchema>;

export const updateThemeSchema = z.object({
  siteId: z.string().min(1),
  theme: z.enum(THEME_IDS),
  settings: themeSettingsSchema,
});

/** Parses whatever is in the database, discarding anything unrecognised. */
export function parseThemeSettings(value: unknown): ThemeSettings {
  const result = themeSettingsSchema.safeParse(value ?? {});
  return result.success ? result.data : {};
}

/**
 * Builds the inline `style` for a site's root element. Overrides win over the
 * theme, and only known keys are emitted — a stored value can never inject a
 * declaration of its own because it is validated first.
 */
export function themeStyle(
  themeId: string | null | undefined,
  settings: ThemeSettings,
): Record<string, string> {
  const theme: ThemeDefinition = resolveTheme(themeId);
  const { tokens } = theme;

  const bodyFont = settings.bodyFont ?? tokens.bodyFont;
  const headingFont = settings.headingFont ?? tokens.headingFont;

  return {
    '--site-background': settings.background ?? tokens.background,
    '--site-foreground': settings.foreground ?? tokens.foreground,
    '--site-muted': tokens.muted,
    '--site-muted-foreground': tokens.mutedForeground,
    '--site-accent': settings.accent ?? tokens.accent,
    '--site-accent-foreground': tokens.accentForeground,
    '--site-border': tokens.border,
    '--site-body-font': FONT_STACKS[bodyFont],
    '--site-heading-font': FONT_STACKS[headingFont],
    '--site-content-width': tokens.contentWidth,
  };
}
