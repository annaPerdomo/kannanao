import { type NextRequest, NextResponse } from 'next/server';

import { evaluateMastery } from '@/lib/assignmentMastery';
import { logger } from '@/lib/logger';

import { getUserFromToken } from '../../../_lib/authCache';
import { rateLimit } from '../../../_lib/rateLimit';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

interface PendingAssignment {
  id: string;
  required_accuracy: number | null;
  required_mode: string | null;
  progress_accuracy: number | null;
}

/**
 * POST — auto-complete a pending assignment when a member finishes studying a deck.
 * Accepts { deckId, sessionId? }. Assignments without mastery criteria complete
 * on any study (legacy behavior). Assignments with criteria are evaluated
 * against the finished session's stats (mode + accuracy, with a minimum card
 * floor); sessions that qualify but fall short update progress_accuracy so the
 * student sees their best attempt so far. No-ops gracefully if no matching
 * assignment exists.
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

  const user = await getUserFromToken(authHeader.slice(7));

  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const deckId = body?.deckId;
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
  if (!deckId || typeof deckId !== 'string') {
    return NextResponse.json({ error: 'deckId is required.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // Find pending assignment(s) for this user + deck
  const { data: pending, error: findError } = await sb
    .from('assignments')
    .select('id, required_accuracy, required_mode, progress_accuracy')
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

  const assignments = pending as PendingAssignment[];
  const withCriteria = assignments.filter(
    (a) => a.required_accuracy != null || a.required_mode != null,
  );

  // Criteria assignments need the session's stats. The session row is looked
  // up server-side (not trusted from the request body) and must belong to the
  // requester and the studied deck.
  let sessionStats: {
    practice_mode: string | null;
    cards_studied: number;
    cards_correct: number;
  } | null = null;
  if (withCriteria.length > 0 && sessionId) {
    const { data: session } = await sb
      .from('study_sessions')
      .select('user_id, deck_id, practice_mode, cards_studied, cards_correct')
      .eq('id', sessionId)
      .maybeSingle();
    if (session && session.user_id === user.id && session.deck_id === deckId) {
      sessionStats = session;
    }
  }

  // Caps the card floor at the deck's size so a deck smaller than the floor can
  // still be completed. Only fetched when a session actually has to be graded.
  let deckCardCount: number | null = null;
  if (sessionStats) {
    const { data: deck } = await sb
      .from('decks')
      .select('card_count')
      .eq('id', deckId)
      .maybeSingle();
    deckCardCount = deck?.card_count ?? null;
  }

  const toComplete: string[] = [];
  const progressUpdates: { id: string; accuracy: number }[] = [];

  for (const a of assignments) {
    const hasCriteria = a.required_accuracy != null || a.required_mode != null;
    if (!hasCriteria) {
      toComplete.push(a.id);
      continue;
    }
    if (!sessionStats) continue; // can't evaluate criteria without session stats
    const { completes, qualifyingAccuracy } = evaluateMastery(a, sessionStats, deckCardCount);
    if (completes) toComplete.push(a.id);
    if (qualifyingAccuracy != null && qualifyingAccuracy > (a.progress_accuracy ?? -1)) {
      progressUpdates.push({ id: a.id, accuracy: qualifyingAccuracy });
    }
  }

  // Record best-so-far accuracy (including for assignments completing now, so
  // the final score shows on the completed card).
  if (progressUpdates.length > 0) {
    const results = await Promise.all(
      progressUpdates.map(({ id, accuracy }) =>
        sb.from('assignments').update({ progress_accuracy: accuracy }).eq('id', id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      logger.error('Failed to update assignment progress', {
        route: '/api/group/assignments/complete',
        error: failed.error.message,
      });
      // Non-fatal: completion below is the part that must not be lost.
    }
  }

  if (toComplete.length === 0) {
    return NextResponse.json({ completed: 0, progressUpdated: progressUpdates.length });
  }

  const { error: updateError } = await sb
    .from('assignments')
    .update({ completed_at: new Date().toISOString() })
    .in('id', toComplete);

  if (updateError) {
    logger.error('Failed to auto-complete assignments', {
      route: '/api/group/assignments/complete',
      error: updateError.message,
    });
    return NextResponse.json({ error: 'Failed to complete assignments.' }, { status: 500 });
  }

  return NextResponse.json({
    completed: toComplete.length,
    progressUpdated: progressUpdates.length,
  });
}
