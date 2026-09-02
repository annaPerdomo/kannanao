import { beforeEach, describe, expect, it } from 'vitest';

import type { Assignment } from '@/hooks/useAssignments';
import {
  bumpDailyRound,
  DAILY_REVIEW_CAP,
  estimateMinutes,
  MAX_DAILY_LEGS,
  pickFocusDeck,
  planDailyPractice,
  previewMinutes,
  readDailyRound,
} from '@/lib/dailyPractice';
import type { CardProgress } from '@/lib/supabase';
import type { Deck } from '@/types/deck';
import type { Flashcard } from '@/types/flashcard';

const TODAY = '2026-09-02';

const deck = (id: string, overrides: Partial<Deck> = {}): Deck =>
  ({ id, name: `Deck ${id}`, emoji: '📘', cardCount: 12, ...overrides }) as Deck;

const assignment = (overrides: Partial<Assignment> = {}): Assignment =>
  ({
    id: `a-${overrides.deck_id ?? 'd1'}`,
    deck_id: 'd1',
    completed_at: null,
    available_on: null,
    due_date: null,
    created_at: '2026-08-01T00:00:00Z',
    required_mode: null,
    required_accuracy: null,
    ...overrides,
  }) as Assignment;

const card = (id: string, example = '犬がすきです。'): Flashcard =>
  ({
    id,
    word: '犬',
    reading: 'いぬ',
    meaning: 'dog',
    example_jp: example,
    example_en: 'I like dogs.',
    deckId: 'd1',
    mainViewMode: 'hiragana',
  }) as Flashcard;

const strong = (cardId: string): CardProgress => ({
  cardId,
  correctCount: 5,
  wrongCount: 0,
  lastReviewedAt: '2026-08-30T00:00:00Z',
  nextReviewAt: '2026-09-10T00:00:00Z',
  intervalDays: 8,
  ease: 2.5,
});

const focusFor = (d: Deck, a: Assignment | null = null) => pickFocusDeck(a ? [a] : [], [d], TODAY);

describe('pickFocusDeck', () => {
  it('puts the soonest-due open assignment first', () => {
    const decks = [deck('d1'), deck('d2'), deck('d3')];
    const focus = pickFocusDeck(
      [
        assignment({ deck_id: 'd1', due_date: '2026-09-20' }),
        assignment({ deck_id: 'd2', due_date: '2026-09-05' }),
        assignment({ deck_id: 'd3' }),
      ],
      decks,
      TODAY,
    );
    expect(focus?.deckId).toBe('d2');
    expect(focus?.assignment?.id).toBe('a-d2');
  });

  it('skips finished and not-yet-available assignments', () => {
    const focus = pickFocusDeck(
      [
        assignment({ deck_id: 'd1', completed_at: '2026-09-01T00:00:00Z' }),
        assignment({ deck_id: 'd2', available_on: '2026-09-09' }),
        assignment({ deck_id: 'd3' }),
      ],
      [deck('d1'), deck('d2'), deck('d3')],
      TODAY,
    );
    expect(focus?.deckId).toBe('d3');
  });

  it('rotates between open assignments as the day goes on', () => {
    const assignments = [assignment({ deck_id: 'd1' }), assignment({ deck_id: 'd2' })];
    const decks = [deck('d1'), deck('d2')];
    expect(pickFocusDeck(assignments, decks, TODAY, 0)?.deckId).toBe('d1');
    expect(pickFocusDeck(assignments, decks, TODAY, 1)?.deckId).toBe('d2');
    expect(pickFocusDeck(assignments, decks, TODAY, 2)?.deckId).toBe('d1');
  });

  it('falls back to the decks, assigned ones first, once everything is complete', () => {
    const decks = [deck('own'), deck('d1')];
    const done = [assignment({ deck_id: 'd1', completed_at: '2026-09-01T00:00:00Z' })];
    const first = pickFocusDeck(done, decks, TODAY, 0);
    const second = pickFocusDeck(done, decks, TODAY, 1);
    expect(first?.assignment).toBeNull();
    expect(new Set([first?.deckId, second?.deckId])).toEqual(new Set(['own', 'd1']));
  });

  it('never picks a deck too small to practise', () => {
    expect(pickFocusDeck([assignment()], [deck('d1', { cardCount: 1 })], TODAY)).toBeNull();
  });

  it('carries whether Reading is unlocked for the deck', () => {
    expect(focusFor(deck('d1', { readingPractice: true }))?.readingUnlocked).toBe(true);
    expect(focusFor(deck('d1'))?.readingUnlocked).toBe(false);
  });
});

