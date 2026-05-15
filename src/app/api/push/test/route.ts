import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

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

  try {
    await sendPushToUser(user.id, {
      title: 'Test notification',
      body: 'Push notifications are working!',
      url: '/notifications',
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Failed to send test push notification', { userId: user.id, error: err });
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
