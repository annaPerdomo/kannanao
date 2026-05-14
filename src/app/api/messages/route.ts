import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../_lib/rateLimit';
import { type AuthenticatedUser, requireAuthenticatedUser } from '../_lib/requireAuthenticatedUser';
import { sendPushToUser } from '../_lib/sendPushNotification';
import { getServiceSupabase } from '../group/_lib/serviceSupabase';

const RATE_LIMIT_POST = { windowMs: 60_000, max: 20 };
const RATE_LIMIT_GET = { windowMs: 60_000, max: 30 };

/** POST — send a direct message (member↔organizer or member↔member in same group) */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT_POST);
  if (limited) return limited;

  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;
  const sender = authCheck as AuthenticatedUser;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { recipientId, message, imageUrl } = body as {
    recipientId: string;
    message: string;
    imageUrl?: string;
  };

  if (!recipientId || (!message?.trim() && !imageUrl)) {
    return NextResponse.json(
      { error: 'recipientId and at least one of message or imageUrl are required.' },
      { status: 400 },
    );
  }

  // Validate imageUrl points to our Supabase Storage bucket
  if (imageUrl) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const allowedPrefix = `${supabaseUrl}/storage/v1/object/public/card-images/chat/`;
    if (!imageUrl.startsWith(allowedPrefix)) {
      return NextResponse.json(
        { error: 'imageUrl must be a valid uploaded chat image.' },
        { status: 400 },
      );
    }
  }

  if (recipientId === sender.id) {
    return NextResponse.json({ error: 'Cannot send messages to yourself.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // Validate sender↔recipient relationship
  if (sender.account_type === 'member') {
    if (!sender.organizer_id) {
      return NextResponse.json(
        { error: 'Member account not linked to an organizer.' },
        { status: 403 },
      );
    }
    // Members can message their organizer or other members in the same group
    if (recipientId !== sender.organizer_id) {
      const { data: peer } = await sb
        .from('profiles')
        .select('id')
        .eq('id', recipientId)
        .eq('organizer_id', sender.organizer_id)
        .single();

      if (!peer) {
        return NextResponse.json(
          { error: 'You can only message members in your group.' },
          { status: 403 },
        );
      }
    }
  } else {
    // Organizers can only message their own members
    const { data: member } = await sb
      .from('profiles')
      .select('id')
      .eq('id', recipientId)
      .eq('organizer_id', sender.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Recipient not found.' }, { status: 404 });
    }
  }

  const insertRow: Record<string, unknown> = {
    sender_id: sender.id,
    recipient_id: recipientId,
  };
  if (message?.trim()) insertRow.message = message.trim().slice(0, 500);
  if (imageUrl) insertRow.image_url = imageUrl;

  const { data, error } = await sb.from('direct_messages').insert(insertRow).select().single();

  if (error) {
    logger.error('Failed to send message', {
      route: '/api/messages',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }

  // Fire push notification (non-blocking)
  const senderName = sender.display_name || sender.username;
  const pushBody = message?.trim() ? message.trim().slice(0, 100) : '📷 Photo';
  sendPushToUser(recipientId, {
    title: `${senderName}`,
    body: pushBody,
    url: '/notifications',
  }).catch((err) => {
    logger.error('Push notification failed', { error: String(err) });
  });

  return NextResponse.json(data, { status: 201 });
}

/** GET — get messages for the current user */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT_GET);
  if (limited) return limited;

  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;
  const user = authCheck as AuthenticatedUser;

  const sb = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('memberId');

  let query = sb
    .from('direct_messages')
    .select(
      '*, sender:profiles!direct_messages_sender_id_fkey(display_name, username), recipient:profiles!direct_messages_recipient_id_fkey(display_name, username)',
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (memberId) {
    // Filter to specific conversation partner
    query = query.or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${memberId}),and(sender_id.eq.${memberId},recipient_id.eq.${user.id})`,
    );
  } else {
    // All messages involving this user
    query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch messages', {
      route: '/api/messages',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to load messages.' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
