import { describe, expect, it } from 'vitest';

import {
  groupWordInsights,
  handoutLearnerSummaries,
  isTricky,
  learnerWordInsights,
  masteryOf,
  summarizeGroupWords,
  toCardProgress,
  type WordProgressRow,
} from '@/lib/handoutWords';
import { pickMixedSessionCards } from '@/lib/mixedPractice';
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

describe('learnerWordInsights round-trip into pickMixedSessionCards', () => {
  it('orders weakest first when insights are converted back into CardProgress rows', () => {
    const cards = [card('strong'), card('learning'), card('new')];
    const rows: WordProgressRow[] = [
      row({
        userId: 'u1',
        cardId: 'strong',
        correctCount: 5,
        wrongCount: 0,
        intervalDays: 3,
        ease: 2.5,
      }),
      row({
        userId: 'u1',
        cardId: 'learning',
        correctCount: 1,
        wrongCount: 1,
        intervalDays: 1,
        ease: 2.3,
      }),
    ];

    const insights = learnerWordInsights(cards, rows);
    expect(insights.map((i) => i.strength)).toEqual(['strong', 'learning', 'new']);

    const progress = toCardProgress(insights);
    const picked = pickMixedSessionCards(
      insights.map((i) => i.card),
      progress,
    );

    expect(picked.map((c) => c.id)).toEqual(['learning', 'new', 'strong']);
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

describe('handoutLearnerSummaries', () => {
  it('counts strength, tricky and last practice per learner, keeping roster order', () => {
    const cards = [card('c1'), card('c2'), card('c3')];
    const rows = [
      row({ userId: 'u1', cardId: 'c1', correctCount: 5, wrongCount: 0, intervalDays: 3 }),
      row({
        userId: 'u1',
        cardId: 'c2',
        correctCount: 1,
        wrongCount: 3,
        intervalDays: 0,
        lastReviewedAt: '2026-10-04T00:00:00Z',
      }),
      row({ userId: 'u3', cardId: 'c9' }),
    ];
    const members = [
      { id: 'u1', name: 'Hana' },
      { id: 'u2', name: 'Ken' },
    ];
    const [hana, ken] = handoutLearnerSummaries(cards, rows, members, new Set(['u1']));

    expect(hana).toEqual({
      id: 'u1',
      name: 'Hana',
      assigned: true,
      strong: 1,
      learning: 1,
      unseen: 1,
      tricky: 1,
      lastPracticedAt: '2026-10-04T00:00:00Z',
    });
    expect(ken).toMatchObject({
      assigned: false,
      strong: 0,
      learning: 0,
      unseen: 3,
      tricky: 0,
      lastPracticedAt: null,
    });
  });
});

describe('masteryOf', () => {
  it('is not started until any word has been practiced', () => {
    expect(masteryOf({ strong: 0, learning: 0, unseen: 5 })).toEqual({
      level: 'notStarted',
      percent: 0,
    });
    expect(masteryOf({ strong: 0, learning: 0, unseen: 0 }).level).toBe('notStarted');
  });

  it('buckets the strong share at 40% and 80%', () => {
    expect(masteryOf({ strong: 3, learning: 7, unseen: 0 })).toEqual({
      level: 'learning',
      percent: 30,
    });
    expect(masteryOf({ strong: 4, learning: 6, unseen: 0 }).level).toBe('gettingThere');
    expect(masteryOf({ strong: 8, learning: 2, unseen: 0 }).level).toBe('mastered');
  });

  it('counts a finished-once learner with few strong words as still learning', () => {
    expect(masteryOf({ strong: 11, learning: 30, unseen: 28 })).toEqual({
      level: 'learning',
      percent: 16,
    });
  });
});
