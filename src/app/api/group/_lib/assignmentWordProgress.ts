import type { SupabaseClient } from '@supabase/supabase-js';

import { summarizeWordProgress, type WordProgress } from '@/lib/wordProgress';

import { allRows } from './allRows';

const CHUNK = 300;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * One `cards` query for every assigned deck and one `card_progress` query for
 * the resulting cards, then a per-assignment tally. Throws on either query's
 * error rather than returning a partial, misleadingly-complete map.
 */
export async function assignmentWordProgress(
  sb: SupabaseClient,
  userId: string,
  assignments: { id: string; deck_id: string | null; created_at: string }[],
): Promise<Map<string, WordProgress>> {
  const deckAssignments = assignments.filter(
    (a): a is { id: string; deck_id: string; created_at: string } => a.deck_id != null,
  );
  const result = new Map<string, WordProgress>();
  if (deckAssignments.length === 0) return result;

  const deckIds = [...new Set(deckAssignments.map((a) => a.deck_id))];
  const cards: { id: string; deck_id: string }[] = [];
  for (const batch of chunks(deckIds, CHUNK)) {
    const batchCards = await allRows<{ id: string; deck_id: string }>((from, to) =>
      sb.from('cards').select('id, deck_id').in('deck_id', batch).order('id').range(from, to),
    );
    cards.push(...batchCards);
  }

  const cardIdsByDeck = new Map<string, string[]>();
  for (const card of cards) {
    const list = cardIdsByDeck.get(card.deck_id) ?? [];
    list.push(card.id);
    cardIdsByDeck.set(card.deck_id, list);
  }

  const allCardIds = cards.map((c) => c.id);
  const progressRows: {
    card_id: string;
    last_reviewed_at: string | null;
    interval_days: number;
  }[] = [];
  for (const batch of chunks(allCardIds, CHUNK)) {
    if (batch.length === 0) continue;
    const { data, error } = await sb
      .from('card_progress')
      .select('card_id, last_reviewed_at, interval_days')
      .eq('user_id', userId)
      .in('card_id', batch);
    if (error) throw new Error(error.message);
    progressRows.push(
      ...((data ?? []) as {
        card_id: string;
        last_reviewed_at: string | null;
        interval_days: number;
      }[]),
    );
  }

  for (const a of deckAssignments) {
    const cardIds = cardIdsByDeck.get(a.deck_id) ?? [];
    result.set(a.id, summarizeWordProgress(cardIds, progressRows, a.created_at));
  }

  return result;
}
