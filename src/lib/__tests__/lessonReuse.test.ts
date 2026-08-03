import { describe, expect, it } from 'vitest';

import { deckReuse, planReuse, reusedWords } from '@/lib/lessonReuse';
import type { PlanDeck } from '@/types/lessonPlan';

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

describe('reusedWords', () => {
  it('finds pool words inside a sentence, ignoring furigana markup', () => {
    expect(reusedWords('{猫|ねこ}が{好|す}きです', ['猫', 'いぬ'])).toEqual(['猫']);
  });

  it('returns nothing for an empty sentence or an empty pool', () => {
    expect(reusedWords('', ['猫'])).toEqual([]);
    expect(reusedWords('ねこがいます', [])).toEqual([]);
  });

  it('does not report the same word twice', () => {
    expect(reusedWords('ねことねこ', ['ねこ', 'ねこ'])).toEqual(['ねこ']);
  });
});

describe('deckReuse', () => {
  it('counts the cards whose example leans on a known word', () => {
    const result = deckReuse(
      deck('Week 1', [
        ['いぬ', 'ねことあそぶ'],
        ['とり', 'とりがいます'],
      ]),
      ['ねこ'],
    );

    expect(result).toMatchObject({ reused: 1, total: 2 });
    expect(result.perCard).toEqual([['ねこ'], []]);
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
    expect(second.perCard[0]).toEqual(['ねこ']);
  });
});
