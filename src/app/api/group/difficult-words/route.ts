import { type NextRequest, NextResponse } from 'next/server';

import { deriveReason, learnersAffected } from '@/lib/difficultWords';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { memberIdsFor } from '../_lib/membership';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

interface DifficultWordRow {
  card_id: string;
  deck_id: string;
  word: string;
  reading: string | null;
  meaning: string | null;
  attempt_count: number;
  learner_count: number;
  struggling_count: number;
  low_ease_count: number;
  lapse_learner_count: number;
  avg_ease: number;
  class_accuracy: number;
}

interface DeckRow {
  id: string;
  name: string;
  emoji: string | null;
}

const empty = (learnerCount: number, decks: DeckRow[]) =>
  NextResponse.json({
    learnerCount,
    decks: decks.map((d) => ({ id: d.id, name: d.name, emoji: d.emoji })),
    words: [],
  });

/**
 * GET — the words one group is falling off from, across every deck assigned to
 * that group (or one deck, with `deckId`). Organizer-only.
 *
 * "Assigned to the group" is the scope because that is how a deck reaches these
 * learners at all; a deck the organizer owns but never handed out has no group
 * progress to rank. The deck list is returned alongside the words so the tab's
 * filter offers exactly the decks the "All decks" total covers.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const groupId = req.nextUrl.searchParams.get('groupId');
  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });
  }
  const deckId = req.nextUrl.searchParams.get('deckId');

  const sb = getServiceSupabase();

  const { data: group } = await sb
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .eq('organizer_id', orgCheck.id)
    .single();

  if (!group) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  }

  const memberIds = await memberIdsFor({ organizerId: orgCheck.id, groupId });

  const { data: assigned, error: assignedErr } = await sb
    .from('assignments')
    .select('deck_id')
    .eq('organizer_id', orgCheck.id)
    .eq('group_id', groupId);

  if (assignedErr) {
    logger.error('Failed to load assigned decks', {
      route: '/api/group/difficult-words',
      error: assignedErr.message,
    });
    return NextResponse.json({ error: 'Failed to load decks.' }, { status: 500 });
  }

  const assignedDeckIds = [...new Set((assigned ?? []).map((a) => a.deck_id as string))];
  if (assignedDeckIds.length === 0) {
    return empty(memberIds.length, []);
  }

  // Re-checking user_id keeps a deck that somehow left the organizer's hands
  // (transferred, or an assignment row that outlived it) out of the scan.
  const { data: deckRows, error: decksErr } = await sb
    .from('decks')
    .select('id, name, emoji')
    .in('id', assignedDeckIds)
    .eq('user_id', orgCheck.id)
    .order('name', { ascending: true });

  if (decksErr) {
    logger.error('Failed to load decks', {
      route: '/api/group/difficult-words',
      error: decksErr.message,
    });
    return NextResponse.json({ error: 'Failed to load decks.' }, { status: 500 });
  }

  const decks = (deckRows ?? []) as DeckRow[];
  if (deckId && !decks.some((d) => d.id === deckId)) {
    return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
  }

  const scanDeckIds = deckId ? [deckId] : decks.map((d) => d.id);
  if (scanDeckIds.length === 0 || memberIds.length === 0) {
    return empty(memberIds.length, decks);
  }

  const { data, error } = await sb.rpc('group_difficult_words', {
    p_user_ids: memberIds,
    p_deck_ids: scanDeckIds,
  });

  if (error) {
    logger.error('Failed to find difficult words', {
      route: '/api/group/difficult-words',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to load tricky words.' }, { status: 500 });
  }

  const deckById = new Map(decks.map((d) => [d.id, d]));

  const words = ((data ?? []) as DifficultWordRow[]).flatMap((row) => {
    const signals = {
      attemptCount: Number(row.attempt_count),
      strugglingCount: Number(row.struggling_count),
      lowEaseCount: Number(row.low_ease_count),
      lapseLearnerCount: Number(row.lapse_learner_count),
      avgEase: Number(row.avg_ease),
    };
    const reason = deriveReason(signals);
    if (!reason) return [];

    const deck = deckById.get(row.deck_id);
    return [
      {
        cardId: row.card_id,
        deckId: row.deck_id,
        deckName: deck?.name ?? '',
        deckEmoji: deck?.emoji ?? null,
        word: row.word,
        reading: row.reading,
        meaning: row.meaning,
        reason,
        learnersAffected: learnersAffected(signals, reason),
        learnerCount: Number(row.learner_count),
        attemptCount: signals.attemptCount,
        classAccuracy: Number(row.class_accuracy),
      },
    ];
  });

  return NextResponse.json({
    learnerCount: memberIds.length,
    decks: decks.map((d) => ({ id: d.id, name: d.name, emoji: d.emoji })),
    words,
  });
}
