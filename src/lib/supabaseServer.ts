import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'YOUR_SUPABASE_ANON_KEY';

export function isServerConfigured(): boolean {
  return (
    SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
    SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
    SUPABASE_URL !== '' &&
    SUPABASE_ANON_KEY !== ''
  );
}

/**
 * Cookie-bound Supabase client for Server Components and Route Handlers.
 * Reads the auth session from request cookies so authenticated pages can be
 * rendered on the server. Cookie writes from a Server Component are no-ops
 * (Next.js disallows them) — the middleware is responsible for refreshing the
 * session cookie on each request.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component where cookies are read-only.
          // The middleware refreshes the session instead.
        }
      },
    },
  });
}
