import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

/**
 * POST — auto-complete a pending assignment when a member finishes studying a deck.
 * Accepts { deckId } and completes any pending assignment for the authenticated user + deck.
 * No-ops gracefully if no matching assignment exists.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  // Authenticate the user (any account type)
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const supabase = createClient(url, anonKey);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.slice(7));

  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const deckId = body?.deckId;
  if (!deckId || typeof deckId !== 'string') {
    return NextResponse.json({ error: 'deckId is required.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // Find pending assignment(s) for this user + deck
  const { data: pending, error: findError } = await sb
    .from('assignments')
    .select('id')
    .eq('member_id', user.id)
    .eq('deck_id', deckId)
    .is('completed_at', null);

  if (findError) {
    logger.error('Failed to query assignments for auto-complete', {
      route: '/api/group/assignments/complete',
      error: findError.message,
    });
    return NextResponse.json({ error: 'Failed to check assignments.' }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ completed: 0 });
  }

  const ids = pending.map((a) => a.id);
  const { error: updateError } = await sb
    .from('assignments')
    .update({ completed_at: new Date().toISOString() })
    .in('id', ids);

  if (updateError) {
    logger.error('Failed to auto-complete assignments', {
      route: '/api/group/assignments/complete',
      error: updateError.message,
    });
    return NextResponse.json({ error: 'Failed to complete assignments.' }, { status: 500 });
  }

  return NextResponse.json({ completed: ids.length });
}
