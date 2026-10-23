import { type NextRequest, NextResponse } from 'next/server';

import { DEMO_ACCOUNT_BLOCKED } from '@/lib/demo/identity';

import { getUserFromTokenResult } from './authCache';
import { backendUnavailable } from './backendUnavailable';

/** 403s a demo account at a cost-incurring route. The demo password is shared and public. */
export function rejectDemo(
  profile: { isDemo?: boolean },
  code: string = DEMO_ACCOUNT_BLOCKED,
): NextResponse | null {
  if (profile.isDemo !== true) return null;
  return NextResponse.json({ error: code }, { status: 403 });
}

/** Like requireAuth, but also 403s a demo account — for cost routes any signed-in account can hit (Travel). */
export async function requireNonDemoAuth(req: NextRequest): Promise<string | NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const user = await getUserFromTokenResult(authHeader.slice(7));
  if (user.error) return backendUnavailable(user.error, 'requireNonDemoAuth');
  if (!user.value) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const blocked = rejectDemo({ isDemo: user.value.app_metadata?.demo === true });
  if (blocked) return blocked;

  return user.value.id;
}
