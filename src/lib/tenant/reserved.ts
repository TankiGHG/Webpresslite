/**
 * Subdomains that must never become a tenant: platform surfaces, common
 * infrastructure hostnames, and names people would reasonably read as official.
 */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'billing',
  'cdn',
  'dashboard',
  'dev',
  'docs',
  'ftp',
  'help',
  'imap',
  'localhost',
  'mail',
  'media',
  'mx',
  'ns',
  'ns1',
  'ns2',
  'pop',
  'preview',
  'root',
  'secure',
  'smtp',
  'staging',
  'static',
  'status',
  'support',
  'system',
  'test',
  'webmail',
  'www',
]);

export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.has(subdomain.toLowerCase());
}
