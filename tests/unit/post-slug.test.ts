import { describe, expect, it, vi } from 'vitest';
import { SLUG_PATTERN, slugify, uniqueSlug } from '@/lib/posts/slug';

describe('slugify', () => {
  it('slugifies a normal title', () => {
    expect(slugify('Mein erster Beitrag')).toBe('mein-erster-beitrag');
  });

  it('transliterates german umlauts', () => {
    expect(slugify('Über Größe und Öl')).toBe('ueber-groesse-und-oel');
  });

  it('strips accents and punctuation', () => {
    expect(slugify('Café — au lait!')).toBe('cafe-au-lait');
  });

  it('collapses separators and trims them', () => {
    expect(slugify('  ...Hallo,,, Welt...  ')).toBe('hallo-welt');
  });

  it('returns an empty string when nothing usable is left', () => {
    expect(slugify('***')).toBe('');
    expect(slugify('日本語')).toBe('');
  });

  it('truncates without leaving a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(95)} b`);

    expect(slug.length).toBeLessThanOrEqual(96);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('produces slugs the pattern accepts', () => {
    for (const title of ['Hallo Welt', 'Über Größe', 'Café au lait', '2026 im Rückblick']) {
      expect(SLUG_PATTERN.test(slugify(title))).toBe(true);
    }
  });
});

describe('uniqueSlug', () => {
  it('uses the plain slug when it is free', async () => {
    expect(await uniqueSlug('Hallo Welt', async () => false)).toBe('hallo-welt');
  });

  it('appends a counter until it finds a free slug', async () => {
    const taken = new Set(['hallo-welt', 'hallo-welt-2', 'hallo-welt-3']);

    expect(await uniqueSlug('Hallo Welt', async (c) => taken.has(c))).toBe('hallo-welt-4');
  });

  it('falls back when the title yields nothing usable', async () => {
    expect(await uniqueSlug('***', async () => false, 'seite')).toBe('seite');
  });

  it('asks per candidate rather than pre-loading', async () => {
    const isTaken = vi.fn(async (candidate: string) => candidate === 'test');
    await uniqueSlug('Test', isTaken);

    expect(isTaken).toHaveBeenCalledWith('test');
    expect(isTaken).toHaveBeenCalledWith('test-2');
    expect(isTaken).toHaveBeenCalledTimes(2);
  });

  it('never returns a slug the pattern rejects', async () => {
    const taken = new Set(['a'.repeat(96)]);
    const slug = await uniqueSlug('a'.repeat(200), async (c) => taken.has(c));

    expect(SLUG_PATTERN.test(slug)).toBe(true);
  });
});
