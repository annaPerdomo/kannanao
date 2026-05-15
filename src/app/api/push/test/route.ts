import { type NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '../../_lib/rateLimit';
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
} from '../../_lib/requireAuthenticatedUser';
import { sendPushToUser } from '../../_lib/sendPushNotification';

const RATE_LIMIT = { windowMs: 60_000, max: 3 };

/** POST — send a test push notification to the authenticated user's devices */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;
  const user = authCheck as AuthenticatedUser;

  await sendPushToUser(user.id, {
    title: 'Test notification',
    body: 'Push notifications are working!',
    url: '/notifications',
  });

  return NextResponse.json({ success: true });
}
