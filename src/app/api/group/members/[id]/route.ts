import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/** GET — detailed member stats (sessions, achievements, deck progress) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { id: memberId } = await params;
  const sb = getServiceSupabase();

  // Verify this member belongs to the organizer
  const { data: member, error: memberErr } = await sb
    .from('profiles')
    .select('id, username, display_name')
    .eq('id', memberId)
    .eq('organizer_id', orgCheck.id)
    .single();

  if (memberErr || !member) {
    return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  }

  // Fetch all data in parallel
  const [progressRes, sessionsRes, achievementsRes, deckSharesRes] = await Promise.all([
    sb
      .from('user_progress')
      .select('total_xp, level, streak_days, total_cards_studied, total_correct, total_sessions')
      .eq('user_id', memberId)
      .maybeSingle(),
    sb
      .from('study_sessions')
      .select(
        'id, deck_id, practice_mode, cards_studied, cards_correct, xp_earned, duration_secs, started_at, ended_at',
      )
      .eq('user_id', memberId)
      .order('started_at', { ascending: false })
      .limit(20),
    sb
      .from('user_achievements')
      .select('achievement_key, unlocked_at')
      .eq('user_id', memberId)
      .order('unlocked_at', { ascending: false }),
    sb
      .from('deck_shares')
      .select('deck_id, decks(id, name, emoji)')
      .eq('shared_with', memberId)
      .eq('owner_id', orgCheck.id),
  ]);

  if (progressRes.error) {
    logger.error('Failed to fetch member progress', {
      route: `/api/group/members/${memberId}`,
      error: progressRes.error.message,
    });
  }

  // Compute per-deck progress from sessions
  const sessions = sessionsRes.data ?? [];
  const deckShares = deckSharesRes.data ?? [];

  // Aggregate sessions by deck
  const deckStats = new Map<
    string,
    { studied: number; correct: number; lastStudied: string | null }
  >();
  for (const s of sessions) {
    if (!s.deck_id) continue;
    const existing = deckStats.get(s.deck_id) ?? { studied: 0, correct: 0, lastStudied: null };
    existing.studied += s.cards_studied ?? 0;
    existing.correct += s.cards_correct ?? 0;
    if (!existing.lastStudied || s.started_at > existing.lastStudied) {
      existing.lastStudied = s.started_at;
    }
    deckStats.set(s.deck_id, existing);
  }

  const deckProgress = deckShares.map((ds) => {
    const deck = ds.decks as unknown as { id: string; name: string; emoji: string | null } | null;
    const stats = deckStats.get(ds.deck_id);
    return {
      deckId: ds.deck_id,
      deckName: deck?.name ?? 'Unknown',
      deckEmoji: deck?.emoji ?? null,
      cardsStudied: stats?.studied ?? 0,
      cardsCorrect: stats?.correct ?? 0,
      accuracy: stats && stats.studied > 0 ? Math.round((stats.correct / stats.studied) * 100) : 0,
      lastStudied: stats?.lastStudied ?? null,
    };
  });

  const prog = progressRes.data;

  return NextResponse.json({
    member: {
      id: member.id,
      username: member.username,
      displayName: member.display_name,
    },
    progress: {
      totalXp: prog?.total_xp ?? 0,
      level: prog?.level ?? 1,
      streakDays: prog?.streak_days ?? 0,
      totalCardsStudied: prog?.total_cards_studied ?? 0,
      totalCorrect: prog?.total_correct ?? 0,
      totalSessions: prog?.total_sessions ?? 0,
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      deckId: s.deck_id,
      practiceMode: s.practice_mode,
      cardsStudied: s.cards_studied,
      cardsCorrect: s.cards_correct,
      xpEarned: s.xp_earned,
      durationSecs: s.duration_secs,
      startedAt: s.started_at,
      endedAt: s.ended_at,
    })),
    achievements: (achievementsRes.data ?? []).map((a) => ({
      key: a.achievement_key,
      unlockedAt: a.unlocked_at,
    })),
    deckProgress,
  });
}
