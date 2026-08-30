/**
 * Host parsing for multi-tenancy. Kept free of Next and database imports so it
 * can run in middleware and be tested directly.
 */

export type TenantHost =
  | { kind: 'platform' }
  | { kind: 'subdomain'; subdomain: string }
  | { kind: 'custom-domain'; domain: string };

/** Subdomains that address the platform itself rather than a tenant. */
const PLATFORM_SUBDOMAINS = new Set(['', 'www', 'app']);

function normalise(host: string): string {
  // Strip the port: `sites.subdomain` never contains one, and the root domain
  // carries one only in development.
  return host.trim().toLowerCase().split(':')[0] ?? '';
}

/**
 * Picks the host the request was originally made to. Behind the production
 * proxy the `Host` header is the internal one, so `X-Forwarded-Host` wins.
 */
export function effectiveHost(headers: { get(name: string): string | null }): string | null {
  const forwarded = headers.get('x-forwarded-host');
  if (forwarded) {
    // A proxy chain appends, so the first entry is the client-facing host.
    const first = forwarded.split(',')[0];
    if (first?.trim()) return first.trim();
  }

  return headers.get('host');
}

/**
 * Classifies a host against the configured root domain.
 *
 * `example.com`, `www.example.com` and `app.example.com` are the platform.
 * `blog.example.com` is the tenant `blog`. Anything not under the root domain
 * is treated as a custom domain.
 */
export function parseTenantHost(host: string | null, rootDomain: string): TenantHost {
  const normalisedHost = normalise(host ?? '');
  const normalisedRoot = normalise(rootDomain);

  if (!normalisedHost || !normalisedRoot) return { kind: 'platform' };

  if (normalisedHost === normalisedRoot) return { kind: 'platform' };

  if (normalisedHost.endsWith(`.${normalisedRoot}`)) {
    const label = normalisedHost.slice(0, -(normalisedRoot.length + 1));

    // Only a single label addresses a tenant. `a.b.example.com` is not `a.b`.
    if (label.includes('.')) return { kind: 'platform' };
    if (PLATFORM_SUBDOMAINS.has(label)) return { kind: 'platform' };

    return { kind: 'subdomain', subdomain: label };
  }

  return { kind: 'custom-domain', domain: normalisedHost };
}

/** Builds the public URL of a tenant, for links in the dashboard. */
export function siteUrl(subdomain: string, rootDomain: string, protocol = 'http'): string {
  return `${protocol}://${subdomain}.${rootDomain}`;
}
