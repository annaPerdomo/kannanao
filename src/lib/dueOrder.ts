import type { Flashcard } from '@/types/flashcard';

export interface DueRow {
  card: Flashcard;
  intervalDays: number;
  nextReviewAt: string;
}

/** Tiers: priority deck first, then shaky (interval <= 1), then the rest — oldest due first in each. */
export function rankDueCards(rows: DueRow[], priorityDeckIds: ReadonlySet<string>): Flashcard[] {
  const tiered = rows.map((row, index) => ({
    row,
    index,
    tier: priorityDeckIds.has(row.card.deckId) ? 0 : row.intervalDays <= 1 ? 1 : 2,
  }));
  tiered.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.row.nextReviewAt !== b.row.nextReviewAt) {
      return a.row.nextReviewAt < b.row.nextReviewAt ? -1 : 1;
    }
    return a.index - b.index;
  });
  return tiered.map((t) => t.row.card);
}
