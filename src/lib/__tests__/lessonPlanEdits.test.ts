import { describe, expect, it } from 'vitest';

import {
  addDaysToDate,
  cardIsBlank,
  deckIsSkipped,
  emptyPlanCard,
  includedPlan,
  planCounts,
  weekNumbers,
} from '@/lib/lessonPlanEdits';
import type { PlanCard, PlanDeck } from '@/types/lessonPlan';

function card(word: string, extra: Partial<PlanCard> = {}): PlanCard {
  return {
    word,
    reading: '',
    meaning: 'meaning',
    exampleJp: '',
    exampleEn: '',
    jlptLevel: null,
    ...extra,
  };
}

function deck(name: string, cards: PlanCard[], extra: Partial<PlanDeck> = {}): PlanDeck {
  return {
    name,
    description: '',
    emoji: '📚',
    mainViewMode: 'hiragana',
    cards,
    ...extra,
  };
}

describe('cardIsBlank', () => {
  it('treats a whitespace-only word as blank', () => {
    expect(cardIsBlank(card('  '))).toBe(true);
    expect(cardIsBlank(card('ねこ'))).toBe(false);
  });

  it('emptyPlanCard starts blank', () => {
    expect(cardIsBlank(emptyPlanCard())).toBe(true);
  });
});

describe('deckIsSkipped', () => {
  it('skips a deck that is switched off', () => {
    expect(deckIsSkipped(deck('a', [card('ねこ')], { excluded: true }))).toBe(true);
  });

  it('skips a deck whose every card is unticked or blank', () => {
    expect(deckIsSkipped(deck('a', [card('ねこ', { excluded: true }), card('')]))).toBe(true);
  });

  it('keeps a deck with at least one ticked card', () => {
    expect(deckIsSkipped(deck('a', [card('ねこ', { excluded: true }), card('いぬ')]))).toBe(false);
  });
});

describe('includedPlan', () => {
  it('drops unticked cards, blank cards and switched-off decks, and strips flags', () => {
    const plan = {
      decks: [
        deck('week1', [card('ねこ'), card('いぬ', { excluded: true }), card('  ')]),
        deck('week2', [card('とり')], { excluded: true }),
        deck('week3', [card('さかな', { excluded: false })]),
      ],
    };

    const kept = includedPlan(plan);

    expect(kept.decks.map((d) => d.name)).toEqual(['week1', 'week3']);
    expect(kept.decks[0].cards.map((c) => c.word)).toEqual(['ねこ']);
    expect(kept.decks[0]).not.toHaveProperty('excluded');
    expect(kept.decks[0].cards[0]).not.toHaveProperty('excluded');
  });

  it('leaves an untouched plan intact', () => {
    const plan = { decks: [deck('week1', [card('ねこ'), card('いぬ')])] };
    expect(planCounts(plan)).toEqual({ decks: 1, cards: 2 });
  });
});

describe('weekNumbers', () => {
  it('renumbers around skipped decks the way apply will', () => {
    const decks = [
      deck('a', [card('ねこ')]),
      deck('b', [card('いぬ')], { excluded: true }),
      deck('c', [card('とり')]),
    ];
    expect(weekNumbers(decks)).toEqual([1, null, 2]);
  });
});

describe('addDaysToDate', () => {
  it('adds days in UTC without drifting', () => {
    expect(addDaysToDate('2026-08-30', 7)).toBe('2026-09-06');
    expect(addDaysToDate('2026-12-27', 7)).toBe('2027-01-03');
  });

  it('returns null for garbage input', () => {
    expect(addDaysToDate('', 7)).toBeNull();
    expect(addDaysToDate('not-a-date', 7)).toBeNull();
  });
});
