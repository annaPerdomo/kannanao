import { type NextRequest, NextResponse } from 'next/server';

import { countStrengths } from '@/lib/cardStrength';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../../_lib/requireOrganizerAccount';
import { isMemberOfOrganizer } from '../../_lib/membership';
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

  if (!(await isMemberOfOrganizer(memberId, orgCheck.id))) {
    return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  }

  const { data: member, error: memberErr } = await sb
    .from('profiles')
    .select('id, username, display_name')
    .eq('id', memberId)
    .single();

  if (memberErr || !member) {
    return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  }

  // Fetch all data in parallel
  const [
    progressRes,
    sessionsRes,
    achievementsRes,
    deckSharesRes,
    assignmentsRes,
    allSessionsRes,
    weakWordsRes,
  ] = await Promise.all([
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
    sb
      .from('assignments')
      .select(
        'id, deck_id, title, note, due_date, completed_at, created_at, required_accuracy, required_mode, progress_accuracy, decks(name, emoji)',
      )
      .eq('member_id', memberId)
      .eq('organizer_id', orgCheck.id)
      .order('created_at', { ascending: false }),
    // Lightweight query for per-mode aggregation across ALL sessions
    sb
      .from('study_sessions')
      .select('deck_id, practice_mode, cards_studied, cards_correct, xp_earned, duration_secs')
      .eq('user_id', memberId),
    // Weak words: cards this member has gotten wrong at least once, joined to
    // the card + deck so the teacher sees the actual word, not an id. Ranking
    // by wrong-rate happens in JS below (bounded to one member's rows).
    sb
      .from('card_progress')
      .select(
        'card_id, correct_count, wrong_count, last_reviewed_at, cards!inner(word, reading, meaning, decks(name))',
      )
      .eq('user_id', memberId)
      .gt('wrong_count', 0),
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

  // Mastery needs each shared deck's full card list, not just cards this
  // member has answered — else a never-seen card is invisible instead of "new".
  const deckIds = deckShares.map((ds) => ds.deck_id);
  const [cardsRes, cardProgressRes] =
    deckIds.length > 0
      ? await Promise.all([
          sb.from('cards').select('id, deck_id').in('deck_id', deckIds),
          sb.from('card_progress').select('card_id, interval_days, ease').eq('user_id', memberId),
        ])
      : [{ data: [] }, { data: [] }];

  const cardsByDeck = new Map<string, string[]>();
  for (const c of (cardsRes.data ?? []) as { id: string; deck_id: string }[]) {
    const list = cardsByDeck.get(c.deck_id) ?? [];
    list.push(c.id);
    cardsByDeck.set(c.deck_id, list);
  }
  const cardProgress = (
    (cardProgressRes.data ?? []) as {
      card_id: string;
      interval_days: number;
      ease: number;
    }[]
  ).map((row) => ({ cardId: row.card_id, intervalDays: row.interval_days, ease: row.ease }));

  // Aggregate sessions by deck + speech practice
  const deckStats = new Map<
    string,
    { studied: number; correct: number; lastStudied: string | null }
  >();
  const speechModes = new Map<
    string,
    { sessions: number; lines: number; correct: number; xp: number; lastPracticed: string | null }
  >();

  for (const s of sessions) {
    if (!s.deck_id && s.practice_mode?.startsWith('speech_')) {
      const mode = s.practice_mode;
      const existing = speechModes.get(mode) ?? {
        sessions: 0,
        lines: 0,
        correct: 0,
        xp: 0,
        lastPracticed: null,
      };
      existing.sessions += 1;
      existing.lines += s.cards_studied ?? 0;
      existing.correct += s.cards_correct ?? 0;
      existing.xp += s.xp_earned ?? 0;
      if (!existing.lastPracticed || s.started_at > existing.lastPracticed) {
        existing.lastPracticed = s.started_at;
      }
      speechModes.set(mode, existing);
      continue;
    }

    if (!s.deck_id) continue;
    const existing = deckStats.get(s.deck_id) ?? { studied: 0, correct: 0, lastStudied: null };
    existing.studied += s.cards_studied ?? 0;
    existing.correct += s.cards_correct ?? 0;
    if (!existing.lastStudied || s.started_at > existing.lastStudied) {
      existing.lastStudied = s.started_at;
    }
    deckStats.set(s.deck_id, existing);
  }

  // Build speech progress summary
  let speechTotalSessions = 0;
  let speechTotalLines = 0;
  let speechTotalCorrect = 0;
  let speechTotalXp = 0;
  let speechLastPracticed: string | null = null;

  const speechByMode = [] as {
    mode: string;
    sessions: number;
    lines: number;
    correct: number;
    xp: number;
    accuracy: number;
    lastPracticed: string | null;
  }[];

  for (const [mode, stats] of speechModes) {
    speechTotalSessions += stats.sessions;
    speechTotalLines += stats.lines;
    speechTotalCorrect += stats.correct;
    speechTotalXp += stats.xp;
    if (
      !speechLastPracticed ||
      (stats.lastPracticed && stats.lastPracticed > speechLastPracticed)
    ) {
      speechLastPracticed = stats.lastPracticed;
    }
    speechByMode.push({
      mode,
      sessions: stats.sessions,
      lines: stats.lines,
      correct: stats.correct,
      xp: stats.xp,
      accuracy: stats.lines > 0 ? Math.round((stats.correct / stats.lines) * 100) : 0,
      lastPracticed: stats.lastPracticed,
    });
  }

  const speechProgress =
    speechTotalSessions > 0
      ? {
          totalSessions: speechTotalSessions,
          totalLines: speechTotalLines,
          totalCorrect: speechTotalCorrect,
          totalXp: speechTotalXp,
          accuracy:
            speechTotalLines > 0 ? Math.round((speechTotalCorrect / speechTotalLines) * 100) : 0,
          lastPracticed: speechLastPracticed,
          byMode: speechByMode,
        }
      : null;

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
      mastery: countStrengths(cardsByDeck.get(ds.deck_id) ?? [], cardProgress),
    };
  });

  const totalMastery = countStrengths(Array.from(cardsByDeck.values()).flat(), cardProgress);

  // Aggregate per-practice-mode stats from ALL sessions, grouped by source (deck vs speech)
  type ModeAgg = {
    mode: string;
    source: 'deck' | 'speech';
    sessions: number;
    cards: number;
    correct: number;
    xp: number;
    totalSecs: number;
  };
  const modeAgg = new Map<string, ModeAgg>();
  for (const s of allSessionsRes.data ?? []) {
    const mode = s.practice_mode || 'study';
    const source = s.deck_id ? 'deck' : 'speech';
    const key = `${source}:${mode}`;
    const existing = modeAgg.get(key) ?? {
      mode,
      source,
      sessions: 0,
      cards: 0,
      correct: 0,
      xp: 0,
      totalSecs: 0,
    };
    existing.sessions += 1;
    existing.cards += s.cards_studied ?? 0;
    existing.correct += s.cards_correct ?? 0;
    existing.xp += s.xp_earned ?? 0;
    existing.totalSecs += s.duration_secs ?? 0;
    modeAgg.set(key, existing);
  }

  const practiceModeStats = Array.from(modeAgg.values())
    .map((stats) => ({
      mode: stats.mode,
      source: stats.source,
      sessions: stats.sessions,
      cardsStudied: stats.cards,
      cardsCorrect: stats.correct,
      accuracy: stats.cards > 0 ? Math.round((stats.correct / stats.cards) * 100) : 0,
      xpEarned: stats.xp,
      totalDurationSecs: stats.totalSecs,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  // Build assignment completion info
  const rawAssignments = assignmentsRes.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const completedCount = rawAssignments.filter((a) => a.completed_at).length;
  const pendingCount = rawAssignments.length - completedCount;
  const overdueCount = rawAssignments.filter(
    (a) => !a.completed_at && a.due_date && a.due_date < today,
  ).length;

  const assignments = {
    total: rawAssignments.length,
    completed: completedCount,
    pending: pendingCount,
    overdue: overdueCount,
    completionRate:
      rawAssignments.length > 0 ? Math.round((completedCount / rawAssignments.length) * 100) : 0,
    items: rawAssignments.map((a) => {
      const deck = a.decks as unknown as { name: string; emoji: string | null } | null;
      return {
        id: a.id,
        title: a.title,
        deckName: deck?.name ?? 'Unknown',
        deckEmoji: deck?.emoji ?? null,
        dueDate: a.due_date,
        completedAt: a.completed_at,
        createdAt: a.created_at,
        requiredAccuracy: a.required_accuracy,
        requiredMode: a.required_mode,
        progressAccuracy: a.progress_accuracy,
      };
    }),
  };

  // Weak words — rank by wrong-rate, then raw wrong count, cap at 20. A card
  // missed 3/4 times ranks above one missed 5/50 even though the latter has
  // more total misses, so the teacher sees genuinely tricky words first.
  type WeakRow = {
    card_id: string;
    correct_count: number;
    wrong_count: number;
    last_reviewed_at: string | null;
    cards: {
      word: string;
      reading: string | null;
      meaning: string | null;
      decks: { name: string } | null;
    } | null;
  };
  const weakWords = ((weakWordsRes.data ?? []) as unknown as WeakRow[])
    .map((row) => {
      const total = row.correct_count + row.wrong_count;
      return {
        cardId: row.card_id,
        word: row.cards?.word ?? '',
        reading: row.cards?.reading ?? null,
        meaning: row.cards?.meaning ?? null,
        deckName: row.cards?.decks?.name ?? 'Unknown',
        correctCount: row.correct_count,
        wrongCount: row.wrong_count,
        wrongRate: total > 0 ? row.wrong_count / total : 0,
        lastReviewedAt: row.last_reviewed_at,
      };
    })
    .sort((a, b) => b.wrongRate - a.wrongRate || b.wrongCount - a.wrongCount)
    .slice(0, 20);

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
    speechProgress,
    practiceModeStats,
    assignments,
    weakWords,
    totalMastery,
  });
}
