import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
} from '../../../_lib/requireAuthenticatedUser';
import { getServiceSupabase } from '../../../group/_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

/** PATCH — mark a message as read (only the recipient can do this) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;
  const user = authCheck as AuthenticatedUser;

  const { id } = await params;

  const sb = getServiceSupabase();
  const { error } = await sb
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', user.id)
    .is('read_at', null);

  if (error) {
    logger.error('Failed to mark message as read', {
      route: `/api/messages/${id}/read`,
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to mark as read.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
