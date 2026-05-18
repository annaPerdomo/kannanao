import { type NextRequest, NextResponse } from 'next/server';

/**
 * Redirect non-www to www to prevent duplicate content issues
 * flagged by Google Search Console.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';

  if (host === 'kannanao.com' && process.env.NODE_ENV === 'production') {
    const url = request.nextUrl.clone();
    url.host = 'www.kannanao.com';
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icons, manifest, etc.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.json|sw\\.js|workbox-|api/).*)',
  ],
};
