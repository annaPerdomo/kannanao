import { describe, expect, it } from 'vitest';

import { MIN_SENTENCES } from '@/components/Practice/KotobaBubbleMode/constants';
import type { StrengthCounts } from '@/lib/cardStrength';
import {
  deckSupport,
  GRAMMAR_DROP_ORDER,
  MAX_MIXED_LEGS,
  MIXED_GAME_MIN_CARDS,
  type MixedDeckSupport,
  pickMixedSessionCards,
  planMixedPractice,
  trimLadder,
  VOCAB_DROP_ORDER,
} from '@/lib/mixedPractice';
import type { ChainLeg } from '@/lib/practiceChain';
import type { CardProgress } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

const support = (overrides: Partial<MixedDeckSupport> = {}): MixedDeckSupport => ({
  cardCount: 12,
  fillCards: 12,
  readingCards: 12,
  readingUnlocked: false,
  ttsReady: false,
  sentenceCount: 0,
  endingItems: 0,
  drillItems: 0,
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

  it('puts Sentence Builder early and lets fill close the ladder', () => {
    const legs = planMixedPractice({
      support: support({ sentenceCount: MIN_SENTENCES }),
      counts: counts({ strong: 4 }),
    });
    expect(modes(legs)).toEqual(['recall', 'kotoba-bubble', 'match', 'fill']);
  });

  it('keeps reading above Kotoba Bubble when the deck unlocks it', () => {
    const legs = planMixedPractice({
      support: support({ readingUnlocked: true, sentenceCount: 20 }),
      counts: counts({ strong: 4 }),
    });
    expect(legs[legs.length - 1]).toEqual({ step: 'goal', mode: 'reading' });
  });

  it('falls through to fill on a deck one sentence short of the floor', () => {
    const legs = planMixedPractice({
      support: support({ sentenceCount: MIN_SENTENCES - 1 }),
      counts: counts({ strong: 4 }),
    });
    expect(legs[legs.length - 1]).toEqual({ step: 'goal', mode: 'fill' });
    expect(modes(legs)).not.toContain('kotoba-bubble');
  });

  it('plays Sentence Builder with no strong cards at all — it is not production', () => {
    const legs = planMixedPractice({
      support: support({ sentenceCount: 20 }),
      counts: counts(),
    });
    expect(modes(legs)).toEqual(['recall', 'kotoba-bubble', 'match']);
  });

  it('caps the session with the Sentence Builder rung in play', () => {
    const legs = planMixedPractice({
      support: support({ ttsReady: true, sentenceCount: 20 }),
      counts: counts({ new: 4, learning: 4, strong: 4 }),
    });
    expect(legs.length).toBe(MAX_MIXED_LEGS);
    expect(modes(legs)).toEqual(['study', 'recall', 'kotoba-bubble', 'fill']);
  });

  it('puts Sentence Builder right after recall, before Listen, on a fresh lesson', () => {
    const legs = planMixedPractice({
      support: support({ sentenceCount: MIN_SENTENCES, ttsReady: true }),
      counts: counts({ new: 12, learning: 0 }),
    });
    expect(modes(legs)).toEqual(['study', 'recall', 'kotoba-bubble', 'match']);
  });

  it('trims match before dropping Sentence Builder in a half-new session', () => {
    const legs = planMixedPractice({
      support: support({ sentenceCount: MIN_SENTENCES, ttsReady: true }),
      counts: counts({ new: 6, learning: 6 }),
    });
    expect(modes(legs)).toEqual(['study', 'recall', 'kotoba-bubble', 'listen']);
  });

  it('keeps Sentence Builder ahead of Reading when a card is already strong', () => {
    const legs = planMixedPractice({
      support: support({ sentenceCount: MIN_SENTENCES, ttsReady: true, readingUnlocked: true }),
      counts: counts({ learning: 11, strong: 1 }),
    });
    expect(modes(legs)).toEqual(['recall', 'kotoba-bubble', 'listen', 'reading']);
  });

  it('drops Sentence Builder with no sentences, unchanged from before this pack', () => {
    const legs = planMixedPractice({
      support: support({ sentenceCount: 0, ttsReady: true }),
      counts: counts({ learning: 11, strong: 1 }),
    });
    expect(modes(legs)).toEqual(['recall', 'listen', 'match', 'fill']);
  });

  it('drops match and listen before touching endings or Sentence Builder', () => {
    const legs = planMixedPractice({
      support: support({
        endingItems: 4,
        drillItems: 0,
        sentenceCount: MIN_SENTENCES,
        ttsReady: true,
      }),
      counts: counts({ learning: 8, strong: 4 }),
    });
    expect(modes(legs)).toEqual(['recall', 'kotoba-bubble', 'endings', 'fill']);
  });

  it('puts endings right after the first leg and keeps Sentence Builder on a quiet grammar deck', () => {
    const grammarSupport = support({
      cardCount: 4,
      fillCards: 4,
      endingItems: 4,
      drillItems: 4,
      sentenceCount: MIN_SENTENCES,
    });
    expect(
      modes(planMixedPractice({ support: grammarSupport, counts: counts({ learning: 4 }) })),
    ).toEqual(['recall', 'endings', 'kotoba-bubble', 'match']);
  });

  it('drops match, listen and recall before endings or Sentence Builder on a busy grammar deck', () => {
    const grammarSupport = support({
      cardCount: 4,
      fillCards: 4,
      endingItems: 4,
      drillItems: 4,
      sentenceCount: MIN_SENTENCES,
      ttsReady: true,
    });
    expect(
      modes(
        planMixedPractice({
          support: grammarSupport,
          counts: counts({ new: 2, learning: 0, strong: 2 }),
        }),
      ),
    ).toEqual(['study', 'endings', 'kotoba-bubble', 'fill']);
  });

  it('excludes Sentence Builder from the mixed plan entirely when the caller owns it', () => {
    const legs = planMixedPractice({
      support: support({ sentenceCount: 20 }),
      counts: counts({ strong: 4 }),
      exclude: ['kotoba-bubble'],
    });
    expect(modes(legs)).not.toContain('kotoba-bubble');
  });

  it('is Sentence Builder alone when recall is excluded on a tiny deck', () => {
    const legs = planMixedPractice({
      support: support({ cardCount: 2, fillCards: 2, sentenceCount: MIN_SENTENCES }),
      counts: counts({ learning: 2 }),
      exclude: ['recall'],
    });
    expect(modes(legs)).toEqual(['kotoba-bubble']);
  });

  it('pairs recall with Sentence Builder on a tiny deck with no other support', () => {
    const legs = planMixedPractice({
      support: support({ cardCount: 2, fillCards: 2, sentenceCount: MIN_SENTENCES }),
      counts: counts({ learning: 2 }),
    });
    expect(modes(legs)).toEqual(['recall', 'kotoba-bubble']);
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

  it('puts the endings leg right after the first leg on a grammar deck', () => {
    const legs = planMixedPractice({
      support: support({
        cardCount: 4,
        fillCards: 4,
        readingCards: 0,
        endingItems: 4,
        drillItems: 4,
      }),
      counts: counts({ learning: 0, strong: 4 }),
    });
    expect(modes(legs)).toEqual(['recall', 'endings', 'match', 'fill']);
  });

  it('puts the endings leg last-but-one on a deck with some drilled cards', () => {
    const legs = planMixedPractice({
      support: support({ endingItems: 4, drillItems: 1 }),
      counts: counts({ learning: 0, strong: 4 }),
    });
    expect(modes(legs)).toEqual(['recall', 'match', 'endings', 'fill']);
  });

  it('puts the endings leg last-but-one even with no drilled cards at all', () => {
    const legs = planMixedPractice({
      support: support({ endingItems: 4, drillItems: 0 }),
      counts: counts({ learning: 0, strong: 4 }),
    });
    expect(modes(legs)).toEqual(['recall', 'match', 'endings', 'fill']);
  });

  it('leaves out the endings leg under the minimum', () => {
    const legs = planMixedPractice({
      support: support({ endingItems: 3 }),
      counts: counts({ learning: 0, strong: 4 }),
    });
    expect(modes(legs)).not.toContain('endings');
  });
});

describe('trimLadder', () => {
  const leg = (mode: ChainLeg['mode']): ChainLeg => ({ step: 'practice', mode });

  it('returns the inputs unchanged when already within budget', () => {
    const opening = [leg('recall'), leg('match')];
    expect(trimLadder(opening, [leg('fill')], 4, VOCAB_DROP_ORDER)).toEqual([
      ...opening,
      leg('fill'),
    ]);
  });

  it('never removes the first leg, even when its mode leads the drop order', () => {
    const opening = [leg('match'), leg('recall')];
    const result = trimLadder(opening, [], 1, VOCAB_DROP_ORDER);
    expect(result).toEqual([leg('match')]);
  });

  it('removes the last occurrence when a mode appears twice', () => {
    const opening = [leg('recall'), leg('match'), leg('listen'), leg('match')];
    const result = trimLadder(opening, [], 3, VOCAB_DROP_ORDER);
    expect(result).toEqual([leg('recall'), leg('match'), leg('listen')]);
  });

  it('falls back to the last non-sentence leg once the drop order is exhausted', () => {
    const opening = [leg('recall'), leg('kotoba-bubble'), leg('study')];
    const result = trimLadder(opening, [], 2, VOCAB_DROP_ORDER);
    expect(result).toEqual([leg('recall'), leg('kotoba-bubble')]);
  });

  it('drops recall last on a grammar deck, after match and listen', () => {
    const opening = [
      leg('study'),
      leg('endings'),
      leg('recall'),
      leg('kotoba-bubble'),
      leg('match'),
    ];
    const result = trimLadder(opening, [], 3, GRAMMAR_DROP_ORDER);
    expect(result).toEqual([leg('study'), leg('endings'), leg('kotoba-bubble')]);
  });

  it('returns the over-budget ladder unchanged when nothing is removable', () => {
    const result = trimLadder([leg('kotoba-bubble')], [leg('fill')], 1, VOCAB_DROP_ORDER);
    expect(result).toEqual([leg('kotoba-bubble'), leg('fill')]);
  });
});

describe('deckSupport', () => {
  it('counts only the cards each exercise can actually use', () => {
    const cards = [
      card({ id: 'a' }),
      card({ id: 'b', example_jp: '   ' }),
      card({ id: 'c', word: 'ねこ', reading: 'ねこ' }),
    ];
    expect(
      deckSupport(cards, { readingUnlocked: true, ttsReady: false, sentenceCount: 8 }),
    ).toEqual({
      cardCount: 3,
      fillCards: 2,
      readingCards: 2,
      readingUnlocked: true,
      ttsReady: false,
      sentenceCount: 8,
      endingItems: 0,
      drillItems: 0,
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
