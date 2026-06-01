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

  let response = NextResponse.next({ request });

  // Keep the Supabase auth session fresh and synced to cookies so Server
  // Components can read an up-to-date session. Skipped when env isn't set.
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
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

    // Touching the user triggers a token refresh when needed; refreshed tokens
    // are written back onto `response` via setAll above.
    await supabase.auth.getUser();
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
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.json|sw\\.js|workbox-|api/).*)',
  ],
};
