import { type NextRequest, NextResponse } from 'next/server';

import { getUserFromToken } from './authCache';

/**
 * Extracts the Bearer token and validates the user via Supabase.
 * Returns the user ID on success, or a 401 NextResponse on failure.
 * Unlike requireOrganizerAccount, this allows any account type.
 * Verification is served from the short-lived authCache when warm.
 */
export async function requireAuth(req: NextRequest): Promise<string | NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const user = await getUserFromToken(authHeader.slice(7));

  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  return user.id;
}
