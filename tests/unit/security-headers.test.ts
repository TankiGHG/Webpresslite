import { describe, expect, it } from 'vitest';
import { buildCsp, originOf, STATIC_SECURITY_HEADERS } from '@/lib/security/headers';

const BASE = {
  nonce: 'test-nonce',
  storageOrigin: 'https://media.example.com',
  isSecure: true,
};

function directives(csp: string): Map<string, string> {
  return new Map(
    csp.split(';').map((part) => {
      const [name, ...rest] = part.trim().split(' ');
      return [name ?? '', rest.join(' ')];
    }),
  );
}

describe('buildCsp', () => {
  it('carries the nonce and locks scripts down', () => {
    const csp = directives(buildCsp({ ...BASE, isDevelopment: false }));

    expect(csp.get('script-src')).toContain("'nonce-test-nonce'");
    expect(csp.get('script-src')).toContain("'strict-dynamic'");
    expect(csp.get('script-src')).not.toContain("'unsafe-inline'");
  });

  it('never allows eval in production', () => {
    expect(buildCsp({ ...BASE, isDevelopment: false })).not.toContain("'unsafe-eval'");
  });

  it('allows eval only in development, where fast refresh needs it', () => {
    expect(buildCsp({ ...BASE, isDevelopment: true })).toContain("'unsafe-eval'");
  });

  it('lets the browser reach the object store, because uploads go there directly', () => {
    const csp = directives(buildCsp({ ...BASE, isDevelopment: false }));

    expect(csp.get('connect-src')).toContain('https://media.example.com');
    expect(csp.get('img-src')).toContain('https://media.example.com');
  });

  it('works without a configured store', () => {
    const csp = buildCsp({ ...BASE, storageOrigin: null, isDevelopment: false });

    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain('null');
  });

  it('forbids framing, plugins and stray form targets', () => {
    const csp = directives(buildCsp({ ...BASE, isDevelopment: false }));

    expect(csp.get('frame-ancestors')).toBe("'none'");
    expect(csp.get('object-src')).toBe("'none'");
    expect(csp.get('form-action')).toBe("'self'");
    expect(csp.get('base-uri')).toBe("'self'");
  });

  it('upgrades subresources only where TLS is actually terminated', () => {
    // Over plain http this directive would upgrade every asset request to a
    // scheme the server does not speak, and nothing would load.
    expect(buildCsp({ ...BASE, isDevelopment: false })).toContain('upgrade-insecure-requests');
    expect(buildCsp({ ...BASE, isSecure: false, isDevelopment: false })).not.toContain(
      'upgrade-insecure-requests',
    );
  });

  it('keeps a default that denies everything not named', () => {
    expect(directives(buildCsp({ ...BASE, isDevelopment: false })).get('default-src')).toBe(
      "'self'",
    );
  });
});

describe('static security headers', () => {
  it('covers the headers a deployment should never be missing', () => {
    const names = STATIC_SECURITY_HEADERS.map((header) => header.key);

    expect(names).toContain('X-Content-Type-Options');
    expect(names).toContain('X-Frame-Options');
    expect(names).toContain('Referrer-Policy');
    expect(names).toContain('Permissions-Policy');
    expect(names).toContain('Strict-Transport-Security');
  });

  it('sets a long HSTS window with subdomains, since tenants live on them', () => {
    const hsts = STATIC_SECURITY_HEADERS.find(
      (header) => header.key === 'Strict-Transport-Security',
    );

    expect(hsts?.value).toContain('includeSubDomains');
    expect(Number(hsts?.value.match(/max-age=(\d+)/)?.[1] ?? 0)).toBeGreaterThanOrEqual(31536000);
  });
});

describe('originOf', () => {
  it('reduces a url to its origin', () => {
    expect(originOf('https://media.example.com/bucket/x')).toBe('https://media.example.com');
    expect(originOf('http://127.0.0.1:9000/bucket')).toBe('http://127.0.0.1:9000');
  });

  it('returns null rather than throwing on junk', () => {
    expect(originOf(undefined)).toBeNull();
    expect(originOf('nicht-mal-eine-url')).toBeNull();
  });
});
