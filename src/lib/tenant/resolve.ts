import 'server-only';
import { findSiteByHost } from '@/lib/db/queries/sites';
import { parseTenantHost, type TenantHost } from './host';

/**
 * Host to site resolution with a short in-process cache.
 *
 * Tenant routing runs on every request, so an uncached lookup would put a
 * database roundtrip in front of every page view. Negative results are cached
 * too — otherwise an unknown host is a free way to generate database load.
 */
const TTL_MS = 30_000;
const MAX_ENTRIES = 1_000;

interface CacheEntry {
  siteId: string | null;
  expiresAt: number;
}

const globalForCache = globalThis as unknown as {
  __webpresslite_host_cache?: Map<string, CacheEntry>;
};

function getCache(): Map<string, CacheEntry> {
  globalForCache.__webpresslite_host_cache ??= new Map();
  return globalForCache.__webpresslite_host_cache;
}

export function invalidateHostCache(): void {
  getCache().clear();
}

export async function resolveTenant(tenant: TenantHost): Promise<string | null> {
  if (tenant.kind === 'platform') return null;

  const key = tenant.kind === 'subdomain' ? `s:${tenant.subdomain}` : `d:${tenant.domain}`;
  const cache = getCache();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) return cached.siteId;

  const site = await findSiteByHost(
    tenant.kind === 'subdomain' ? { subdomain: tenant.subdomain } : { customDomain: tenant.domain },
  );

  // A simple bound: the cache is a latency optimisation, not a store, so
  // dropping everything when it grows too large is good enough.
  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(key, { siteId: site?.id ?? null, expiresAt: Date.now() + TTL_MS });

  return site?.id ?? null;
}

export { parseTenantHost };
