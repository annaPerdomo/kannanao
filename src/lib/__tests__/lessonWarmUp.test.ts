import { describe, expect, it } from 'vitest';

import { mergeWarmUp, normalizeWord, splitKnownCards } from '@/lib/lessonWarmUp';
import type { LessonPlan, PlanCard, PlanDeck, WarmUpWord } from '@/types/lessonPlan';

function card(word: string, overrides: Partial<PlanCard> = {}): PlanCard {
  return {
    word,
    reading: word,
    meaning: 'meaning',
    exampleJp: 'example',
    exampleEn: 'example',
    jlptLevel: 'N5',
    ...overrides,
  };
}

function deck(name: string, cards: PlanCard[], overrides: Partial<PlanDeck> = {}): PlanDeck {
  return {
    name,
    description: 'desc',
    emoji: '📘',
    mainViewMode: 'hiragana',
    cards,
    ...overrides,
  };
}

function known(word: string, overrides: Partial<WarmUpWord> = {}): WarmUpWord {
  return {
    word,
    reading: word,
    meaning: 'meaning',
    deckName: 'Old Deck',
    addedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('normalizeWord', () => {
  it('NFKC-normalizes and trims', () => {
    expect(normalizeWord('ｶﾞｯｺｳ')).toBe('ガッコウ');
    expect(normalizeWord(' 猫 ')).toBe('猫');
  });
});

describe('splitKnownCards', () => {
  it('filters a card whose word matches a pool word exactly', () => {
    const plan: LessonPlan = { decks: [deck('Week 1', [card('学校'), card('いぬ')])] };
    const pool = [known('学校')];

    const { plan: filtered, warmUp } = splitKnownCards(plan, pool);

    expect(filtered.decks[0].cards.map((c) => c.word)).toEqual(['いぬ']);
    expect(warmUp).toEqual([pool[0]]);
  });

  it('matches across NFKC/whitespace variants', () => {
    const plan: LessonPlan = {
      decks: [deck('Week 1', [card('ガッコウ'), card(' 猫 '), card('いぬ')])],
    };
    const pool = [known('ｶﾞｯｺｳ'), known('猫')];

    const { plan: filtered, warmUp } = splitKnownCards(plan, pool);

    expect(filtered.decks[0].cards.map((c) => c.word)).toEqual(['いぬ']);
    expect(warmUp).toEqual([pool[0], pool[1]]);
  });

  it('does not filter on reading — a known 会う must not remove a generated 合う', () => {
    const plan: LessonPlan = { decks: [deck('Week 1', [card('合う', { reading: 'あう' })])] };
    const pool = [known('会う', { reading: 'あう' })];

    const { plan: filtered, warmUp } = splitKnownCards(plan, pool);

    expect(filtered.decks[0].cards.map((c) => c.word)).toEqual(['合う']);
    expect(warmUp).toEqual([]);
  });

  it('carries the pool entry data, not the generated card, deduped across decks', () => {
    const plan: LessonPlan = {
      decks: [
        deck('Week 1', [card('学校', { reading: 'せいと', meaning: 'wrong' })]),
        deck('Week 2', [card('学校', { reading: 'せいと', meaning: 'wrong' })]),
      ],
    };
    const pool = [known('学校', { reading: 'がっこう', meaning: 'school', deckName: 'Basics' })];

    const { warmUp } = splitKnownCards(plan, pool);

    expect(warmUp).toEqual([
      {
        word: '学校',
        reading: 'がっこう',
        meaning: 'school',
        deckName: 'Basics',
        addedAt: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('when the pool has duplicate words, the first entry wins', () => {
    const plan: LessonPlan = { decks: [deck('Week 1', [card('学校')])] };
    const pool = [known('学校', { deckName: 'First' }), known('学校', { deckName: 'Second' })];

    const { warmUp } = splitKnownCards(plan, pool);

    expect(warmUp).toEqual([expect.objectContaining({ deckName: 'First' })]);
  });

  it('keeps a deck emptied by the filter in place, same index and name, cards: []', () => {
    const plan: LessonPlan = {
      decks: [deck('Week 1', [card('いぬ')]), deck('Week 2', [card('学校')])],
    };
    const pool = [known('学校')];

    const { plan: filtered } = splitKnownCards(plan, pool);

    expect(filtered.decks).toHaveLength(2);
    expect(filtered.decks[1]).toMatchObject({ name: 'Week 2', cards: [] });
  });

  it('preserves deck name, description, emoji, mainViewMode and excluded flag', () => {
    const plan: LessonPlan = {
      decks: [deck('Week 1', [card('いぬ')], { excluded: true, mainViewMode: 'kanji' })],
    };

    const { plan: filtered } = splitKnownCards(plan, []);

    expect(filtered.decks[0]).toMatchObject({
      name: 'Week 1',
      description: 'desc',
      emoji: '📘',
      mainViewMode: 'kanji',
      excluded: true,
    });
  });

  it('returns a structurally equal plan and warmUp: [] for an empty pool', () => {
    const plan: LessonPlan = { decks: [deck('Week 1', [card('いぬ'), card('ねこ')])] };

    const { plan: filtered, warmUp } = splitKnownCards(plan, []);

    expect(filtered).toEqual(plan);
    expect(warmUp).toEqual([]);
  });

  it('does not mutate the input plan or pool', () => {
    const plan: LessonPlan = { decks: [deck('Week 1', [card('学校'), card('いぬ')])] };
    const pool = [known('学校')];
    const planCopy = JSON.parse(JSON.stringify(plan));
    const poolCopy = JSON.parse(JSON.stringify(pool));

    splitKnownCards(plan, pool);

    expect(plan).toEqual(planCopy);
    expect(pool).toEqual(poolCopy);
  });
});

describe('mergeWarmUp', () => {
  it('unions entries, current wins on collision, order stable', () => {
    const current = [known('学校', { deckName: 'Current' }), known('いぬ')];
    const next = [known('学校', { deckName: 'Next' }), known('ねこ')];

    const merged = mergeWarmUp(current, next);

    expect(merged).toEqual([known('学校', { deckName: 'Current' }), known('いぬ'), known('ねこ')]);
  });

  it('returns current unchanged when next is empty', () => {
    const current = [known('学校')];

    expect(mergeWarmUp(current, [])).toEqual(current);
  });

  it('returns next when current is empty', () => {
    const next = [known('学校'), known('いぬ')];

    expect(mergeWarmUp([], next)).toEqual(next);
  });
});
