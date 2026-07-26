import { after, type NextRequest, NextResponse } from 'next/server';

import { MAX_CHAT_VIDEO_SIZE } from '@/lib/chatMedia';
import { logger } from '@/lib/logger';
import { parseSticker } from '@/lib/stickers';

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

  const { recipientId, message, imageUrl, videoUrl } = body as {
    recipientId: string;
    message: string;
    imageUrl?: string;
    videoUrl?: string;
  };

  if (!recipientId || (!message?.trim() && !imageUrl && !videoUrl)) {
    return NextResponse.json(
      { error: 'recipientId and at least one of message, imageUrl, or videoUrl are required.' },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';

  // Validate imageUrl points to our Supabase Storage bucket
  if (imageUrl) {
    const allowedPrefix = `${supabaseUrl}/storage/v1/object/public/card-images/chat/`;
    if (!imageUrl.startsWith(allowedPrefix)) {
      return NextResponse.json(
        { error: 'imageUrl must be a valid uploaded chat image.' },
        { status: 400 },
      );
    }
  }

  // Validate videoUrl points to our Supabase Storage bucket
  const videoBucketPrefix = `${supabaseUrl}/storage/v1/object/public/card-images/`;
  if (videoUrl) {
    if (!videoUrl.startsWith(`${videoBucketPrefix}chat-video/`)) {
      return NextResponse.json(
        { error: 'videoUrl must be a valid uploaded chat video.' },
        { status: 400 },
      );
    }
  }

  if (recipientId === sender.id) {
    return NextResponse.json({ error: 'Cannot send messages to yourself.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // The client checks file size before uploading, but that's only a UX nicety
  // — a client that skips it (or a stale build) can still push bytes straight
  // to Storage via the signed URL. Re-check the real, storage-reported size
  // here (not `Content-Length` off the CDN, which isn't guaranteed present)
  // before the message is allowed to reference it, so an oversized upload is
  // rejected with a clear reason instead of silently succeeding.
  if (videoUrl) {
    const objectPath = videoUrl.slice(videoBucketPrefix.length); // e.g. "chat-video/uuid.mp4"
    const dir = objectPath.slice(0, objectPath.lastIndexOf('/'));
    const filename = objectPath.slice(objectPath.lastIndexOf('/') + 1);
    const { data: listing } = await sb.storage.from('card-images').list(dir, { search: filename });
    const size = listing?.find((f) => f.name === filename)?.metadata?.size;
    if (!size || size > MAX_CHAT_VIDEO_SIZE) {
      await sb.storage.from('card-images').remove([objectPath]);
      return NextResponse.json({ error: 'Video must be under 20 MB.' }, { status: 400 });
    }
  }

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
  if (videoUrl) insertRow.video_url = videoUrl;

  // Return the row with the same profile joins as GET so client caches that
  // prepend it can resolve display names without a refetch.
  const { data, error } = await sb
    .from('direct_messages')
    .insert(insertRow)
    .select(
      '*, sender:profiles!direct_messages_sender_id_fkey(display_name, username), recipient:profiles!direct_messages_recipient_id_fkey(display_name, username)',
    )
    .single();

  if (error) {
    logger.error('Failed to send message', {
      route: '/api/messages',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }

  // Fire push notification after the response is sent. after() keeps the
  // serverless function alive until the push completes — a bare floating
  // promise gets frozen with the lambda and often never delivers.
  const senderName = sender.display_name || sender.username;
  const text = message?.trim();
  const mediaKind = videoUrl ? 'video' : imageUrl ? 'photo' : null;
  // A sticker rides along as its keyword token — a push saying ":wave:" would
  // be gibberish, so name it and show the sticker's stand-in emoji instead.
  const sticker = mediaKind ? null : parseSticker(text);
  after(
    sendPushToUser(recipientId, {
      // Keep the title short — iOS truncates around 30 characters and
      // already appends "from Tangodachi" with the app icon
      title: `${senderName} sent you a ${sticker ? 'sticker' : text ? 'message' : (mediaKind ?? 'message')}! 🌸`,
      body: sticker ? sticker.emoji : text ? text.slice(0, 100) : videoUrl ? '🎥' : '📷',
      url: `/notifications/${sender.id}`,
    }).catch((err) => {
      logger.error('Push notification failed', { error: String(err) });
    }),
  );

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
  const before = searchParams.get('before');

  if (before && Number.isNaN(Date.parse(before))) {
    return NextResponse.json({ error: 'before must be a valid timestamp.' }, { status: 400 });
  }

  let query = sb
    .from('direct_messages')
    .select(
      '*, sender:profiles!direct_messages_sender_id_fkey(display_name, username), recipient:profiles!direct_messages_recipient_id_fkey(display_name, username)',
    )
    .order('created_at', { ascending: false })
    .limit(50);

  // Cursor for paging back through history: only messages older than `before`
  if (before) query = query.lt('created_at', before);

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
