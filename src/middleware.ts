import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, originOf, STATIC_SECURITY_HEADERS } from '@/lib/security/headers';
import { effectiveHost, parseTenantHost } from '@/lib/tenant/host';
import { resolveTenant } from '@/lib/tenant/resolve';

// The tenant lookup hits Postgres, which rules out the edge runtime.
export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

const ROOT_ASSETS = new Set(['/icon.svg', '/favicon.ico', '/apple-icon.png']);

/**
 * Applies the security headers to a response and, for a document request, hands
 * Next the nonce it should put on its inline scripts.
 */
function secure(response: NextResponse, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp);
  for (const header of STATIC_SECURITY_HEADERS) {
    response.headers.set(header.key, header.value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64');
  const csp = buildCsp({
    nonce,
    // Uploads go from the browser straight to the object store, so its origin
    // has to be reachable from both `connect-src` and `img-src`.
    storageOrigin: originOf(process.env.NEXT_PUBLIC_MEDIA_URL ?? process.env.S3_ENDPOINT),
    isDevelopment: process.env.NODE_ENV !== 'production',
    // Behind the proxy the original scheme only survives in this header.
    isSecure:
      request.headers.get('x-forwarded-proto') === 'https' || request.nextUrl.protocol === 'https:',
  });

  // Next reads the policy off the *request* to find the nonce for its scripts.
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);

  const withHeaders = { request: { headers } };

  const rootDomain = process.env.ROOT_DOMAIN;
  if (!rootDomain) {
    // Failing closed here would take the whole platform down over a config
    // mistake; the health endpoint reports the real problem.
    return secure(NextResponse.next(withHeaders), csp);
  }

  const tenant = parseTenantHost(effectiveHost(request.headers), rootDomain);
  if (tenant.kind === 'platform') return secure(NextResponse.next(withHeaders), csp);

  // Auth and health stay on the platform surface even under a tenant host.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) return secure(NextResponse.next(withHeaders), csp);

  // Icons live at the application root, not per tenant. `/feed.xml`,
  // `/sitemap.xml` and `/robots.txt` deliberately do *not* belong here — those
  // are per-site and must be rewritten.
  if (ROOT_ASSETS.has(pathname)) return secure(NextResponse.next(withHeaders), csp);

  const siteId = await resolveTenant(tenant);
  if (!siteId) {
    return secure(
      new NextResponse('Diese Site gibt es nicht.', {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      }) as NextResponse,
      csp,
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = `/_sites/${siteId}${pathname === '/' ? '' : pathname}`;
  return secure(NextResponse.rewrite(url, withHeaders), csp);
}
