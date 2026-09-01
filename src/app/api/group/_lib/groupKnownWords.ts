import { normalizeWord } from '@/lib/lessonWarmUp';
import type { WarmUpWord } from '@/types/lessonPlan';

import { getServiceSupabase } from './serviceSupabase';

const PAGE = 1000;

/**
 * PostgREST silently caps result sets (max-rows, default 1000); a truncated
 * pool would let duplicate cards through, so read pages until one comes short.
 */
async function allRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) return rows;
  }
}

/**
 * Oldest card first; deck ownership is re-checked because the service client
 * bypasses RLS.
 */
export async function getGroupKnownWords(
  groupId: string,
  organizerId: string,
): Promise<WarmUpWord[]> {
  const sb = getServiceSupabase();

  const [assignmentRows, plannedRows] = await Promise.all([
    allRows<{ deck_id: string }>((from, to) =>
      sb
        .from('assignments')
        .select('deck_id')
        .eq('group_id', groupId)
        .not('deck_id', 'is', null)
        .range(from, to),
    ),
    allRows<{ deck_id: string }>((from, to) =>
      sb.from('planned_assignments').select('deck_id').eq('group_id', groupId).range(from, to),
    ),
  ]);

  const deckIds = [...new Set([...assignmentRows, ...plannedRows].map((row) => row.deck_id))];
  if (deckIds.length === 0) return [];

  const { data: deckRows, error: decksError } = await sb
    .from('decks')
    .select('id, name')
    .in('id', deckIds)
    .eq('user_id', organizerId);
  if (decksError) throw new Error(decksError.message);

  const deckNames = new Map(
    (deckRows ?? []).map((deck: { id: string; name: string }) => [deck.id, deck.name]),
  );
  const ownedDeckIds = [...deckNames.keys()];
  if (ownedDeckIds.length === 0) return [];

  const cardRows = await allRows<{
    word: string;
    reading: string | null;
    meaning: string | null;
    deck_id: string;
    created_at: string;
  }>((from, to) =>
    sb
      .from('cards')
      .select('word, reading, meaning, deck_id, created_at')
      .in('deck_id', ownedDeckIds)
      // The id tiebreak keeps pages stable: bulk inserts share a created_at.
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );

  const seen = new Set<string>();
  const words: WarmUpWord[] = [];
  for (const card of cardRows) {
    const deckName = deckNames.get(card.deck_id);
    if (!deckName) continue;

    const key = normalizeWord(card.word);
    if (seen.has(key)) continue;
    seen.add(key);

    words.push({
      word: card.word,
      reading: card.reading ?? '',
      meaning: card.meaning ?? '',
      deckName,
      addedAt: card.created_at,
    });
  }

  return words;
}
