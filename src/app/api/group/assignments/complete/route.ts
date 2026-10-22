import { type NextRequest, NextResponse } from 'next/server';

import { availableNowFilter } from '@/lib/assignmentAvailability';
import { evaluateMastery } from '@/lib/assignmentMastery';
import { logger } from '@/lib/logger';
import { type WordProgress, wordsDone } from '@/lib/wordProgress';

import { getUserFromTokenResult } from '../../../_lib/authCache';
import { backendUnavailable } from '../../../_lib/backendUnavailable';
import { rateLimit } from '../../../_lib/rateLimit';
import { assignmentWordProgress } from '../../_lib/assignmentWordProgress';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

interface PendingAssignment {
  id: string;
  deck_id: string | null;
  kana_set: string | null;
  required_accuracy: number | null;
  required_mode: string | null;
  progress_accuracy: number | null;
  baseline_accuracy: number;
  goal_met_at: string | null;
  created_at: string;
}

const SELECT_COLUMNS =
  'id, deck_id, kana_set, required_accuracy, required_mode, progress_accuracy, baseline_accuracy, goal_met_at, created_at';

/**
 * POST — completes a pending deck, kana row, or (via `allDecks`) every open
 * deck after a Review session. A deck needs every word answered since handout
 * at the baseline share known, plus any mode goal; kana keeps the old any-study rule.
 */
export async function POST(req: NextRequest) {
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

  const auth = await getUserFromTokenResult(authHeader.slice(7));
  if (auth.error) return backendUnavailable(auth.error, 'group/assignments-complete.user');
  const user = auth.value;

  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const deckId = typeof body?.deckId === 'string' ? body.deckId : null;
  const kanaSet = typeof body?.kanaSet === 'string' ? body.kanaSet : null;
  const allDecks = body?.allDecks === true;
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;

  const shapeCount = [deckId, kanaSet, allDecks].filter(Boolean).length;
  if (shapeCount !== 1) {
    return NextResponse.json(
      { error: 'Exactly one of deckId, kanaSet or allDecks is required.' },
      { status: 400 },
    );
  }

  const sb = getServiceSupabase();

  if (allDecks) {
    return completeAllDecks(sb, user.id);
  }
  if (deckId) {
    return completeDeck(sb, user.id, deckId, sessionId);
  }
  return completeKana(sb, user.id, kanaSet as string, sessionId);
}

function pendingBase(sb: ReturnType<typeof getServiceSupabase>, userId: string) {
  return sb
    .from('assignments')
    .select(SELECT_COLUMNS)
    .eq('member_id', userId)
    .is('completed_at', null)
    .or(availableNowFilter());
}

async function findPending(
  sb: ReturnType<typeof getServiceSupabase>,
  userId: string,
  filter: (q: ReturnType<typeof pendingBase>) => PromiseLike<{
    data: PendingAssignment[] | null;
    error: { message: string } | null;
  }>,
): Promise<{ rows: PendingAssignment[] } | { error: string }> {
  const { data, error } = await filter(pendingBase(sb, userId));
  if (error) return { error: error.message };
  return { rows: data ?? [] };
}

async function recordProgress(
  sb: ReturnType<typeof getServiceSupabase>,
  progressUpdates: { id: string; accuracy: number }[],
): Promise<void> {
  if (progressUpdates.length === 0) return;
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
  }
}

async function markGoalMet(
  sb: ReturnType<typeof getServiceSupabase>,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await sb
    .from('assignments')
    .update({ goal_met_at: new Date().toISOString() })
    .in('id', ids);
  if (error) {
    logger.error('Failed to record a met mode goal', {
      route: '/api/group/assignments/complete',
      error: error.message,
    });
  }
}

async function markComplete(
  sb: ReturnType<typeof getServiceSupabase>,
  ids: string[],
): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  const { error } = await sb
    .from('assignments')
    .update({ completed_at: new Date().toISOString() })
    .in('id', ids);
  if (error) {
    logger.error('Failed to auto-complete assignments', {
      route: '/api/group/assignments/complete',
      error: error.message,
    });
    return { error: error.message };
  }
  return {};
}

async function wordsFor(
  sb: ReturnType<typeof getServiceSupabase>,
  userId: string,
  rows: PendingAssignment[],
): Promise<Map<string, WordProgress> | { error: true }> {
  try {
    return await assignmentWordProgress(sb, userId, rows);
  } catch (err) {
    logger.error('Failed to compute word progress for auto-complete', {
      route: '/api/group/assignments/complete',
      error: err instanceof Error ? err.message : String(err),
    });
    return { error: true };
  }
}

async function sessionStatsFor(
  sb: ReturnType<typeof getServiceSupabase>,
  userId: string,
  sessionId: string | null,
  deckId: string,
): Promise<{
  practice_mode: string | null;
  cards_studied: number;
  cards_correct: number;
  kana_set: string | null;
} | null> {
  if (!sessionId) return null;
  const { data: session } = await sb
    .from('study_sessions')
    .select('user_id, deck_id, kana_set, practice_mode, cards_studied, cards_correct')
    .eq('id', sessionId)
    .maybeSingle();
  if (session && session.user_id === userId && session.deck_id === deckId) return session;
  return null;
}

