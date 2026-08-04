import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { memberIdsFor } from '../_lib/membership';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

interface ItemAnalysisRow {
  card_id: string;
  word: string;
  reading: string | null;
  meaning: string | null;
  attempt_count: number;
  correct_total: number;
  wrong_total: number;
  struggling_count: number;
}

/**
 * GET — class-level item analysis for one deck the organizer owns.
 * For each card: how many members attempted it, class-wide correct/wrong
 * totals, and how many attempting members are struggling (personal accuracy
 * < 60%). Ranked worst-first. Organizer-only.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const deckId = req.nextUrl.searchParams.get('deckId');
  if (!deckId) {
    return NextResponse.json({ error: 'deckId is required.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // Verify the deck belongs to this organizer before reading any member data.
  const { data: deck, error: deckErr } = await sb
    .from('decks')
    .select('id, name, emoji')
    .eq('id', deckId)
    .eq('user_id', orgCheck.id)
    .single();

  if (deckErr || !deck) {
    return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
  }

  // Count members on this organizer's roster so the UI can say "N of M students".
  const memberCount = (await memberIdsFor({ organizerId: orgCheck.id })).length;

  const { data, error } = await sb.rpc('group_item_analysis', {
    p_organizer_id: orgCheck.id,
    p_deck_id: deckId,
  });

  if (error) {
    logger.error('Failed to run item analysis', {
      route: '/api/group/item-analysis',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to analyze deck.' }, { status: 500 });
  }

  const cards = ((data ?? []) as ItemAnalysisRow[]).map((row) => {
    const attempts = Number(row.attempt_count);
    const struggling = Number(row.struggling_count);
    const correct = Number(row.correct_total);
    const wrong = Number(row.wrong_total);
    return {
      cardId: row.card_id,
      word: row.word,
      reading: row.reading,
      meaning: row.meaning,
      attemptCount: attempts,
      correctTotal: correct,
      wrongTotal: wrong,
      strugglingCount: struggling,
      // % of attempting members who are below 60% accuracy on this card.
      strugglingPct: attempts > 0 ? Math.round((struggling / attempts) * 100) : 0,
      classAccuracy: correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0,
    };
  });

  return NextResponse.json({
    deckId: deck.id,
    deckName: deck.name,
    deckEmoji: deck.emoji ?? null,
    memberCount: memberCount ?? 0,
    cards,
  });
}
