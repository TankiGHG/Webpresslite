import { z } from 'zod';
import { isReservedSubdomain } from './reserved';

export const SUBDOMAIN_MIN_LENGTH = 3;
export const SUBDOMAIN_MAX_LENGTH = 63;

/**
 * A subdomain must survive being put into a hostname: lowercase letters,
 * digits and inner hyphens only. The 63 character limit is the DNS label limit.
 */
export const subdomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(SUBDOMAIN_MIN_LENGTH, `Mindestens ${SUBDOMAIN_MIN_LENGTH} Zeichen.`)
  .max(SUBDOMAIN_MAX_LENGTH, `Höchstens ${SUBDOMAIN_MAX_LENGTH} Zeichen.`)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Erlaubt sind Kleinbuchstaben, Ziffern und Bindestriche zwischen den Zeichen.',
  )
  .refine((value) => !isReservedSubdomain(value), 'Diese Subdomain ist reserviert.');

export const siteNameSchema = z
  .string()
  .trim()
  .min(2, 'Bitte gib einen Namen mit mindestens 2 Zeichen ein.')
  .max(80, 'Höchstens 80 Zeichen.');

export const createSiteSchema = z.object({
  name: siteNameSchema,
  subdomain: subdomainSchema,
});

export type CreateSiteValues = z.infer<typeof createSiteSchema>;

/** Turns a site name into a subdomain suggestion. May still be invalid. */
export function suggestSubdomain(name: string): string {
  return (
    name
      .toLowerCase()
      // Umlauts are transliterated before normalising, otherwise NFKD splits
      // them into a base letter plus a combining mark and "ä" becomes "a".
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, SUBDOMAIN_MAX_LENGTH)
      .replace(/-+$/, '')
  );
}
