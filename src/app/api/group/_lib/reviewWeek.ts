import type { OrganizerProfile } from '@/app/api/_lib/requireOrganizerAccount';
import { CARD_COPY_COLUMNS } from '@/lib/cardCopyColumns';
import { pickReviewCards, type ReviewSourceCard } from '@/lib/lessonReview';
import { logger } from '@/lib/logger';

import { assignHandout, removeHandout } from './handoutWrites';
import { linkWeekToUnit } from './linkWeekToUnit';
import { memberIdsFor } from './membership';
import type { GroupRecord } from './requireGroupAccess';
import { type getServiceSupabase } from './serviceSupabase';

const REVIEW_CARDS_MIN = 10;
const REVIEW_CARDS_MAX = 40;
const DECK_NAME_MAX = 200;
const REVIEW_NOTE = 'I can use the words from this whole unit.';
const CARD_SELECT_COLUMNS = ['id', 'deck_id', ...CARD_COPY_COLUMNS].join(', ');

export type BuildReviewWeekResult =
  | { status: 'ok'; deckId: string }
  | { status: 'no_cards' | 'conflict' | 'error' };

export function clampReviewCardCount(raw: unknown, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return fallback;
  return Math.min(Math.max(raw, REVIEW_CARDS_MIN), REVIEW_CARDS_MAX);
}

/** Only decks this organizer still owns can feed the review deck — a deck that left their hands mid-unit is simply skipped. */
async function verifiedUnitDeckIds(
  sb: ReturnType<typeof getServiceSupabase>,
  organizerId: string,
  unitDeckIds: string[],
): Promise<string[]> {
  const { data } = await sb
    .from('decks')
    .select('id')
    .in('id', unitDeckIds)
    .eq('user_id', organizerId);
  return ((data ?? []) as { id: string }[]).map((d) => d.id);
}

/** Logs and continues on an RPC failure — a review week with no tricky words ranked is still useful. */
async function loadTrickyCardIds(
  sb: ReturnType<typeof getServiceSupabase>,
  memberIds: string[],
  deckIds: string[],
): Promise<string[]> {
  if (memberIds.length === 0 || deckIds.length === 0) return [];
  const { data, error } = await sb.rpc('group_difficult_words', {
    p_user_ids: memberIds,
    p_deck_ids: deckIds,
  });
  if (error) {
    logger.error('Failed to load tricky words for the review week', {
      route: 'POST /api/group/lessons/[planId]/weeks',
      error: error.message,
    });
    return [];
  }
  return ((data ?? []) as { card_id: string }[]).map((r) => r.card_id);
}

async function loadOrderedCards(
  sb: ReturnType<typeof getServiceSupabase>,
  unitDeckIds: string[],
  verifiedDeckIds: string[],
): Promise<ReviewSourceCard[]> {
  const { data } = await sb
    .from('cards')
    .select(CARD_SELECT_COLUMNS)
    .in('deck_id', verifiedDeckIds)
    .order('deck_id')
    .order('position');

  const deckOrder = new Map(verifiedDeckIds.map((id) => [id, unitDeckIds.indexOf(id)]));
  return [...((data ?? []) as unknown as ReviewSourceCard[])].sort(
    (a, b) => (deckOrder.get(a.deck_id) ?? 0) - (deckOrder.get(b.deck_id) ?? 0),
  );
}

