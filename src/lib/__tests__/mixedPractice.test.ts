import { describe, expect, it } from 'vitest';

import type { StrengthCounts } from '@/lib/cardStrength';
import {
  deckSupport,
  MAX_MIXED_LEGS,
  MIXED_GAME_MIN_CARDS,
  type MixedDeckSupport,
  pickMixedSessionCards,
  planMixedPractice,
} from '@/lib/mixedPractice';
import type { CardProgress } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

const support = (overrides: Partial<MixedDeckSupport> = {}): MixedDeckSupport => ({
  cardCount: 12,
  fillCards: 12,
  readingCards: 12,
  readingUnlocked: false,
  ttsReady: false,
  ...overrides,
});

const counts = (overrides: Partial<StrengthCounts> = {}): StrengthCounts => ({
  new: 0,
  learning: 12,
  strong: 0,
  ...overrides,
});

const modes = (legs: { mode: string }[]) => legs.map((leg) => leg.mode);

const card = (overrides: Partial<Flashcard> = {}): Flashcard =>
  ({
    id: 'c1',
    word: '犬',
    reading: 'いぬ',
    meaning: 'dog',
    example_jp: '犬がすきです。',
    example_en: 'I like dogs.',
    deckId: 'd1',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    image_query: '',
    ...overrides,
  }) as Flashcard;

const progressRow = (overrides: Partial<CardProgress> = {}): CardProgress => ({
  cardId: 'c1',
  correctCount: 1,
  wrongCount: 0,
  lastReviewedAt: null,
  nextReviewAt: '2026-08-01T00:00:00.000Z',
  intervalDays: 6,
  ease: 2.5,
  ...overrides,
});

describe('planMixedPractice', () => {
  it('leaves a deck too small for any exercise alone', () => {
    expect(planMixedPractice({ support: support({ cardCount: 1 }), counts: counts() })).toEqual([]);
  });

  it('falls back to meaning pick alone — the floor every deck can serve', () => {
    const legs = planMixedPractice({
      support: support({ cardCount: 2, fillCards: 0, readingCards: 0 }),
      counts: counts({ learning: 2 }),
    });
    expect(modes(legs)).toEqual(['recall']);
  });

  it('meets unseen cards on flashcards before testing them', () => {
    const legs = planMixedPractice({
      support: support(),
      counts: counts({ new: 12, learning: 0 }),
    });
    expect(legs[0]).toEqual({ step: 'warmup', mode: 'study' });
  });

  it('skips the warm-up when every card has been seen before', () => {
    const legs = planMixedPractice({ support: support(), counts: counts() });
    expect(modes(legs)).not.toContain('study');
  });

  it('holds Listen back until a card has been answered at least once', () => {
    const ttsSupport = support({ ttsReady: true });
    expect(
      modes(planMixedPractice({ support: ttsSupport, counts: counts({ new: 12, learning: 0 }) })),
    ).not.toContain('listen');
    expect(modes(planMixedPractice({ support: ttsSupport, counts: counts() }))).toContain('listen');
  });

  it('drops Listen silently on a device with no Japanese voice', () => {
    expect(modes(planMixedPractice({ support: support(), counts: counts() }))).not.toContain(
      'listen',
    );
  });

  it('drops Word Match on a deck too small for a grid', () => {
    const legs = planMixedPractice({
      support: support({ cardCount: MIXED_GAME_MIN_CARDS - 1 }),
      counts: counts({ learning: 3 }),
    });
    expect(modes(legs)).not.toContain('match');
  });

  it('only asks a learner to produce a word once cards are strong', () => {
    expect(modes(planMixedPractice({ support: support(), counts: counts() }))).not.toContain(
      'fill',
    );
    expect(
      modes(planMixedPractice({ support: support(), counts: counts({ strong: 4 }) })),
    ).toContain('fill');
  });

  it('prefers reading over fill when the deck unlocks it', () => {
    const legs = planMixedPractice({
      support: support({ readingUnlocked: true }),
      counts: counts({ strong: 4 }),
    });
    expect(legs[legs.length - 1]).toEqual({ step: 'goal', mode: 'reading' });
  });

  it('has nothing to produce when no card carries a sentence', () => {
    const legs = planMixedPractice({
      support: support({ fillCards: 0, readingCards: 0 }),
      counts: counts({ strong: 4 }),
    });
    expect(modes(legs)).not.toContain('fill');
  });

  it('caps the session and never trims the production rung off the end', () => {
    const legs = planMixedPractice({
      support: support({ ttsReady: true }),
      counts: counts({ new: 4, learning: 4, strong: 4 }),
    });
    expect(legs.length).toBe(MAX_MIXED_LEGS);
    expect(modes(legs)).toEqual(['study', 'recall', 'listen', 'fill']);
  });

  it('leaves out the modes the caller owns already', () => {
    const legs = planMixedPractice({
      support: support(),
      counts: counts({ new: 12, learning: 12 }),
      exclude: ['study', 'recall'],
    });
    expect(modes(legs)).toEqual(['match']);
  });
});

describe('deckSupport', () => {
  it('counts only the cards each exercise can actually use', () => {
    const cards = [
      card({ id: 'a' }),
      card({ id: 'b', example_jp: '   ' }),
      card({ id: 'c', word: 'ねこ', reading: 'ねこ' }),
    ];
    expect(deckSupport(cards, { readingUnlocked: true, ttsReady: false })).toEqual({
      cardCount: 3,
      fillCards: 2,
      readingCards: 2,
      readingUnlocked: true,
      ttsReady: false,
    });
  });
});

describe('pickMixedSessionCards', () => {
  const now = new Date('2026-08-02T00:00:00.000Z');

  it('caps the session however big the deck is', () => {
    const cards = Array.from({ length: 40 }, (_, i) => card({ id: `c${i}` }));
    expect(pickMixedSessionCards(cards, [], now)).toHaveLength(12);
  });

  it('takes the cards being missed first, then unseen, then strong ones', () => {
    const cards = [card({ id: 'strong' }), card({ id: 'new' }), card({ id: 'learning' })];
    const progress = [
      progressRow({ cardId: 'strong', intervalDays: 20, ease: 2.5 }),
      progressRow({ cardId: 'learning', intervalDays: 0, ease: 2.1 }),
    ];
    expect(pickMixedSessionCards(cards, progress, now, 3).map((c) => c.id)).toEqual([
      'learning',
      'new',
      'strong',
    ]);
  });

  it('puts a due card ahead of one still waiting at the same strength', () => {
    const cards = [card({ id: 'waiting' }), card({ id: 'due' })];
    const progress = [
      progressRow({ cardId: 'waiting', nextReviewAt: '2026-09-01T00:00:00.000Z' }),
      progressRow({ cardId: 'due', nextReviewAt: '2026-07-01T00:00:00.000Z' }),
    ];
    expect(pickMixedSessionCards(cards, progress, now, 2).map((c) => c.id)).toEqual([
      'due',
      'waiting',
    ]);
  });

  it('leaves deck order alone when nothing separates two cards', () => {
    const cards = [card({ id: 'a' }), card({ id: 'b' }), card({ id: 'c' })];
    expect(pickMixedSessionCards(cards, [], now).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
});
