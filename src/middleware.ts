import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export async function middleware(request: NextRequest) {
  // Redirect non-www to www to prevent duplicate content issues
  // flagged by Google Search Console.
  const host = request.headers.get('host') ?? '';
  if (host === 'kannanao.com' && process.env.NODE_ENV === 'production') {
    const url = request.nextUrl.clone();
    url.host = 'www.kannanao.com';
    return NextResponse.redirect(url, 308);
  }

  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.includes('-auth-token'));

  // Anonymous visitors to `/` get the statically prerendered landing page
  // (served from the CDN, no function invocation) instead of the dynamically
  // rendered dashboard route. The URL bar still shows `/`.
  if (request.nextUrl.pathname === '/' && !hasAuthCookie) {
    return NextResponse.rewrite(new URL('/landing', request.url));
  }

  let response = NextResponse.next({ request });

  // Keep the Supabase auth session fresh and synced to cookies so Server
  // Components can read an up-to-date session. Only signed-in requests do any
  // work, and we only pay the auth-server round-trip (getUser, which refreshes)
  // when the access token is actually near expiry — otherwise we skip it, since
  // the browser client auto-refreshes too. This avoids an auth round-trip on
  // every navigation.
  if (SUPABASE_URL && SUPABASE_ANON_KEY && hasAuthCookie) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // getSession() reads cookies locally (no network). Only refresh via getUser()
    // when the token is missing or within 5 minutes of expiring.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const expiresAtMs = (session?.expires_at ?? 0) * 1000;
    const needsRefresh = !session || expiresAtMs - Date.now() < 5 * 60 * 1000;
    if (needsRefresh) {
      await supabase.auth.getUser();
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icons, manifest, etc.
     * - embed/* — public, anonymous iframe surface (LMS/Canvas). It carries no
     *   auth cookie to refresh, and skipping the www-redirect here avoids
     *   redirecting inside third-party iframes (canonicalization is handled by
     *   the page's own canonical meta).
     * - robots.txt / sitemap.xml — static metadata files crawlers fetch often.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.json|sw\\.js|workbox-|api/|embed/|robots\\.txt|sitemap\\.xml).*)',
  ],
};
