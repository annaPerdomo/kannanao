import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
} from '../../_lib/requireAuthenticatedUser';
import { getServiceSupabase } from '../../group/_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 5 };

/** POST — remove a push subscription for the authenticated user */
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

  const { endpoint } = body as { endpoint: string };
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint is required.' }, { status: 400 });
  }

  const sb = getServiceSupabase();
  const { error } = await sb
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  if (error) {
    logger.error('Failed to remove push subscription', {
      route: '/api/push/unsubscribe',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to remove subscription.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
