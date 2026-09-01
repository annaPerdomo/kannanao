import { type NextRequest, NextResponse } from 'next/server';

import { getProfileForUserResult, getUserFromTokenResult } from './authCache';
import { backendUnavailable } from './backendUnavailable';

export interface AuthenticatedUser {
  id: string;
  username: string;
  account_type: string;
  organizer_id: string | null;
  group_id: string | null;
  display_name: string | null;
}

/**
 * Extracts the Bearer token and looks up the user's profile.
 * Unlike requireOrganizerAccount, this allows both organizer and member accounts.
 * Verification is served from the short-lived authCache when warm.
 */
export async function requireAuthenticatedUser(
  req: NextRequest,
): Promise<AuthenticatedUser | NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const token = authHeader.slice(7);
  const user = await getUserFromTokenResult(token);
  if (user.error) return backendUnavailable(user.error, 'requireAuthenticatedUser.user');

  if (!user.value) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const profile = await getProfileForUserResult(user.value.id, token);
  if (profile.error) return backendUnavailable(profile.error, 'requireAuthenticatedUser.profile');

  if (!profile.value) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 401 });
  }

  return profile.value as AuthenticatedUser;
}
