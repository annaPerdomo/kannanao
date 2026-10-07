import { describe, expect, it } from 'vitest';

import {
  groupWordInsights,
  isTricky,
  learnerWordInsights,
  summarizeGroupWords,
  type WordProgressRow,
} from '@/lib/handoutWords';
import type { Flashcard } from '@/types/flashcard';

function card(id: string): Flashcard {
  return {
    id,
    deckId: 'd1',
    word: `word-${id}`,
    reading: `reading-${id}`,
    meaning: `meaning-${id}`,
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
  };
}

function row(overrides: Partial<WordProgressRow> = {}): WordProgressRow {
  return {
    userId: 'u1',
    cardId: 'c1',
    correctCount: 3,
    wrongCount: 2,
    lastReviewedAt: '2026-10-01T00:00:00Z',
    nextReviewAt: '2026-10-05T00:00:00Z',
    intervalDays: 3,
    ease: 2.5,
    ...overrides,
  };
}

describe('isTricky', () => {
  it('is false with zero answers', () => {
    expect(isTricky(0, 0)).toBe(false);
  });

  it('is false at exactly 60% accuracy', () => {
    expect(isTricky(3, 2)).toBe(false);
  });

  it('is true below 60% accuracy', () => {
    expect(isTricky(2, 3)).toBe(true);
  });
});

describe('groupWordInsights', () => {
  it('keeps deck order, counts seen/strong/tricky across learners, ignores rows for other cards', () => {
    const cards = [card('c1'), card('c2'), card('c3')];
    const rows: WordProgressRow[] = [
      row({
        userId: 'u1',
        cardId: 'c1',
        correctCount: 5,
        wrongCount: 0,
        intervalDays: 3,
        ease: 2.5,
      }),
      row({
        userId: 'u2',
        cardId: 'c1',
        correctCount: 1,
        wrongCount: 4,
        intervalDays: 0,
        ease: 1.8,
      }),
      row({
        userId: 'u3',
        cardId: 'c1',
        correctCount: 4,
        wrongCount: 1,
        intervalDays: 3,
        ease: 2.5,
      }),
      row({
        userId: 'u1',
        cardId: 'c2',
        correctCount: 1,
        wrongCount: 1,
        intervalDays: 1,
        ease: 2.3,
      }),
      row({ userId: 'u1', cardId: 'other-card', correctCount: 9, wrongCount: 0 }),
    ];

    const insights = groupWordInsights(cards, rows);

    expect(insights.map((i) => i.card.id)).toEqual(['c1', 'c2', 'c3']);
    expect(insights[0]).toMatchObject({ seenCount: 3, strongCount: 2, trickyCount: 1 });
    expect(insights[1]).toMatchObject({ seenCount: 1, strongCount: 0, trickyCount: 1 });
    expect(insights[2]).toMatchObject({ seenCount: 0, strongCount: 0, trickyCount: 0 });
  });
});

describe('learnerWordInsights', () => {
  it('fills "new" defaults for cards without a row', () => {
    const cards = [card('c1'), card('c2')];
    const rows: WordProgressRow[] = [row({ userId: 'u1', cardId: 'c1' })];

    const insights = learnerWordInsights(cards, rows);

    expect(insights[0]).toMatchObject({ strength: 'strong', tricky: false });
    expect(insights[1]).toMatchObject({
      strength: 'new',
      correctCount: 0,
      wrongCount: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
      intervalDays: 0,
      ease: 2.5,
      tricky: false,
    });
  });
});

describe('summarizeGroupWords', () => {
  it('handles a zero learner count', () => {
    const insights = groupWordInsights([card('c1')], []);
    expect(summarizeGroupWords(insights, 0)).toEqual({
      total: 1,
      seenByAnyone: 0,
      strongForMost: 0,
      trickyForAnyone: 0,
    });
  });

  it('needs more than half of 4 learners strong to count as strongForMost', () => {
    const cards = [card('c1')];
    const rows: WordProgressRow[] = [
      row({
        userId: 'u1',
        cardId: 'c1',
        intervalDays: 3,
        ease: 2.5,
        correctCount: 5,
        wrongCount: 0,
      }),
      row({
        userId: 'u2',
        cardId: 'c1',
        intervalDays: 3,
        ease: 2.5,
        correctCount: 5,
        wrongCount: 0,
      }),
      row({
        userId: 'u3',
        cardId: 'c1',
        intervalDays: 3,
        ease: 2.5,
        correctCount: 5,
        wrongCount: 0,
      }),
      row({
        userId: 'u4',
        cardId: 'c1',
        intervalDays: 0,
        ease: 1.5,
        correctCount: 1,
        wrongCount: 4,
      }),
    ];
    const insights = groupWordInsights(cards, rows);
    expect(summarizeGroupWords(insights, 4)).toEqual({
      total: 1,
      seenByAnyone: 1,
      strongForMost: 1,
      trickyForAnyone: 1,
    });
  });
});
