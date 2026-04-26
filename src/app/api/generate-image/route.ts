import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '@/lib/logger';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType } = await req.json();
    if (!base64 || !mimeType) {
      return NextResponse.json({ error: 'base64 and mimeType required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, and WebP images are allowed' },
        { status: 400 },
      );
    }

    const imageBuffer = Buffer.from(base64, 'base64');

    if (imageBuffer.length > MAX_SIZE) {
      return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
        { status: 500 },
      );
    }

    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `${uuidv4()}.${ext}`;

    const sb = createClient(supabaseUrl, supabaseKey);
    const { error: uploadError } = await sb.storage
      .from('card-images')
      .upload(fileName, imageBuffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload image', detail: uploadError.message },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = sb.storage.from('card-images').getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    logger.error('Unhandled error', {
      route: '/api/generate-image',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'url required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
        { status: 500 },
      );
    }

    const match = url.match(/card-images\/([^?]+)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    const sb = createClient(supabaseUrl, supabaseKey);
    const { error } = await sb.storage.from('card-images').remove([match[1]]);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete image', detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
