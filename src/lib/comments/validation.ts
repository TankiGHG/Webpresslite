import { z } from 'zod';
import { COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH } from './constants';

export const commentSchema = z.object({
  authorName: z
    .string()
    .trim()
    .min(2, 'Bitte gib einen Namen mit mindestens 2 Zeichen ein.')
    .max(80, 'Höchstens 80 Zeichen.'),
  authorEmail: z
    .string()
    .trim()
    .min(1, 'Bitte gib eine E-Mail-Adresse ein.')
    .email('Das sieht nicht nach einer gültigen E-Mail-Adresse aus.')
    .max(200, 'Höchstens 200 Zeichen.'),
  body: z
    .string()
    .trim()
    .min(COMMENT_MIN_LENGTH, 'Bitte schreib etwas mehr.')
    .max(COMMENT_MAX_LENGTH, `Höchstens ${COMMENT_MAX_LENGTH} Zeichen.`),
});

export type CommentValues = z.infer<typeof commentSchema>;

/**
 * Cheap heuristics that catch the bulk of drive-by spam without a third party
 * service. They only ever mark a comment as spam — nothing is ever published
 * automatically, so a false positive costs a moderator one click.
 */
const LINK_PATTERN = /https?:\/\/|www\./gi;
const MAX_LINKS = 2;

export function looksLikeSpam(values: CommentValues): boolean {
  const links = values.body.match(LINK_PATTERN)?.length ?? 0;
  if (links > MAX_LINKS) return true;

  // A "name" that is a URL is never a person.
  if (LINK_PATTERN.test(values.authorName)) return true;

  // Body consisting mostly of uppercase, beyond a plausible acronym.
  const letters = values.body.replace(/[^a-zA-ZäöüÄÖÜß]/g, '');
  if (letters.length > 20) {
    const upper = letters.replace(/[^A-ZÄÖÜ]/g, '').length;
    if (upper / letters.length > 0.7) return true;
  }

  return false;
}
