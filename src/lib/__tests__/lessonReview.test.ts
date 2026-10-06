import { describe, expect, it } from 'vitest';

import { pickReviewCards, type ReviewSourceCard } from '../lessonReview';

function card(id: string, deckId: string, word: string): ReviewSourceCard {
  return { id, deck_id: deckId, word };
}

describe('pickReviewCards', () => {
  it('puts tricky cards first, in the given order', () => {
    const cards = [card('c1', 'd1', 'A'), card('c2', 'd1', 'B'), card('c3', 'd2', 'C')];
    const picked = pickReviewCards({ cards, trickyCardIds: ['c3', 'c1'], max: 10 });
    expect(picked.map((c) => c.id)).toEqual(['c3', 'c1', 'c2']);
  });

  it('dedupes by NFKC-normalized word, full-width vs half-width', () => {
    const cards = [card('c1', 'd1', 'ABC'), card('c2', 'd1', 'ABC')];
    const picked = pickReviewCards({ cards, trickyCardIds: [], max: 10 });
    expect(picked).toHaveLength(1);
    expect(picked[0].id).toBe('c1');
  });

  it('keeps both 会う and 合う — different words, never compared by reading', () => {
    const cards = [card('c1', 'd1', '会う'), card('c2', 'd1', '合う')];
    const picked = pickReviewCards({ cards, trickyCardIds: [], max: 10 });
    expect(picked.map((c) => c.word)).toEqual(['会う', '合う']);
  });

  it('round-robins across decks in week order so every week is represented', () => {
    const cards = [
      card('d1-1', 'd1', 'A1'),
      card('d1-2', 'd1', 'A2'),
      card('d2-1', 'd2', 'B1'),
      card('d2-2', 'd2', 'B2'),
      card('d3-1', 'd3', 'C1'),
    ];
    const picked = pickReviewCards({ cards, trickyCardIds: [], max: 3 });
    expect(picked.map((c) => c.deck_id)).toEqual(['d1', 'd2', 'd3']);
  });

  it('respects max', () => {
    const cards = [card('c1', 'd1', 'A'), card('c2', 'd1', 'B'), card('c3', 'd1', 'C')];
    const picked = pickReviewCards({ cards, trickyCardIds: [], max: 2 });
    expect(picked).toHaveLength(2);
  });

  it('is stable for the same input', () => {
    const cards = [
      card('c1', 'd1', 'A'),
      card('c2', 'd2', 'B'),
      card('c3', 'd1', 'C'),
      card('c4', 'd2', 'D'),
    ];
    const first = pickReviewCards({ cards, trickyCardIds: ['c4'], max: 3 });
    const second = pickReviewCards({ cards, trickyCardIds: ['c4'], max: 3 });
    expect(first.map((c) => c.id)).toEqual(second.map((c) => c.id));
  });
});
