import { type NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import { ALLOWED_CHAT_VIDEO_TYPES, MAX_CHAT_VIDEO_SIZE } from '@/lib/chatMedia';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireAuthenticatedUser } from '../../_lib/requireAuthenticatedUser';
import { getServiceSupabase } from '../../group/_lib/serviceSupabase';

// The video itself is never sent through this function — it goes straight from
// the browser to Supabase Storage via the signed URL this route mints, so a
// serverless function body-size limit (~4.5 MB on Vercel) never comes into
// play. The client checks MAX_CHAT_VIDEO_SIZE before uploading, and
// /api/messages independently re-checks the uploaded object's real size
// (via Storage metadata) before accepting the message — a client that skips
// or lies about the check still gets rejected server-side.
const RATE_LIMIT = { windowMs: 60_000, max: 10 };

/** POST — mint a signed upload URL for a chat video */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;

  try {
    const { mimeType } = await req.json();
    if (!mimeType) {
      return NextResponse.json({ error: 'mimeType required' }, { status: 400 });
    }

    if (!ALLOWED_CHAT_VIDEO_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Only MP4, WebM, and MOV videos are allowed' },
        { status: 400 },
      );
    }

    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('quicktime') ? 'mov' : 'mp4';
    const path = `chat-video/${uuidv4()}.${ext}`;

    const sb = getServiceSupabase();
    const { data, error } = await sb.storage.from('card-images').createSignedUploadUrl(path);

    if (error || !data) {
      logger.error('Failed to create signed upload URL', {
        route: '/api/messages/upload-video',
        error: error?.message,
      });
      return NextResponse.json({ error: 'Failed to prepare video upload' }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = sb.storage.from('card-images').getPublicUrl(path);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl,
      maxSize: MAX_CHAT_VIDEO_SIZE,
    });
  } catch (err) {
    logger.error('Unhandled error', {
      route: '/api/messages/upload-video',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
