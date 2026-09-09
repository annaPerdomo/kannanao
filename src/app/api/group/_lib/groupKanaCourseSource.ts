import { availabilityToday } from '@/lib/assignmentAvailability';
import {
  KANA_COURSE_READY_FRACTION,
  type KanaCourseDeckNeed,
  rowReadFraction,
} from '@/lib/kanaCourse';
import { getSet, KANA_SETS, kanaSetForChar, segmentReading } from '@/lib/kanaCurriculum';

import { allRows } from './allRows';
import { getGroupKanaCoverage } from './groupKanaCoverage';
import { getServiceSupabase } from './serviceSupabase';

const CURRICULUM_INDEX = new Map(KANA_SETS.map((set, i) => [set.id, i]));

// っ/ッ/ー are only ever answered inside a word pair, so no learner accumulates
// rows for them: proposing the row would put it back on every plan forever.
const isContextualKanaSet = (setId: string) => getSet(setId)?.kind === 'contextual';

interface AssignmentDueRow {
  deck_id: string;
  due_date: string | null;
  completed_at: string | null;
}

interface PlannedDueRow {
  deck_id: string;
  due_date: string | null;
}

/**
 * The sounds a group's assigned decks need. Only the soonest OPEN due date per
 * deck counts — a completed or past-due handout is no reason to teach a row.
 */
export async function getGroupKanaCourseNeeds(
  groupId: string,
  organizerId: string,
  today: string = availabilityToday(),
): Promise<{ needs: KanaCourseDeckNeed[]; deckCount: number }> {
  const sb = getServiceSupabase();

  const [assignmentRows, plannedRows] = await Promise.all([
    allRows<AssignmentDueRow>((from, to) =>
      sb
        .from('assignments')
        .select('deck_id, due_date, completed_at')
        .eq('group_id', groupId)
        .not('deck_id', 'is', null)
        .range(from, to),
    ),
    allRows<PlannedDueRow>((from, to) =>
      sb
        .from('planned_assignments')
        .select('deck_id, due_date')
        .eq('group_id', groupId)
        .range(from, to),
    ),
  ]);

  const soonestByDeck = new Map<string, string>();
  const consider = (deckId: string, dueDate: string | null) => {
    if (!dueDate || dueDate < today) return;
    const current = soonestByDeck.get(deckId);
    if (!current || dueDate < current) soonestByDeck.set(deckId, dueDate);
  };
  for (const row of assignmentRows) {
    if (row.completed_at) continue;
    consider(row.deck_id, row.due_date);
  }
  for (const row of plannedRows) consider(row.deck_id, row.due_date);

  if (soonestByDeck.size === 0) return { needs: [], deckCount: 0 };

  // Ownership is re-checked because the service client bypasses RLS.
  const { data: deckRows, error: decksError } = await sb
    .from('decks')
    .select('id')
    .in('id', [...soonestByDeck.keys()])
    .eq('user_id', organizerId);
  if (decksError) throw new Error(decksError.message);

  const ownedDeckIds = (deckRows ?? []).map((d: { id: string }) => d.id);
  if (ownedDeckIds.length === 0) return { needs: [], deckCount: 0 };

  const cardRows = await allRows<{ deck_id: string; word: string; reading: string | null }>(
    (from, to) =>
      sb
        .from('cards')
        .select('deck_id, word, reading')
        .in('deck_id', ownedDeckIds)
        // Without an order, two paged reads can skip or repeat a card.
        .order('deck_id', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
  );

  const readingsByDeck = new Map<string, string[]>();
  for (const card of cardRows) {
    const list = readingsByDeck.get(card.deck_id) ?? [];
    // The generator leaves `reading` empty when the word is already kana.
    list.push(card.reading || card.word || '');
    readingsByDeck.set(card.deck_id, list);
  }

  const coverage = await getGroupKanaCoverage(groupId, organizerId);

  const entries: KanaCourseDeckNeed[] = [];
  for (const deckId of ownedDeckIds) {
    const firstDueDate = soonestByDeck.get(deckId);
    if (!firstDueDate) continue;

    const setIds = new Set<string>();
    for (const reading of readingsByDeck.get(deckId) ?? []) {
      for (const kana of segmentReading(reading)) {
        const setId = kanaSetForChar(kana);
        if (setId) setIds.add(setId);
      }
    }

    for (const setId of setIds) {
      if (isContextualKanaSet(setId)) continue;
      if (rowReadFraction(setId, coverage) >= KANA_COURSE_READY_FRACTION) continue;
      entries.push({ setId, firstDueDate });
    }
  }

  entries.sort((a, b) => {
    if (a.firstDueDate !== b.firstDueDate) return a.firstDueDate < b.firstDueDate ? -1 : 1;
    return (CURRICULUM_INDEX.get(a.setId) ?? 0) - (CURRICULUM_INDEX.get(b.setId) ?? 0);
  });

  return { needs: entries, deckCount: ownedDeckIds.length };
}
