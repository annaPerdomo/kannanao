import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

export interface OrganizerProfile {
  id: string;
  username: string;
  account_type: string;
}

/**
 * Extracts the Bearer token, looks up the user's profile, and returns 403
 * if the account is a member. Returns the profile on success.
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

  const supabase = createClient(url, anonKey);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.slice(7));

  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, account_type')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
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
