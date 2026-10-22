import { beforeEach, describe, expect, it } from 'vitest';

import { MIN_SENTENCES } from '@/components/Practice/KotobaBubbleMode/constants';
import type { Assignment } from '@/hooks/useAssignments';
import {
  BASE_REVIEW_CAP,
  bumpDailyRound,
  dailyReviewCap,
  daysSince,
  estimateMinutes,
  fitDaily,
  MAX_DAILY_LEGS,
  MAX_REVIEW_CAP,
  pickFocusDeck,
  pickKanaRow,
  planDailyPractice,
  previewMinutes,
  readDailyRound,
} from '@/lib/dailyPractice';
import type { ChainLeg } from '@/lib/practiceChain';
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

const kanaAssignment = (overrides: Partial<Assignment> = {}): Assignment =>
  ({
    id: `ka-${overrides.kana_set ?? 'hira-ka'}`,
    deck_id: null,
    kana_set: 'hira-ka',
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

describe('pickKanaRow', () => {
  it('picks the soonest-due open kana row', () => {
    const set = pickKanaRow(
      [
        kanaAssignment({ kana_set: 'hira-ka', due_date: '2026-09-20' }),
        kanaAssignment({ kana_set: 'hira-a', due_date: '2026-09-05' }),
      ],
      TODAY,
    );
    expect(set).toBe('hira-a');
  });

  it('skips finished and not-yet-available rows', () => {
    expect(
      pickKanaRow(
        [
          kanaAssignment({ kana_set: 'hira-ka', completed_at: '2026-09-01T00:00:00Z' }),
          kanaAssignment({ kana_set: 'hira-sa', available_on: '2026-09-09' }),
          kanaAssignment({ kana_set: 'hira-a' }),
        ],
        TODAY,
      ),
    ).toBe('hira-a');
  });

  it('rotates between open rows as the day goes on', () => {
    const assignments = [
      kanaAssignment({ kana_set: 'hira-ka' }),
      kanaAssignment({ kana_set: 'hira-a' }),
    ];
    expect(pickKanaRow(assignments, TODAY, 0)).toBe('hira-ka');
    expect(pickKanaRow(assignments, TODAY, 1)).toBe('hira-a');
    expect(pickKanaRow(assignments, TODAY, 2)).toBe('hira-ka');
  });

  it('returns null when nothing is open', () => {
    expect(pickKanaRow([], TODAY)).toBeNull();
    expect(
      pickKanaRow([kanaAssignment({ completed_at: '2026-09-01T00:00:00Z' })], TODAY),
    ).toBeNull();
  });
});

describe('fitDaily', () => {
  const leg = (mode: ChainLeg['mode']): ChainLeg => ({ step: 'practice', mode });

  it('keeps the opener and the sentence leg over the rest', () => {
    const legs = [leg('recall'), leg('kotoba-bubble'), leg('listen'), leg('reading')];
    expect(fitDaily(legs, 2)).toEqual([leg('recall'), leg('kotoba-bubble')]);
    expect(fitDaily(legs, 3)).toEqual([leg('recall'), leg('kotoba-bubble'), leg('reading')]);
  });

  it("keeps today's rule — opener and closer — when there is no sentence leg", () => {
    const legs = [leg('recall'), leg('listen'), leg('match'), leg('fill')];
    expect(fitDaily(legs, 2)).toEqual([leg('recall'), leg('fill')]);
    expect(fitDaily(legs, 3)).toEqual([leg('recall'), leg('listen'), leg('fill')]);
  });

  it('never double-counts the sentence leg when it is also the opener', () => {
    const legs = [leg('kotoba-bubble'), leg('match'), leg('fill')];
    expect(fitDaily(legs, 2)).toEqual([leg('kotoba-bubble'), leg('fill')]);
  });

  it('handles the edges', () => {
    const legs = [leg('recall'), leg('listen'), leg('match')];
    expect(fitDaily(legs, 1)).toEqual([leg('recall')]);
    expect(fitDaily(legs, 0)).toEqual([]);
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

  it('leads with the assigned kana row, right after review and before the deck legs', () => {
    const legs = plan({ dueCount: 4, kanaRow: 'hira-ka' });
    expect(legs[0]).toEqual({ step: 'review', mode: 'review' });
    expect(legs[1]).toEqual({ step: 'practice', mode: 'kana-journey', kanaSet: 'hira-ka' });
    expect(legs.slice(2).every((leg) => leg.step !== 'review' && leg.mode !== 'kana-journey')).toBe(
      true,
    );
  });

  it('leads with the kana row even with no review due', () => {
    const legs = plan({ dueCount: 0, kanaRow: 'hira-ka' });
    expect(legs[0]).toEqual({ step: 'practice', mode: 'kana-journey', kanaSet: 'hira-ka' });
  });

  it('counts the kana leg against the cap, trimming a deck leg', () => {
    const progress = cards.map((c) => strong(c.id));
    const withKana = plan({
      dueCount: 5,
      ttsReady: true,
      progress,
      kanaRow: 'hira-ka',
      focus: focusFor(deck('d1', { readingPractice: true }), assignment({ required_mode: 'quiz' })),
    });
    const withoutKana = plan({
      dueCount: 5,
      ttsReady: true,
      progress,
      focus: focusFor(deck('d1', { readingPractice: true }), assignment({ required_mode: 'quiz' })),
    });
    expect(withKana.length).toBeLessThanOrEqual(MAX_DAILY_LEGS);
    expect(withKana.some((leg) => leg.mode === 'kana-journey')).toBe(true);
    expect(withKana.length).toBe(withoutKana.length);
    expect(
      withKana.filter((leg) => leg.step !== 'review' && leg.mode !== 'kana-journey').length,
    ).toBe(
      withoutKana.filter((leg) => leg.step !== 'review' && leg.mode !== 'kana-journey').length - 1,
    );
  });

  it('includes the sentence leg right after the deck opener, with deckId and cardIds', () => {
    const progress = cards.map((c) => strong(c.id));
    const legs = plan({
      dueCount: 4,
      kanaRow: 'hira-ka',
      sentenceCount: MIN_SENTENCES,
      ttsReady: true,
      progress,
      focus: focusFor(deck('d1'), assignment({ required_mode: 'quiz' })),
    });
    expect(legs.map((l) => l.mode)).toEqual([
      'review',
      'kana-journey',
      'recall',
      'kotoba-bubble',
      'quiz',
    ]);
    expect(legs[2]).toMatchObject({ deckId: 'd1' });
    expect(legs[2].cardIds).toHaveLength(12);
    expect(legs[3]).toMatchObject({ deckId: 'd1' });
    expect(legs[3].cardIds).toHaveLength(12);
    expect(legs[4]).toEqual({ step: 'goal', mode: 'quiz', deckId: 'd1' });
  });

  it('opens on study instead of recall when every card is new', () => {
    const legs = plan({
      dueCount: 4,
      kanaRow: 'hira-ka',
      sentenceCount: MIN_SENTENCES,
      ttsReady: true,
      progress: [],
      focus: focusFor(deck('d1'), assignment({ required_mode: 'quiz' })),
    });
    expect(legs.map((l) => l.mode)).toEqual([
      'review',
      'kana-journey',
      'study',
      'kotoba-bubble',
      'quiz',
    ]);
  });

  it('plays Sentence Builder exactly once when it is the assignment goal', () => {
    const legs = plan({
      sentenceCount: MIN_SENTENCES,
      focus: focusFor(deck('d1'), assignment({ required_mode: 'kotoba-bubble' })),
    });
    const sentenceLegs = legs.filter((l) => l.mode === 'kotoba-bubble');
    expect(sentenceLegs).toHaveLength(1);
    expect(legs[legs.length - 1]).toMatchObject({ step: 'goal', mode: 'kotoba-bubble' });
  });

  it('includes Sentence Builder as an ordinary practice leg with no assignment', () => {
    const legs = plan({ sentenceCount: MIN_SENTENCES });
    expect(legs).toContainEqual(
      expect.objectContaining({ step: 'practice', mode: 'kotoba-bubble' }),
    );
  });

  it('still leads with the kana row when it is the only open homework', () => {
    const decks = [deck('own'), deck('d1')];
    const focus = pickFocusDeck([], decks, TODAY);
    expect(focus?.assignment).toBeNull();
    const legs = plan({ dueCount: 0, kanaRow: 'hira-ka', focus });
    expect(legs[0]).toEqual({ step: 'practice', mode: 'kana-journey', kanaSet: 'hira-ka' });
  });
});

describe('estimates', () => {
  it('scales with due words and legs', () => {
    expect(estimateMinutes([{ step: 'review', mode: 'review' }], 6)).toBe(2);
    expect(estimateMinutes([{ step: 'review', mode: 'review' }], 60)).toBe(
      estimateMinutes([{ step: 'review', mode: 'review' }], BASE_REVIEW_CAP),
    );
    expect(estimateMinutes([{ step: 'practice', mode: 'recall' }], 0)).toBe(2);
    expect(estimateMinutes([], 0)).toBe(1);
  });

  it('previews a short session before any cards are loaded', () => {
    expect(previewMinutes(0, true)).toBe(5);
    expect(previewMinutes(3, false)).toBe(1);
  });

  it('prices in an assigned kana row when one is open', () => {
    expect(previewMinutes(0, false, true)).toBeGreaterThan(previewMinutes(0, false, false));
    expect(previewMinutes(0, true, true)).toBeGreaterThan(previewMinutes(0, true, false));
  });
});

describe('dailyReviewCap', () => {
  it('sizes the review to how long it has been', () => {
    expect(dailyReviewCap(null)).toBe(20);
    expect(dailyReviewCap(1)).toBe(20);
    expect(dailyReviewCap(2)).toBe(25);
    expect(dailyReviewCap(5)).toBe(40);
    expect(dailyReviewCap(30)).toBe(MAX_REVIEW_CAP);
  });
});

describe('daysSince', () => {
  it('is 0 for the same local day', () => {
    expect(daysSince('2026-09-02', '2026-09-02')).toBe(0);
  });

  it('passes null through both ways', () => {
    expect(daysSince(null, '2026-09-02')).toBeNull();
  });

  it('never goes negative', () => {
    expect(daysSince('2026-09-05', '2026-09-02')).toBe(0);
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
