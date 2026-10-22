import { describe, expect, it } from 'vitest';

import { type DueRow, rankDueCards } from '@/lib/dueOrder';
import type { Flashcard } from '@/types/flashcard';

const card = (id: string, deckId: string): Flashcard =>
  ({ id, deckId, word: id, reading: id, meaning: id }) as Flashcard;

const row = (id: string, deckId: string, intervalDays: number, nextReviewAt: string): DueRow => ({
  card: card(id, deckId),
  intervalDays,
  nextReviewAt,
});

describe('rankDueCards', () => {
  it('puts the priority deck first even when it is newer than other rows', () => {
    const rows = [
      row('old-other', 'd-other', 8, '2026-01-01T00:00:00Z'),
      row('new-priority', 'd-priority', 8, '2026-02-01T00:00:00Z'),
    ];
    const ranked = rankDueCards(rows, new Set(['d-priority']));
    expect(ranked.map((c) => c.id)).toEqual(['new-priority', 'old-other']);
  });

  it('puts shaky cards (interval <= 1) before old-but-strong ones', () => {
    const rows = [
      row('strong', 'd1', 8, '2026-01-01T00:00:00Z'),
      row('shaky', 'd1', 0, '2026-02-01T00:00:00Z'),
    ];
    const ranked = rankDueCards(rows, new Set());
    expect(ranked.map((c) => c.id)).toEqual(['shaky', 'strong']);
  });

  it('is stable for ties within the same tier', () => {
    const rows = [
      row('a', 'd1', 5, '2026-01-01T00:00:00Z'),
      row('b', 'd1', 5, '2026-01-01T00:00:00Z'),
      row('c', 'd1', 5, '2026-01-01T00:00:00Z'),
    ];
    const ranked = rankDueCards(rows, new Set());
    expect(ranked.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('orders the rest tier by soonest nextReviewAt first', () => {
    const rows = [
      row('later', 'd1', 8, '2026-03-01T00:00:00Z'),
      row('sooner', 'd1', 8, '2026-01-01T00:00:00Z'),
    ];
    const ranked = rankDueCards(rows, new Set());
    expect(ranked.map((c) => c.id)).toEqual(['sooner', 'later']);
  });
});
