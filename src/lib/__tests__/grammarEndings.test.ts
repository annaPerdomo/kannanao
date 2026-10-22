import { describe, expect, it } from 'vitest';

import {
  endingChoices,
  endingItems,
  FAMILY_ENDINGS,
  findEnding,
  isIiStem,
} from '@/lib/grammarEndings';
import type { Flashcard } from '@/types/flashcard';

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'c1',
    deckId: 'deck-1',
    word: 'たかい',
    reading: 'たかい',
    meaning: 'expensive',
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    ...overrides,
  };
}

describe('findEnding', () => {
  it('detects an i-adj negative and splits around it, furigana kept', () => {
    const card = makeCard({ example_jp: '{父|ちち}の{車|くるま}はあまりたかくないです。' });
    const item = findEnding(card);
    expect(item?.family).toBe('i-adj');
    expect(item?.form).toBe('negative');
    expect(item?.before).toBe('{父|ちち}の{車|くるま}はあまりたか');
    expect(item?.after).toBe('。');
  });

  it('detects an i-adj past', () => {
    const card = makeCard({ example_jp: 'きのうのホームワークはながかったです。' });
    const item = findEnding(card);
    expect(item?.family).toBe('i-adj');
    expect(item?.form).toBe('past');
  });

  it('detects a negative with the いい→よ stem swap', () => {
    const card = makeCard({
      word: 'いい',
      reading: 'いい',
      example_jp: 'このラジオはあまりよくないです。',
    });
    const item = findEnding(card);
    expect(item?.family).toBe('i-adj');
    expect(item?.form).toBe('negative');
    expect(item && isIiStem(item)).toBe(true);
  });

  it('does not treat すくない as a conjugated negative', () => {
    const card = makeCard({ example_jp: 'ひとがすくないです。' });
    expect(findEnding(card)).toBeNull();
  });

  it('does not treat すくなかった as a conjugated pastNegative either', () => {
    const card = makeCard({ example_jp: 'ひとがすくなかったです。' });
    expect(findEnding(card)).toBeNull();
  });

  it('still detects やすくないです as a real negative', () => {
    const card = makeCard({ example_jp: 'このペンはやすくないです。' });
    const item = findEnding(card);
    expect(item?.family).toBe('i-adj');
    expect(item?.form).toBe('negative');
  });

  it('still detects うすくなかったです as a real pastNegative', () => {
    const card = makeCard({ example_jp: 'このかみはうすくなかったです。' });
    const item = findEnding(card);
    expect(item?.family).toBe('i-adj');
    expect(item?.form).toBe('pastNegative');
  });

  it.each([
    'すみません、',
    'おはようございます',
    'ありがとうございました',
    'いただきます',
    'よろしくおねがいします',
    'ごちそうさまでした',
    'わかりました',
    'おなかがすきました',
  ])('treats the set phrase %s as not a grammar drill', (exampleJp) => {
    expect(findEnding(makeCard({ example_jp: exampleJp }))).toBeNull();
  });

  it('detects a na-noun past', () => {
    const card = makeCard({ example_jp: '{学生|がくせい}でした' });
    const item = findEnding(card);
    expect(item?.family).toBe('na-noun');
    expect(item?.form).toBe('past');
  });

  it('detects a masu present only at a sentence boundary', () => {
    const card = makeCard({ example_jp: '{毎日|まいにち}{勉強|べんきょう}します。' });
    const item = findEnding(card);
    expect(item?.family).toBe('masu');
    expect(item?.form).toBe('present');
  });

  it('still detects an ordinary masu past, unlike the set-phrase stems', () => {
    const card = makeCard({ example_jp: '{食|た}べました' });
    const item = findEnding(card);
    expect(item?.family).toBe('masu');
    expect(item?.form).toBe('past');
  });

  it('prefers the longer masu pastNegative over its negative prefix', () => {
    const card = makeCard({ example_jp: '{食|た}べませんでした' });
    const item = findEnding(card);
    expect(item?.family).toBe('masu');
    expect(item?.form).toBe('pastNegative');
    expect(item?.before).toBe('{食|た}べ');
    expect(item?.after).toBe('');
  });

  it('skips a match that starts or ends inside a furigana group', () => {
    // "ました" sits entirely inside the reading of this contrived group, so it
    // must not be picked up as a masu past ending.
    const card = makeCard({ example_jp: '{待|ました}つ。' });
    expect(findEnding(card)).toBeNull();
  });

  it('returns null for an empty example sentence', () => {
    expect(findEnding(makeCard({ example_jp: '' }))).toBeNull();
  });
});

describe('drillsCard', () => {
  it('is true when the card is built to teach the detected ending (Ch6)', () => {
    const card = makeCard({
      word: 'たかい (Negative)',
      meaning: 'たか くないです (drop い add くない)',
      example_jp: '{父|ちち}の{車|くるま}はあまりたかくないです。',
    });
    expect(findEnding(card)?.drillsCard).toBe(true);
  });

  it('is false for an ordinary vocab sentence that merely ends that way', () => {
    const card = makeCard({ word: 'たかい', meaning: 'expensive', example_jp: 'たかくないです。' });
    expect(findEnding(card)?.drillsCard).toBe(false);
  });
});

describe('endingItems', () => {
  it('keeps only cards with a detectable ending', () => {
    const withEnding = makeCard({ id: 'a', example_jp: 'きのうのホームワークはながかったです。' });
    const withoutEnding = makeCard({ id: 'b', example_jp: '猫が好きです' });
    expect(endingItems([withEnding, withoutEnding]).map((i) => i.card.id)).toEqual(['a']);
  });
});

describe('endingChoices', () => {
  it('returns all four forms in fixed order', () => {
    const item = findEnding(makeCard({ example_jp: 'たかくないです。' }))!;
    expect(endingChoices(item).map((c) => c.form)).toEqual([
      'present',
      'negative',
      'past',
      'pastNegative',
    ]);
    expect(endingChoices(item).map((c) => c.text)).toEqual(Object.values(FAMILY_ENDINGS['i-adj']));
  });
});
