import 'server-only';
import { Resolver } from 'node:dns/promises';
import { verificationHost, verificationRecord } from './validation';

export type VerificationResult =
  { verified: true } | { verified: false; reason: string; found: string[] };

/** Just enough of a DNS resolver to look up TXT records. */
export interface TxtResolver {
  resolveTxt(hostname: string): Promise<string[][]>;
}

function defaultResolver(): TxtResolver {
  // A dedicated resolver rather than the process default, so a cached negative
  // answer from an earlier attempt does not make a correct record look missing.
  return new Resolver({ timeout: 5000, tries: 2 });
}

/**
 * Looks up the TXT record that proves control over the domain.
 *
 * The resolver is a parameter so the matching logic can be exercised without a
 * network round trip.
 */
export async function verifyDomainOwnership(
  domain: string,
  token: string,
  resolver: TxtResolver = defaultResolver(),
): Promise<VerificationResult> {
  const host = verificationHost(domain);
  const expected = verificationRecord(token);

  let records: string[][];
  try {
    records = await resolver.resolveTxt(host);
  } catch (error) {
    const code = (error as { code?: string }).code;

    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      return {
        verified: false,
        reason: `Für ${host} ist kein TXT-Eintrag zu finden. DNS-Änderungen brauchen manchmal einige Minuten.`,
        found: [],
      };
    }

    if (code === 'ETIMEOUT' || code === 'ETIMEDOUT') {
      return {
        verified: false,
        reason: 'Die DNS-Abfrage hat zu lange gedauert. Bitte versuche es gleich noch einmal.',
        found: [],
      };
    }

    return { verified: false, reason: 'Die DNS-Abfrage ist fehlgeschlagen.', found: [] };
  }

  // A TXT record longer than 255 bytes arrives as several strings that belong
  // together; joining them is what the DNS spec asks for.
  const values = records.map((chunks) => chunks.join(''));

  if (values.includes(expected)) return { verified: true };

  return {
    verified: false,
    reason: `Der TXT-Eintrag auf ${host} stimmt nicht mit dem erwarteten Wert überein.`,
    found: values,
  };
}
