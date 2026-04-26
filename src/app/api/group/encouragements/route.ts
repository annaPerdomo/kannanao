import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/** POST — organizer sends an encouragement to a member */
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
    return NextResponse.json(
      { error: 'memberId and message are required.' },
      { status: 400 },
    );
  }

  const sb = getServiceSupabase();

  // Verify member belongs to organizer
  const { data: member } = await sb
    .from('profiles')
    .select('id')
    .eq('id', memberId)
    .eq('organizer_id', orgCheck.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  }

  const { data, error } = await sb
    .from('encouragements')
    .insert({
      organizer_id: orgCheck.id,
      member_id: memberId,
      message: message.trim().slice(0, 200),
      emoji: emoji || '⭐',
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

  return NextResponse.json(data, { status: 201 });
}

/** GET — member gets their encouragements (unread + recent read) */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const userClient = createClient(url, anonKey);
  const {
    data: { user },
  } = await userClient.auth.getUser(authHeader.slice(7));
  if (!user) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });
  }

  const sb = getServiceSupabase();

  // Get organizer name for display
  const { data: profile } = await sb
    .from('profiles')
    .select('organizer_id')
    .eq('id', user.id)
    .single();

  const { data, error } = await sb
    .from('encouragements')
    .select('*, profiles!encouragements_organizer_id_fkey(display_name, username)')
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    logger.error('Failed to fetch encouragements', {
      route: '/api/group/encouragements',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to load encouragements.' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
