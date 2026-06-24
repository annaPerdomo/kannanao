import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
} from '../../_lib/requireAuthenticatedUser';
import { getServiceSupabase } from '../../group/_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 5 };

/** POST — save a push subscription for the authenticated user */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;
  const user = authCheck as AuthenticatedUser;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { endpoint, keys } = body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: 'endpoint and keys (p256dh, auth) are required.' },
      { status: 400 },
    );
  }

  const sb = getServiceSupabase();

  // A push endpoint identifies one physical device, but a device is often
  // shared within a group (e.g. a parent organizer and a child member on the
  // same iPad). Whoever signs in last owns the device's notifications — so
  // release any other user's claim on this endpoint before recording ours.
  // Without this, a stale row leaves the previous user subscribed on this
  // device, and a message the current user *sends* still pushes to that other
  // account here — the sender gets a notification for their own message.
  const { error: claimError } = await sb
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .neq('user_id', user.id);
  if (claimError) {
    // Non-fatal: still record this user's subscription below. The stale row
    // means the other account keeps getting this device's pushes until they
    // next open the app and re-subscribe, but that's better than dropping the
    // current user's subscription entirely.
    logger.error('Failed to release push endpoint from other users', {
      route: '/api/push/subscribe',
      error: claimError.message,
    });
  }

  const { error } = await sb.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: 'user_id,endpoint' },
  );

  if (error) {
    logger.error('Failed to save push subscription', {
      route: '/api/push/subscribe',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to save subscription.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
