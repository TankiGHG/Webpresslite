import { describe, expect, it, vi } from 'vitest';
import { verificationHost, verificationRecord } from '@/lib/domains/validation';
import { verifyDomainOwnership, type TxtResolver } from '@/lib/domains/verify';

const DOMAIN = 'meineseite.de';
const TOKEN = 'abc123';
const EXPECTED = verificationRecord(TOKEN);

function resolverReturning(records: string[][]): TxtResolver {
  return { resolveTxt: vi.fn(async () => records) };
}

function resolverThrowing(code: string): TxtResolver {
  return {
    resolveTxt: vi.fn(async () => {
      throw Object.assign(new Error(code), { code });
    }),
  };
}

describe('verifyDomainOwnership', () => {
  it('queries the prefixed host, not the domain itself', async () => {
    const resolver = resolverReturning([[EXPECTED]]);
    await verifyDomainOwnership(DOMAIN, TOKEN, resolver);

    expect(resolver.resolveTxt).toHaveBeenCalledWith(verificationHost(DOMAIN));
  });

  it('verifies when the record is present', async () => {
    const result = await verifyDomainOwnership(DOMAIN, TOKEN, resolverReturning([[EXPECTED]]));

    expect(result.verified).toBe(true);
  });

  it('verifies when the record sits among unrelated ones', async () => {
    const resolver = resolverReturning([
      ['v=spf1 -all'],
      ['google-site-verification=xyz'],
      [EXPECTED],
    ]);

    expect((await verifyDomainOwnership(DOMAIN, TOKEN, resolver)).verified).toBe(true);
  });

  it('joins a record that DNS split into chunks', async () => {
    const half = Math.ceil(EXPECTED.length / 2);
    const resolver = resolverReturning([[EXPECTED.slice(0, half), EXPECTED.slice(half)]]);

    expect((await verifyDomainOwnership(DOMAIN, TOKEN, resolver)).verified).toBe(true);
  });

  it('rejects a token that belongs to another site', async () => {
    const resolver = resolverReturning([[verificationRecord('ein-anderer-token')]]);
    const result = await verifyDomainOwnership(DOMAIN, TOKEN, resolver);

    expect(result.verified).toBe(false);
    expect(result.verified === false && result.found).toHaveLength(1);
  });

  it('does not accept a record that merely contains the token', async () => {
    // A neighbouring value must not verify by substring.
    const resolver = resolverReturning([[`x-${EXPECTED}-y`]]);

    expect((await verifyDomainOwnership(DOMAIN, TOKEN, resolver)).verified).toBe(false);
  });

  it('reports a missing record as missing, not as a failure', async () => {
    const result = await verifyDomainOwnership(DOMAIN, TOKEN, resolverThrowing('ENOTFOUND'));

    expect(result.verified).toBe(false);
    expect(result.verified === false && result.reason).toMatch(/kein TXT-Eintrag/);
  });

  it('distinguishes a timeout from a missing record', async () => {
    const result = await verifyDomainOwnership(DOMAIN, TOKEN, resolverThrowing('ETIMEOUT'));

    expect(result.verified === false && result.reason).toMatch(/zu lange gedauert/);
  });

  it('reports any other resolver error without leaking its detail', async () => {
    const result = await verifyDomainOwnership(DOMAIN, TOKEN, resolverThrowing('ESERVFAIL'));

    expect(result.verified === false && result.reason).toBe('Die DNS-Abfrage ist fehlgeschlagen.');
  });
});
