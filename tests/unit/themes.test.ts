import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME,
  FONT_STACKS,
  THEMES,
  THEME_IDS,
  isThemeId,
  resolveTheme,
} from '@/lib/themes/definitions';
import { parseThemeSettings, themeSettingsSchema, themeStyle } from '@/lib/themes/settings';

describe('theme definitions', () => {
  it('defines exactly the three themes from the plan', () => {
    expect(THEME_IDS).toHaveLength(3);
    for (const id of THEME_IDS) expect(THEMES[id].id).toBe(id);
  });

  it('gives every theme a complete token set', () => {
    for (const id of THEME_IDS) {
      const { tokens } = THEMES[id];
      for (const [key, value] of Object.entries(tokens)) {
        expect(value, `${id}.${key}`).toBeTruthy();
      }
      expect(FONT_STACKS[tokens.bodyFont]).toBeTruthy();
      expect(FONT_STACKS[tokens.headingFont]).toBeTruthy();
    }
  });

  it('falls back to the default theme for anything unknown', () => {
    expect(resolveTheme(null).id).toBe(DEFAULT_THEME);
    expect(resolveTheme('does-not-exist').id).toBe(DEFAULT_THEME);
    expect(resolveTheme('journal').id).toBe('journal');
  });

  it('recognises only real theme ids', () => {
    expect(isThemeId('minimal')).toBe(true);
    expect(isThemeId('Minimal')).toBe(false);
  });
});

describe('themeSettingsSchema', () => {
  it('accepts three and six digit hex colours', () => {
    expect(themeSettingsSchema.safeParse({ accent: '#abc' }).success).toBe(true);
    expect(themeSettingsSchema.safeParse({ accent: '#a1b2c3' }).success).toBe(true);
  });

  it.each(['red', 'rgb(1,2,3)', '#12345', 'abcdef', 'javascript:alert(1)'])(
    'rejects %s as a colour',
    (value) => {
      expect(themeSettingsSchema.safeParse({ accent: value }).success).toBe(false);
    },
  );

  it('requires an https logo url', () => {
    expect(themeSettingsSchema.safeParse({ logoUrl: 'https://example.com/l.png' }).success).toBe(
      true,
    );
    expect(themeSettingsSchema.safeParse({ logoUrl: 'http://example.com/l.png' }).success).toBe(
      false,
    );
    expect(themeSettingsSchema.safeParse({ logoUrl: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('rejects an unknown font', () => {
    expect(themeSettingsSchema.safeParse({ bodyFont: 'comic' }).success).toBe(false);
  });
});

describe('parseThemeSettings', () => {
  it('returns an empty object for junk', () => {
    expect(parseThemeSettings(null)).toEqual({});
    expect(parseThemeSettings({ accent: 'not-a-colour' })).toEqual({});
  });

  it('drops keys it does not know', () => {
    expect(parseThemeSettings({ accent: '#123456', evil: '<script>' })).toEqual({
      accent: '#123456',
    });
  });
});

describe('themeStyle', () => {
  it('emits the theme tokens when nothing is overridden', () => {
    const style = themeStyle('journal', {});

    expect(style['--site-background']).toBe(THEMES.journal.tokens.background);
    expect(style['--site-body-font']).toBe(FONT_STACKS.serif);
  });

  it('lets overrides win', () => {
    const style = themeStyle('minimal', { accent: '#ff0000', bodyFont: 'mono' });

    expect(style['--site-accent']).toBe('#ff0000');
    expect(style['--site-body-font']).toBe(FONT_STACKS.mono);
  });

  it('emits only known custom properties', () => {
    const style = themeStyle('minimal', { accent: '#ff0000' });

    for (const key of Object.keys(style)) expect(key.startsWith('--site-')).toBe(true);
  });

  it('falls back to the default theme for an unknown id', () => {
    expect(themeStyle('nonsense', {})['--site-background']).toBe(
      THEMES[DEFAULT_THEME].tokens.background,
    );
  });
});
