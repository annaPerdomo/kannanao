import { type NextRequest, NextResponse } from 'next/server';

import { dbCardToApp, type SupabaseCardRow } from '@/lib/dbMappers';
import { groupWordInsights, learnerWordInsights, type WordProgressRow } from '@/lib/handoutWords';
import { logger } from '@/lib/logger';
import type { Flashcard } from '@/types/flashcard';

import { rateLimit } from '../../../_lib/rateLimit';
import { allRows } from '../../_lib/allRows';
import { memberIdsFor } from '../../_lib/membership';
import { requireGroupAccess } from '../../_lib/requireGroupAccess';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 60 };

interface ProgressRow {
  user_id: string;
  card_id: string;
  correct_count: number;
  wrong_count: number;
  last_reviewed_at: string | null;
  next_review_at: string;
  interval_days: number;
  ease: number;
}

function toWordProgressRow(row: ProgressRow): WordProgressRow {
  return {
    userId: row.user_id,
    cardId: row.card_id,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    lastReviewedAt: row.last_reviewed_at,
    nextReviewAt: row.next_review_at,
    intervalDays: row.interval_days,
    ease: row.ease,
  };
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const groupId = req.nextUrl.searchParams.get('groupId');
  const deckId = req.nextUrl.searchParams.get('deckId');
  if (!groupId || !deckId) {
    return NextResponse.json({ error: 'groupId and deckId are required.' }, { status: 400 });
  }

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;
  const { organizer, group } = access;

  const memberId = req.nextUrl.searchParams.get('memberId');

  const sb = getServiceSupabase();

  try {
    const { data: deck, error: deckErr } = await sb
      .from('decks')
      .select('id, name, emoji')
      .eq('id', deckId)
      .eq('user_id', organizer.id)
      .single();
    if (deckErr || !deck) {
      return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
    }

    const memberIds = await memberIdsFor({ organizerId: organizer.id, groupId: group.id });
    if (memberId && !memberIds.includes(memberId)) {
      return NextResponse.json({ error: 'Learner not found.' }, { status: 404 });
    }

    const cardRows = await allRows<SupabaseCardRow>((from, to) =>
      sb
        .from('cards')
        .select('*')
        .eq('deck_id', deckId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
        .range(from, to),
    );
    const cards: Flashcard[] = cardRows.map(dbCardToApp);
    const cardIds = cards.map((c) => c.id);

    const progressRows =
      cardIds.length && memberIds.length
        ? await allRows<ProgressRow>((from, to) =>
            sb
              .from('card_progress')
              .select(
                'user_id, card_id, correct_count, wrong_count, last_reviewed_at, next_review_at, interval_days, ease',
              )
              .in('card_id', cardIds)
              .in('user_id', memberIds)
              .order('user_id', { ascending: true })
              .order('card_id', { ascending: true })
              .range(from, to),
          )
        : [];

    const groupRows = progressRows.map(toWordProgressRow);
    const words = groupWordInsights(cards, groupRows);

    const learner = memberId
      ? learnerWordInsights(
          cards,
          groupRows.filter((row) => row.userId === memberId),
        )
      : null;

    return NextResponse.json({
      deck: { id: deck.id, name: deck.name, emoji: deck.emoji },
      learnerCount: memberIds.length,
      words,
      learner,
    });
  } catch (err) {
    logger.error('Failed to load handout words', {
      route: 'GET /api/group/lessons/words',
      groupId,
      deckId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Could not load the word list.' }, { status: 500 });
  }
}
