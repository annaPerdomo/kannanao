import { type NextRequest, NextResponse } from 'next/server';

import { getProfileForUser, getUserFromToken } from './authCache';

export interface OrganizerProfile {
  id: string;
  username: string;
  account_type: string;
  display_name: string | null;
}

/**
 * Extracts the Bearer token, looks up the user's profile, and returns 403
 * if the account is a member. Returns the profile on success.
 * Verification is served from the short-lived authCache when warm.
 */
export async function requireOrganizerAccount(
  req: NextRequest,
): Promise<OrganizerProfile | NextResponse> {
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
  const user = await getUserFromToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const profile = await getProfileForUser(user.id, token);

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 401 });
  }

  if (profile.account_type === 'member') {
    return NextResponse.json(
      { error: 'This feature is not available for member accounts.' },
      { status: 403 },
    );
  }

  return profile as OrganizerProfile;
}
