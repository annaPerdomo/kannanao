import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { type Locale, LOCALE_COOKIE, LOCALES } from '@/i18n/config';
import { APP_DOMAIN } from '@/lib/brand';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const EN_LANDING = '/landing';
const JA_LANDING = '/landing/ja';

/**
 * Which landing an anonymous `/` visitor gets: cookie, then Accept-Language,
 * then English.
 *
 * The cookie comes first because it is the only signal the visitor chose on
 * purpose — the NavBar's language menu writes it. A Japanese browser whose
 * owner clicked EN must keep getting English, which is why an explicit pick is
 * not merely a tiebreak against the header.
 *
 * VARY: this decision now depends on the NEXT_LOCALE cookie and the
 * Accept-Language header, so the response to `/` is no longer a pure function
 * of its URL. It stays correct because middleware runs per request and only the
 * rewrite TARGET is cached — /landing and /landing/ja are separate static
 * entries under their own paths. Nothing may start caching the `/` response
 * itself without keying on both of those inputs.
 */
function pickLandingPath(request: NextRequest): string {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && LOCALES.includes(cookie as Locale)) {
    return cookie === 'ja' ? JA_LANDING : EN_LANDING;
  }

  // First language wins, per the header's own preference order. We deliberately
  // don't parse q-values: browsers already send the list in descending order,
  // and the two-language pick doesn't earn a full negotiator.
  const preferred = request.headers.get('accept-language')?.split(',')[0]?.trim().toLowerCase();
  return preferred?.startsWith('ja') ? JA_LANDING : EN_LANDING;
}

export async function middleware(request: NextRequest) {
  // Redirect non-www to www to prevent duplicate content issues
  // flagged by Google Search Console.
  const host = request.headers.get('host') ?? '';
  if (host === APP_DOMAIN && process.env.NODE_ENV === 'production') {
    const url = request.nextUrl.clone();
    url.host = `www.${APP_DOMAIN}`;
    return NextResponse.redirect(url, 308);
  }

  // Supabase SSR stores the session in cookies named `sb-<project-ref>-auth-token`
  // (optionally chunked with a `.0`/`.1` suffix). Match that specific shape so
  // an unrelated cookie can't accidentally suppress the anonymous landing rewrite.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name));

  // Anonymous visitors to `/` get the statically prerendered landing page in
  // their language (served from the CDN, no function invocation) instead of the
  // dynamically rendered dashboard route. The URL bar still shows `/`.
  //
  // Only `/` is picked for. /landing/ja stays directly reachable and always
  // serves Japanese — hreflang points at it and the toggle links to it, and a
  // URL that quietly served a different language than the one it names would
  // break both. /landing has no such guarantee to keep: next.config.ts 308s it
  // back to `/`, so it is reachable only through this rewrite.
  if (request.nextUrl.pathname === '/' && !hasAuthCookie) {
    return NextResponse.rewrite(new URL(pickLandingPath(request), request.url));
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