async function completeDeck(
  sb: ReturnType<typeof getServiceSupabase>,
  userId: string,
  deckId: string,
  sessionId: string | null,
): Promise<NextResponse> {
  const pending = await findPending(sb, userId, (q) => q.eq('deck_id', deckId));
  if ('error' in pending) {
    logger.error('Failed to query assignments for auto-complete', {
      route: '/api/group/assignments/complete',
      error: pending.error,
    });
    return NextResponse.json({ error: 'Failed to check assignments.' }, { status: 500 });
  }
  if (pending.rows.length === 0) {
    return NextResponse.json({ completed: 0 });
  }

  const wordsMap = await wordsFor(sb, userId, pending.rows);
  if ('error' in wordsMap) {
    return NextResponse.json({ error: 'Failed to check assignments.' }, { status: 500 });
  }
  const sessionStats = await sessionStatsFor(sb, userId, sessionId, deckId);

  const toComplete: string[] = [];
  const toMarkGoalMet: string[] = [];
  const progressUpdates: { id: string; accuracy: number }[] = [];
  const words: Record<string, WordProgress> = {};

  for (const a of pending.rows) {
    const progress = wordsMap.get(a.id) ?? { total: 0, seen: 0, known: 0 };
    words[a.id] = progress;

    const hasModeGoal = a.required_accuracy != null || a.required_mode != null;
    let goalDone = !hasModeGoal || a.goal_met_at != null;
    let masteryNow = false;

    // Still graded once the goal is already met, so progress_accuracy keeps
    // reflecting the best session even after the goal itself stops moving.
    if (hasModeGoal && sessionStats) {
      const outcome = evaluateMastery(a, sessionStats, progress.total);
      if (a.goal_met_at == null) {
        masteryNow = outcome.completes;
        goalDone = outcome.completes;
      }
      if (
        outcome.qualifyingAccuracy != null &&
        outcome.qualifyingAccuracy > (a.progress_accuracy ?? -1)
      ) {
        progressUpdates.push({ id: a.id, accuracy: outcome.qualifyingAccuracy });
      }
    }

    if (wordsDone(progress, a.baseline_accuracy) && goalDone) {
      toComplete.push(a.id);
    } else if (masteryNow && a.goal_met_at == null) {
      toMarkGoalMet.push(a.id);
    }
  }

  await recordProgress(sb, progressUpdates);
  await markGoalMet(sb, toMarkGoalMet);
  const { error } = await markComplete(sb, toComplete);
  if (error) {
    return NextResponse.json({ error: 'Failed to complete assignments.' }, { status: 500 });
  }

  return NextResponse.json({
    completed: toComplete.length,
    progressUpdated: progressUpdates.length,
    words,
  });
}

/** A Review session just ended: recheck every deck assignment whose mode goal (if any) is already satisfied. */
async function completeAllDecks(
  sb: ReturnType<typeof getServiceSupabase>,
  userId: string,
): Promise<NextResponse> {
  const pending = await findPending(sb, userId, (q) =>
    q
      .not('deck_id', 'is', null)
      .or('and(required_mode.is.null,required_accuracy.is.null),goal_met_at.not.is.null'),
  );
  if ('error' in pending) {
    logger.error('Failed to query assignments for auto-complete', {
      route: '/api/group/assignments/complete',
      error: pending.error,
    });
    return NextResponse.json({ error: 'Failed to check assignments.' }, { status: 500 });
  }
  if (pending.rows.length === 0) {
    return NextResponse.json({ completed: 0, progressUpdated: 0, words: {} });
  }

  const wordsMap = await wordsFor(sb, userId, pending.rows);
  if ('error' in wordsMap) {
    return NextResponse.json({ error: 'Failed to check assignments.' }, { status: 500 });
  }
  const toComplete: string[] = [];
  const words: Record<string, WordProgress> = {};

  for (const a of pending.rows) {
    const progress = wordsMap.get(a.id) ?? { total: 0, seen: 0, known: 0 };
    words[a.id] = progress;
    if (wordsDone(progress, a.baseline_accuracy)) toComplete.push(a.id);
  }

  const { error } = await markComplete(sb, toComplete);
  if (error) {
    return NextResponse.json({ error: 'Failed to complete assignments.' }, { status: 500 });
  }

  return NextResponse.json({ completed: toComplete.length, progressUpdated: 0, words });
}

async function completeKana(
  sb: ReturnType<typeof getServiceSupabase>,
  userId: string,
  kanaSet: string,
  sessionId: string | null,
): Promise<NextResponse> {
  const pending = await findPending(sb, userId, (q) => q.eq('kana_set', kanaSet));
  if ('error' in pending) {
    logger.error('Failed to query assignments for auto-complete', {
      route: '/api/group/assignments/complete',
      error: pending.error,
    });
    return NextResponse.json({ error: 'Failed to check assignments.' }, { status: 500 });
  }
  if (pending.rows.length === 0) {
    return NextResponse.json({ completed: 0 });
  }

  let sessionStats: {
    practice_mode: string | null;
    cards_studied: number;
    cards_correct: number;
    kana_set: string | null;
  } | null = null;
  if (sessionId) {
    const { data: session } = await sb
      .from('study_sessions')
      .select('user_id, deck_id, kana_set, practice_mode, cards_studied, cards_correct')
      .eq('id', sessionId)
      .maybeSingle();
    if (session && session.user_id === userId && session.kana_set === kanaSet) {
      sessionStats = session;
    }
  }

  const toComplete: string[] = [];
  const progressUpdates: { id: string; accuracy: number }[] = [];

  for (const a of pending.rows) {
    if (!sessionStats) continue;
    const outcome = evaluateMastery(a, sessionStats);
    if (outcome.completes) toComplete.push(a.id);
    if (
      outcome.qualifyingAccuracy != null &&
      outcome.qualifyingAccuracy > (a.progress_accuracy ?? -1)
    ) {
      progressUpdates.push({ id: a.id, accuracy: outcome.qualifyingAccuracy });
    }
  }

  await recordProgress(sb, progressUpdates);
  const { error } = await markComplete(sb, toComplete);
  if (error) {
    return NextResponse.json({ error: 'Failed to complete assignments.' }, { status: 500 });
  }

  return NextResponse.json({
    completed: toComplete.length,
    progressUpdated: progressUpdates.length,
  });
}
