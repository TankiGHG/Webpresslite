import { describe, expect, it } from 'vitest';
import { effectiveHost, parseTenantHost, siteUrl } from '@/lib/tenant/host';

function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? null };
}

describe('effectiveHost', () => {
  it('prefers the forwarded host set by the proxy', () => {
    expect(
      effectiveHost(
        headers({ host: 'app-container:3000', 'x-forwarded-host': 'blog.example.com' }),
      ),
    ).toBe('blog.example.com');
  });

  it('takes the first entry of a proxy chain', () => {
    expect(effectiveHost(headers({ 'x-forwarded-host': 'blog.example.com, inner.local' }))).toBe(
      'blog.example.com',
    );
  });

  it('falls back to the host header', () => {
    expect(effectiveHost(headers({ host: 'example.com' }))).toBe('example.com');
  });

  it('ignores an empty forwarded host', () => {
    expect(effectiveHost(headers({ host: 'example.com', 'x-forwarded-host': '  ' }))).toBe(
      'example.com',
    );
  });

  it('returns null when neither header is present', () => {
    expect(effectiveHost(headers({}))).toBeNull();
  });
});

describe('parseTenantHost', () => {
  const root = 'example.com';

  it('treats the root domain as the platform', () => {
    expect(parseTenantHost('example.com', root)).toEqual({ kind: 'platform' });
  });

  it.each(['www.example.com', 'app.example.com'])('treats %s as the platform', (host) => {
    expect(parseTenantHost(host, root)).toEqual({ kind: 'platform' });
  });

  it('resolves a single label to a tenant', () => {
    expect(parseTenantHost('blog.example.com', root)).toEqual({
      kind: 'subdomain',
      subdomain: 'blog',
    });
  });

  it('does not treat a nested label as a tenant', () => {
    expect(parseTenantHost('a.b.example.com', root)).toEqual({ kind: 'platform' });
  });

  it('ignores the port', () => {
    expect(parseTenantHost('blog.lvh.me:3000', 'lvh.me:3000')).toEqual({
      kind: 'subdomain',
      subdomain: 'blog',
    });
  });

  it('lowercases the host', () => {
    expect(parseTenantHost('BLOG.Example.COM', root)).toEqual({
      kind: 'subdomain',
      subdomain: 'blog',
    });
  });

  it('treats an unrelated host as a custom domain', () => {
    expect(parseTenantHost('meine-domain.de', root)).toEqual({
      kind: 'custom-domain',
      domain: 'meine-domain.de',
    });
  });

  it('does not mistake a suffix match for a subdomain', () => {
    // "notexample.com" ends with "example.com" as a string but is not under it.
    expect(parseTenantHost('notexample.com', root)).toEqual({
      kind: 'custom-domain',
      domain: 'notexample.com',
    });
  });

  it('falls back to the platform without a host', () => {
    expect(parseTenantHost(null, root)).toEqual({ kind: 'platform' });
  });
});

describe('siteUrl', () => {
  it('builds the public url of a tenant', () => {
    expect(siteUrl('blog', 'lvh.me:3000')).toBe('http://blog.lvh.me:3000');
    expect(siteUrl('blog', 'example.com', 'https')).toBe('https://blog.example.com');
  });
});