describe('planDailyPractice', () => {
  const cards = Array.from({ length: 12 }, (_, i) => card(`c${i}`));
  const plan = (input: Partial<Parameters<typeof planDailyPractice>[0]>) =>
    planDailyPractice({
      dueCount: 0,
      focus: focusFor(deck('d1')),
      cards,
      progress: [],
      ttsReady: false,
      sentenceCount: 0,
      ...input,
    });

  it('opens on the cross-deck review when words are due', () => {
    const legs = plan({ dueCount: 4 });
    expect(legs[0]).toEqual({ step: 'review', mode: 'review' });
  });

  it('still opens on review when only characters are slipping', () => {
    const legs = plan({ dueCount: 0, kanaDue: true });
    expect(legs[0]).toEqual({ step: 'review', mode: 'review' });
  });

  it('skips the review leg when nothing is due', () => {
    expect(plan({}).some((leg) => leg.step === 'review')).toBe(false);
  });

  it('binds every deck leg to the focus deck and its session cards', () => {
    const legs = plan({}).filter((leg) => leg.step !== 'review');
    expect(legs.length).toBeGreaterThan(0);
    for (const leg of legs) {
      expect(leg.deckId).toBe('d1');
      expect(leg.cardIds).toHaveLength(12);
    }
  });

  it('is just the review when there is no deck to practise', () => {
    expect(plan({ dueCount: 3, focus: null })).toEqual([{ step: 'review', mode: 'review' }]);
    expect(plan({ focus: null })).toEqual([]);
  });

  it('ends on the assignment goal, played on the whole deck', () => {
    const legs = plan({
      focus: focusFor(deck('d1'), assignment({ required_mode: 'quiz', required_accuracy: 80 })),
    });
    const last = legs[legs.length - 1];
    expect(last).toEqual({ step: 'goal', mode: 'quiz', deckId: 'd1' });
    expect(legs.filter((leg) => leg.mode === 'quiz')).toHaveLength(1);
  });

  it('drops a Reading goal the deck has not unlocked', () => {
    const legs = plan({ focus: focusFor(deck('d1'), assignment({ required_mode: 'reading' })) });
    expect(legs.some((leg) => leg.mode === 'reading')).toBe(false);
  });

  it('never exceeds the leg cap, keeping the opener and the production rung', () => {
    const progress = cards.map((c) => strong(c.id));
    const legs = plan({
      dueCount: 5,
      ttsReady: true,
      progress,
      focus: focusFor(deck('d1', { readingPractice: true }), assignment({ required_mode: 'quiz' })),
    });
    expect(legs.length).toBeLessThanOrEqual(MAX_DAILY_LEGS);
    expect(legs[0].step).toBe('review');
    expect(legs[legs.length - 1].mode).toBe('quiz');
    expect(legs.some((leg) => leg.mode === 'reading' || leg.mode === 'fill')).toBe(true);
  });
});

describe('estimates', () => {
  it('scales with due words and legs', () => {
    expect(estimateMinutes([{ step: 'review', mode: 'review' }], 6)).toBe(2);
    expect(estimateMinutes([{ step: 'review', mode: 'review' }], 60)).toBe(
      estimateMinutes([{ step: 'review', mode: 'review' }], DAILY_REVIEW_CAP),
    );
    expect(estimateMinutes([{ step: 'practice', mode: 'recall' }], 0)).toBe(2);
    expect(estimateMinutes([], 0)).toBe(1);
  });

  it('previews a short session before any cards are loaded', () => {
    expect(previewMinutes(0, true)).toBe(5);
    expect(previewMinutes(3, false)).toBe(1);
  });
});

describe('daily round', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('counts starts within the day and resets on a new one', () => {
    expect(readDailyRound(TODAY)).toBe(0);
    bumpDailyRound(TODAY);
    bumpDailyRound(TODAY);
    expect(readDailyRound(TODAY)).toBe(2);
    expect(readDailyRound('2026-09-03')).toBe(0);
  });
});
