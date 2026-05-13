import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
} from '../../_lib/requireAuthenticatedUser';
import { getServiceSupabase } from '../../group/_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

/** POST — mark all unread messages as read for the current user, optionally scoped to a sender */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;
  const user = authCheck as AuthenticatedUser;

  const body = await req.json().catch(() => null);
  const senderId = (body as { senderId?: string } | null)?.senderId;

  const sb = getServiceSupabase();

  let query = sb
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null);

  if (senderId) {
    query = query.eq('sender_id', senderId);
  }

  const { error } = await query;

  if (error) {
    logger.error('Failed to mark all messages as read', {
      route: '/api/messages/read-all',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to mark messages as read.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
