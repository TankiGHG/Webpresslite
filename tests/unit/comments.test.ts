import { describe, expect, it } from 'vitest';
import { COMMENT_MAX_LENGTH, HONEYPOT_FIELD } from '@/lib/comments/constants';
import { commentSchema, looksLikeSpam } from '@/lib/comments/validation';

const valid = {
  authorName: 'Ada Lovelace',
  authorEmail: 'ada@example.com',
  body: 'Ein durchaus nachdenklicher Kommentar zum Thema.',
};

describe('commentSchema', () => {
  it('accepts a normal comment and trims it', () => {
    const result = commentSchema.safeParse({ ...valid, authorName: '  Ada Lovelace  ' });

    expect(result.success).toBe(true);
    expect(result.success && result.data.authorName).toBe('Ada Lovelace');
  });

  it('rejects a missing name', () => {
    expect(commentSchema.safeParse({ ...valid, authorName: 'A' }).success).toBe(false);
  });

  it('rejects a malformed address', () => {
    expect(commentSchema.safeParse({ ...valid, authorEmail: 'keine-adresse' }).success).toBe(false);
  });

  it('rejects an empty body', () => {
    expect(commentSchema.safeParse({ ...valid, body: ' ' }).success).toBe(false);
  });

  it('caps the body length', () => {
    expect(
      commentSchema.safeParse({ ...valid, body: 'a'.repeat(COMMENT_MAX_LENGTH) }).success,
    ).toBe(true);
    expect(
      commentSchema.safeParse({ ...valid, body: 'a'.repeat(COMMENT_MAX_LENGTH + 1) }).success,
    ).toBe(false);
  });
});

describe('looksLikeSpam', () => {
  it('passes an ordinary comment', () => {
    expect(looksLikeSpam(valid)).toBe(false);
  });

  it('passes a comment with one or two links', () => {
    expect(
      looksLikeSpam({ ...valid, body: 'Siehe https://example.com und www.example.org dazu.' }),
    ).toBe(false);
  });

  it('flags a link farm', () => {
    expect(
      looksLikeSpam({
        ...valid,
        body: 'https://a.example https://b.example https://c.example https://d.example',
      }),
    ).toBe(true);
  });

  it('flags a url as author name', () => {
    expect(looksLikeSpam({ ...valid, authorName: 'https://billig-pillen.example' })).toBe(true);
  });

  it('flags shouting', () => {
    expect(
      looksLikeSpam({ ...valid, body: 'KAUFEN SIE JETZT UNSERE TOLLEN PRODUKTE SOFORT' }),
    ).toBe(true);
  });

  it('does not flag a short acronym heavy sentence', () => {
    expect(looksLikeSpam({ ...valid, body: 'Die HTML und CSS Frage finde ich gut.' })).toBe(false);
  });

  it('never flags on length alone', () => {
    expect(looksLikeSpam({ ...valid, body: 'Ein sehr langer, ruhiger Beitrag. '.repeat(30) })).toBe(
      false,
    );
  });
});

describe('honeypot', () => {
  it('is named like a plausible field so bots fill it in', () => {
    expect(HONEYPOT_FIELD).toBe('website');
  });
});
