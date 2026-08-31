import { z } from 'zod';

/**
 * A hostname, not a URL. Rejects schemes, paths and ports so a stored value can
 * always be compared directly against the `Host` header.
 */
export const customDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(4, 'Das ist zu kurz für eine Domain.')
  .max(253, 'Höchstens 253 Zeichen.')
  .refine((value) => !value.includes('/'), 'Bitte nur die Domain angeben, ohne Pfad.')
  .refine((value) => !value.includes(':'), 'Bitte nur die Domain angeben, ohne Port.')
  .refine(
    (value) => !/^https?:/i.test(value),
    'Bitte nur die Domain angeben, ohne http:// oder https://.',
  )
  .refine(
    (value) => /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(value),
    'Das sieht nicht nach einer gültigen Domain aus.',
  )
  .refine((value) => value.split('.').length >= 2, 'Bitte gib eine vollständige Domain an.');

/** The DNS name the TXT record has to live on. */
export function verificationHost(domain: string): string {
  return `_webpresslite.${domain}`;
}

export function verificationRecord(token: string): string {
  return `webpresslite-site-verification=${token}`;
}
