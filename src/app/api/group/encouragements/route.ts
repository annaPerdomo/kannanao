import { after, type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { sendPushToUser } from '../../_lib/sendPushNotification';
import { isMemberOfOrganizer } from '../_lib/membership';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/** POST — organizer sends an encouragement as a direct message to a member */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { memberId, message, emoji } = body as {
    memberId: string;
    message: string;
    emoji?: string;
  };

  if (!memberId || !message?.trim()) {
    return NextResponse.json({ error: 'memberId and message are required.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  if (!(await isMemberOfOrganizer(memberId, orgCheck.id))) {
    return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  }

  // Build the message text with emoji prefix
  const emojiChar = emoji || '⭐';
  const fullMessage = `${emojiChar} ${message.trim().slice(0, 200)}`;

  const { data, error } = await sb
    .from('direct_messages')
    .insert({
      sender_id: orgCheck.id,
      recipient_id: memberId,
      message: fullMessage,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to send encouragement', {
      route: '/api/group/encouragements',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to send encouragement.' }, { status: 500 });
  }

  // Best-effort: the nudge already went through, so a stamp failure shouldn't fail the request.
  const { error: stampError } = await sb
    .from('profiles')
    .update({ last_nudged_at: new Date().toISOString() })
    .eq('id', memberId);
  if (stampError) {
    logger.error('Failed to stamp last_nudged_at', {
      route: '/api/group/encouragements',
      error: stampError.message,
    });
  }

  // Fire push notification after the response — after() keeps the serverless
  // function alive until the push completes (a floating promise gets frozen).
  const senderName = orgCheck.display_name || orgCheck.username;
  after(
    sendPushToUser(memberId, {
      title: `${emojiChar} ${senderName}`,
      body: message.trim().slice(0, 100),
      url: `/notifications/${orgCheck.id}`,
    }).catch((err) => {
      logger.error('Encouragement push failed', { error: String(err) });
    }),
  );

  return NextResponse.json(data, { status: 201 });
}
