import { describe, expect, it } from 'vitest';
import { isReservedSubdomain, RESERVED_SUBDOMAINS } from '@/lib/tenant/reserved';
import { subdomainSchema, suggestSubdomain } from '@/lib/tenant/validation';

describe('subdomainSchema', () => {
  it.each(['blog', 'mein-blog', 'a1-b2-c3', 'abc'])('accepts %s', (value) => {
    expect(subdomainSchema.safeParse(value).success).toBe(true);
  });

  it('lowercases and trims', () => {
    const result = subdomainSchema.safeParse('  MeinBlog  ');
    expect(result.success && result.data).toBe('meinblog');
  });

  it.each([
    ['ab', 'too short'],
    ['-blog', 'leading hyphen'],
    ['blog-', 'trailing hyphen'],
    ['my--blog', 'double hyphen'],
    ['my_blog', 'underscore'],
    ['my.blog', 'dot'],
    ['my blog', 'space'],
    ['blög', 'umlaut'],
  ])('rejects %s (%s)', (value) => {
    expect(subdomainSchema.safeParse(value).success).toBe(false);
  });

  it('rejects a label longer than the dns limit', () => {
    expect(subdomainSchema.safeParse('a'.repeat(64)).success).toBe(false);
    expect(subdomainSchema.safeParse('a'.repeat(63)).success).toBe(true);
  });

  it.each(['www', 'app', 'admin', 'api', 'mail'])('rejects the reserved name %s', (value) => {
    const result = subdomainSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0]?.message).toBe(
      'Diese Subdomain ist reserviert.',
    );
  });

  it('rejects reserved names regardless of case', () => {
    expect(subdomainSchema.safeParse('WWW').success).toBe(false);
  });
});

describe('isReservedSubdomain', () => {
  it('covers every entry of the list', () => {
    for (const entry of RESERVED_SUBDOMAINS) {
      expect(isReservedSubdomain(entry)).toBe(true);
    }
  });

  it('leaves ordinary names alone', () => {
    expect(isReservedSubdomain('mein-blog')).toBe(false);
  });
});

describe('suggestSubdomain', () => {
  it('slugifies a name', () => {
    expect(suggestSubdomain('Mein Blog')).toBe('mein-blog');
  });

  it('transliterates german umlauts instead of dropping them', () => {
    expect(suggestSubdomain('Ärger & Größe')).toBe('aerger-groesse');
  });

  it('strips accents', () => {
    expect(suggestSubdomain('Café')).toBe('cafe');
  });

  it('trims stray hyphens, including after truncation', () => {
    expect(suggestSubdomain('---x---')).toBe('x');
    expect(suggestSubdomain(`${'a'.repeat(62)} b`)).toBe('a'.repeat(62));
  });

  it('produces a value the schema accepts for a normal name', () => {
    expect(subdomainSchema.safeParse(suggestSubdomain('Mein schöner Blog')).success).toBe(true);
  });
});
