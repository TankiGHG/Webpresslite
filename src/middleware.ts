import { NextResponse, type NextRequest } from 'next/server';
import { effectiveHost, parseTenantHost } from '@/lib/tenant/host';
import { resolveTenant } from '@/lib/tenant/resolve';

// The tenant lookup hits Postgres, which rules out the edge runtime.
export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export async function middleware(request: NextRequest) {
  const rootDomain = process.env.ROOT_DOMAIN;
  if (!rootDomain) {
    // Failing closed here would take the whole platform down over a config
    // mistake; the health endpoint reports the real problem.
    return NextResponse.next();
  }

  const tenant = parseTenantHost(effectiveHost(request.headers), rootDomain);
  if (tenant.kind === 'platform') return NextResponse.next();

  // Auth and health stay on the platform surface even under a tenant host.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) return NextResponse.next();

  const siteId = await resolveTenant(tenant);
  if (!siteId) {
    return new NextResponse('Diese Site gibt es nicht.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/_sites/${siteId}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}