async function createReviewDeck(
  sb: ReturnType<typeof getServiceSupabase>,
  organizerId: string,
  deckName: string,
): Promise<string | null> {
  const { data: maxRow } = await sb
    .from('decks')
    .select('position')
    .eq('user_id', organizerId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((maxRow?.position as number | undefined) ?? -1) + 1;

  const { data: created, error } = await sb
    .from('decks')
    .insert({
      user_id: organizerId,
      name: deckName,
      description: REVIEW_NOTE,
      emoji: '🔁',
      position,
    })
    .select('id')
    .single();
  if (error || !created) {
    logger.error('Failed to create the review deck', {
      route: 'POST /api/group/lessons/[planId]/weeks',
      error: error?.message,
    });
    return null;
  }
  return created.id as string;
}

async function insertReviewCards(
  sb: ReturnType<typeof getServiceSupabase>,
  deckId: string,
  picked: ReviewSourceCard[],
): Promise<string | null> {
  const rows = picked.map((card, index) => {
    const row: Record<string, unknown> = { deck_id: deckId, position: index };
    for (const col of CARD_COPY_COLUMNS) row[col] = (card as Record<string, unknown>)[col] ?? null;
    return row;
  });
  const { error } = await sb.from('cards').insert(rows);
  return error?.message ?? null;
}

/** Best-effort cleanup. New cards carry no `card_progress` yet, so deleting them (invariant 4 protects only studied cards) and the deck is safe. */
async function rollbackReviewDeck(
  sb: ReturnType<typeof getServiceSupabase>,
  organizer: OrganizerProfile,
  group: GroupRecord,
  deckId: string,
): Promise<void> {
  const { error: handoutError } = await removeHandout(sb, {
    organizerId: organizer.id,
    groupId: group.id,
    deckId,
  });
  if (handoutError) {
    logger.error('Rollback: failed to remove the review handout', {
      route: 'POST /api/group/lessons/[planId]/weeks',
      deckId,
      error: handoutError,
    });
  }

  const { error: cardsError } = await sb.from('cards').delete().eq('deck_id', deckId);
  if (cardsError) {
    logger.error('Rollback: failed to delete the review deck cards', {
      route: 'POST /api/group/lessons/[planId]/weeks',
      deckId,
      error: cardsError.message,
    });
  }

  const { error: deckError } = await sb.from('decks').delete().eq('id', deckId);
  if (deckError) {
    logger.error('Rollback: failed to delete the review deck', {
      route: 'POST /api/group/lessons/[planId]/weeks',
      deckId,
      error: deckError.message,
    });
  }
}

async function finishReviewWeek(args: {
  sb: ReturnType<typeof getServiceSupabase>;
  organizer: OrganizerProfile;
  group: GroupRecord;
  planId: string;
  deckId: string;
  deckName: string;
  picked: ReviewSourceCard[];
  nextPosition: number;
  dueDate: string | null;
  availableOn: string | null;
}): Promise<BuildReviewWeekResult> {
  const {
    sb,
    organizer,
    group,
    planId,
    deckId,
    deckName,
    picked,
    nextPosition,
    dueDate,
    availableOn,
  } = args;

  const cardsError = await insertReviewCards(sb, deckId, picked);
  if (cardsError) {
    logger.error('Failed to create the review deck cards', {
      route: 'POST /api/group/lessons/[planId]/weeks',
      deckId,
      error: cardsError,
    });
    await rollbackReviewDeck(sb, organizer, group, deckId);
    return { status: 'error' };
  }

  const { error: assignError } = await assignHandout(sb, {
    organizerId: organizer.id,
    groupId: group.id,
    deckId,
    title: deckName,
    note: REVIEW_NOTE,
    dueDate,
    availableOn,
    requiredAccuracy: 80,
    requiredMode: 'quiz',
  });
  if (assignError) {
    logger.error('Failed to schedule the review deck', {
      route: 'POST /api/group/lessons/[planId]/weeks',
      deckId,
      error: assignError,
    });
    await rollbackReviewDeck(sb, organizer, group, deckId);
    return { status: 'error' };
  }

  const link = await linkWeekToUnit(sb, { planId, deckId, position: nextPosition });
  if (link.status !== 'ok') {
    await rollbackReviewDeck(sb, organizer, group, deckId);
    return { status: link.status };
  }

  return { status: 'ok', deckId };
}

/** Never calls Gemini — the review deck is built only from cards the unit already has. */
export async function buildReviewWeek(args: {
  sb: ReturnType<typeof getServiceSupabase>;
  organizer: OrganizerProfile;
  group: GroupRecord;
  planId: string;
  planTitle: string | null;
  unitDeckIds: string[];
  nextPosition: number;
  dueDate: string | null;
  availableOn: string | null;
  maxCards: number;
}): Promise<BuildReviewWeekResult> {
  const { sb, organizer, group, unitDeckIds, maxCards } = args;

  const verifiedDeckIds = await verifiedUnitDeckIds(sb, organizer.id, unitDeckIds);
  if (verifiedDeckIds.length === 0) return { status: 'no_cards' };

  const memberIds = await memberIdsFor({ organizerId: organizer.id, groupId: group.id });
  const trickyCardIds = await loadTrickyCardIds(sb, memberIds, verifiedDeckIds);
  const orderedCards = await loadOrderedCards(sb, unitDeckIds, verifiedDeckIds);
  const picked = pickReviewCards({ cards: orderedCards, trickyCardIds, max: maxCards });
  if (picked.length === 0) return { status: 'no_cards' };

  const deckName = `Review: ${args.planTitle ?? 'lesson set'}`.slice(0, DECK_NAME_MAX);
  const deckId = await createReviewDeck(sb, organizer.id, deckName);
  if (!deckId) return { status: 'error' };

  return finishReviewWeek({
    sb,
    organizer,
    group,
    planId: args.planId,
    deckId,
    deckName,
    picked,
    nextPosition: args.nextPosition,
    dueDate: args.dueDate,
    availableOn: args.availableOn,
  });
}
