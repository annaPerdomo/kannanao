import { describe, expect, it } from 'vitest';

import { deckReuse, planReuse, reusedWords } from '@/lib/lessonReuse';
import type { PlanDeck, WarmUpWord } from '@/types/lessonPlan';

function deck(name: string, words: [string, string][]): PlanDeck {
  return {
    name,
    description: '',
    emoji: '📘',
    mainViewMode: 'hiragana',
    cards: words.map(([word, exampleJp]) => ({
      word,
      reading: word,
      meaning: 'meaning',
      exampleJp,
      exampleEn: 'example',
      jlptLevel: 'N5',
    })),
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

describe('reusedWords', () => {
  it('finds pool words inside a sentence, ignoring furigana markup', () => {
    expect(reusedWords('{猫|ねこ}が{好|す}きです', [known('猫'), known('いぬ')])).toEqual([
      known('猫'),
    ]);
  });

  it('returns nothing for an empty sentence or an empty pool', () => {
    expect(reusedWords('', [known('猫')])).toEqual([]);
    expect(reusedWords('ねこがいます', [])).toEqual([]);
  });

  it('does not report the same word twice', () => {
    expect(reusedWords('ねことねこ', [known('ねこ'), known('ねこ')])).toEqual([known('ねこ')]);
  });
});

describe('deckReuse', () => {
  it('counts the cards whose example leans on a known word', () => {
    const result = deckReuse(
      deck('Week 1', [
        ['いぬ', 'ねことあそぶ'],
        ['とり', 'とりがいます'],
      ]),
      [known('ねこ')],
    );

    expect(result).toMatchObject({ reused: 1, total: 2 });
    expect(result.perCard).toEqual([[known('ねこ')], []]);
  });

  it('leaves unticked and blank cards out of the counts but keeps perCard aligned', () => {
    const planned = deck('Week 1', [
      ['いぬ', 'ねことあそぶ'],
      ['とり', 'ねこととり'],
      ['', ''],
    ]);
    planned.cards[1].excluded = true;

    const result = deckReuse(planned, [known('ねこ')]);

    expect(result).toMatchObject({ reused: 1, total: 1 });
    expect(result.perCard).toHaveLength(3);
  });
});

describe('planReuse', () => {
  it('measures each deck against known words plus the decks before it', () => {
    const decks = [
      deck('Week 1', [['ねこ', 'ねこがいます']]),
      deck('Week 2', [['いぬ', 'ねこといぬ']]),
    ];

    const [first, second] = planReuse(decks, []);

    expect(first.reused).toBe(0);
    expect(second.reused).toBe(1);
    expect(second.perCard[0]).toEqual([
      { word: 'ねこ', reading: 'ねこ', meaning: 'meaning', deckName: 'Week 1', addedAt: null },
    ]);
  });

  it("a switched-off week's words never feed a later week's pool", () => {
    const decks = [
      deck('Week 1', [['ねこ', 'ねこがいます']]),
      deck('Week 2', [['いぬ', 'ねこといぬ']]),
    ];
    decks[0].excluded = true;

    const [, second] = planReuse(decks, []);

    expect(second.reused).toBe(0);
    expect(second.perCard[0]).toEqual([]);
  });
});
