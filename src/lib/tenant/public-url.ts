import 'server-only';
import { getEnv } from '@/lib/env';
import { siteUrl } from './host';

/**
 * The scheme the platform is reachable on. Tenants share it: behind the
 * production proxy every host is https, in development everything is http.
 */
export function publicProtocol(): 'http' | 'https' {
  return getEnv().APP_URL.startsWith('https://') ? 'https' : 'http';
}

/** Public origin of a tenant, preferring a verified custom domain. */
export function publicSiteUrl(site: {
  subdomain: string;
  customDomain?: string | null;
  domainVerifiedAt?: Date | null;
}): string {
  const protocol = publicProtocol();
  if (site.customDomain && site.domainVerifiedAt) {
    return `${protocol}://${site.customDomain}`;
  }
  return siteUrl(site.subdomain, getEnv().ROOT_DOMAIN, protocol);
}
