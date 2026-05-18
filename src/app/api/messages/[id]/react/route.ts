import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
} from '../../../_lib/requireAuthenticatedUser';
import { getServiceSupabase } from '../../../group/_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

/** POST — toggle an emoji reaction on a message (only participants can react) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;
  const user = authCheck as AuthenticatedUser;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body?.emoji || typeof body.emoji !== 'string') {
    return NextResponse.json({ error: 'emoji is required.' }, { status: 400 });
  }

  const emoji: string = body.emoji;

  // Limit emoji to a single grapheme cluster (max 32 chars to account for compound emojis)
  if (emoji.length > 32) {
    return NextResponse.json({ error: 'Invalid emoji.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // Fetch the message and verify the user is a participant
  const { data: msg, error: fetchErr } = await sb
    .from('direct_messages')
    .select('sender_id, recipient_id, reactions')
    .eq('id', id)
    .single();

  if (fetchErr || !msg) {
    return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
  }

  if (msg.sender_id !== user.id && msg.recipient_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant of this message.' }, { status: 403 });
  }

  // Toggle the reaction
  const reactions: Record<string, string[]> = msg.reactions || {};
  const users = reactions[emoji] || [];

  if (users.includes(user.id)) {
    // Remove this user's reaction
    const remaining = users.filter((uid: string) => uid !== user.id);
    if (remaining.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = remaining;
    }
  } else {
    // Add this user's reaction
    reactions[emoji] = [...users, user.id];
  }

  const { error: updateErr } = await sb.from('direct_messages').update({ reactions }).eq('id', id);

  if (updateErr) {
    logger.error('Failed to update reaction', {
      route: `/api/messages/${id}/react`,
      error: updateErr.message,
    });
    return NextResponse.json({ error: 'Failed to update reaction.' }, { status: 500 });
  }

  return NextResponse.json({ reactions });
}
