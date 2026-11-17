import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME, verifyTokenEdge } from '@/lib/token-edge';
import { canAccessPage, getDefaultLandingRoute } from '@/lib/permissions';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow static assets, internal Next.js routes, auth login/logout, and design preview
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/favicon.png') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/design-preview')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value || req.cookies.get(LEGACY_AUTH_COOKIE_NAME)?.value;
  // Cryptographically verify signature and expiry using Edge-compatible Web Crypto
  const user = token ? await verifyTokenEdge(token) : null;

  // 2. If user is accessing /login
  if (pathname === '/login') {
    if (user) {
      // Already authenticated, redirect to user's landing page
      const landing = getDefaultLandingRoute(user);
      return NextResponse.redirect(new URL(landing, req.url));
    }
    return NextResponse.next();
  }

  // 3. For any other page / API: if not authenticated or signature invalid, redirect/return 401
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Redirect standalone /request-report into /requests?new=1 drawer
  if (pathname.startsWith('/request-report')) {
    return NextResponse.redirect(new URL('/requests?new=1', req.url));
  }

  // 5. Role & Department-based page and route protection
  if (!pathname.startsWith('/api/')) {
    if (!canAccessPage(user, pathname)) {
      const defaultLanding = getDefaultLandingRoute(user);
      const targetUrl = new URL(defaultLanding, req.url);
      targetUrl.searchParams.set('access_denied', '1');
      return NextResponse.redirect(targetUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
