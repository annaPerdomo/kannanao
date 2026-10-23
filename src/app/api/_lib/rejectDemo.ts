import { type NextRequest, NextResponse } from 'next/server';

import { DEMO_ACCOUNT_BLOCKED, isDemoUsername } from '@/lib/demo/identity';

import { getProfileForUserResult } from './authCache';
import { backendUnavailable } from './backendUnavailable';
import { requireAuth } from './requireAuth';

/** 403s a demo account at a cost-incurring route. The demo password is shared and public. */
export function rejectDemo(
  profile: { username: string },
  code: string = DEMO_ACCOUNT_BLOCKED,
): NextResponse | null {
  if (!isDemoUsername(profile.username)) return null;
  return NextResponse.json({ error: code }, { status: 403 });
}

/** requireAuth plus the same demo-account 403, for cost routes any signed-in account can hit (Travel). */
export async function requireNonDemoAuth(req: NextRequest): Promise<string | NextResponse> {
  const userId = await requireAuth(req);
  if (userId instanceof NextResponse) return userId;

  const token = req.headers.get('authorization')!.slice(7);
  const profile = await getProfileForUserResult(userId, token);
  if (profile.error) return backendUnavailable(profile.error, 'requireNonDemoAuth');
  if (profile.value) {
    const blocked = rejectDemo(profile.value);
    if (blocked) return blocked;
  }
  return userId;
}
