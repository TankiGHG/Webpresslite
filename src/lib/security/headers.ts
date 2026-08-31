/**
 * Security headers.
 *
 * The Content-Security-Policy carries a per-request nonce, which is why it is
 * built here and set in the middleware rather than declared statically in
 * `next.config.ts`: Next picks the nonce out of the header we set on the
 * request and puts it on its own inline scripts.
 */
export interface CspOptions {
  nonce: string;
  /** Origin the browser uploads to and loads media from. */
  storageOrigin: string | null;
  isDevelopment: boolean;
  /** Whether this request actually arrived over TLS. */
  isSecure: boolean;
}

export function buildCsp({ nonce, storageOrigin, isDevelopment, isSecure }: CspOptions): string {
  const storage = storageOrigin ? ` ${storageOrigin}` : '';

  const directives = [
    "default-src 'self'",

    // `strict-dynamic` lets Next's bootstrap load the chunks it needs without
    // listing every hashed filename. In development the dev overlay and fast
    // refresh need `unsafe-eval`, which production must never have.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,

    // Themes are applied as inline `style` attributes on the site root, and
    // Tailwind ships a stylesheet. Styles cannot execute, so this is the one
    // place an inline allowance is acceptable.
    "style-src 'self' 'unsafe-inline'",

    // Media lives in the object store, and a site's logo may be any https URL.
    `img-src 'self' data: blob: https:${storage}`,

    "font-src 'self' data:",

    // Uploads are a direct PUT from the browser to the object store.
    `connect-src 'self'${storage}${isDevelopment ? ' ws: wss:' : ''}`,

    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  // Only where TLS is actually terminated. Over plain http this directive
  // upgrades every subresource to https, and a server that does not speak it
  // answers with a connection reset — no stylesheet, no scripts, no hydration.
  if (isSecure) directives.push('upgrade-insecure-requests');

  return directives.join('; ');
}

/**
 * Headers that never change per request. `Strict-Transport-Security` is set by
 * the application even though TLS is terminated by the proxy: the proxy is
 * configuration we do not own, and a missing HSTS header is a silent downgrade.
 */
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/** The origin part of a URL, or null when it is not one. */
export function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
