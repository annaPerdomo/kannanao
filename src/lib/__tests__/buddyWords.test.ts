import { describe, expect, it } from 'vitest';

import {
  type BuddyWord,
  buddyWordText,
  MAX_WORD_LENGTH,
  mergeWords,
  normalizeWords,
  RECENT_WORD_CAP,
  sampleBuddyWords,
} from '@/lib/buddyWords';

function card(word: string, reading = '', meaning = 'meaning') {
  return { id: word, word, reading, meaning, deckId: 'd1' };
}

const names = (words: BuddyWord[]) => words.map((w) => w.word);

describe('sampleBuddyWords', () => {
  it('keeps only the fields the buddy needs', () => {
    expect(sampleBuddyWords([card('犬', 'いぬ', 'dog')], 1)).toEqual([
      { word: '犬', reading: 'いぬ' },
    ]);
  });

  it('caps the sample and never repeats a word', () => {
    const cards = [card('a'), card('b'), card('c'), card('d'), card('a')];
    const sample = sampleBuddyWords(cards);

    expect(sample).toHaveLength(3);
    expect(new Set(sample.map((w) => w.word)).size).toBe(3);
  });

  it('drops cards with no word at all', () => {
    expect(sampleBuddyWords([card(''), { word: null }, 'nonsense', null])).toEqual([]);
  });

  it('leaves out an empty reading rather than storing one', () => {
    expect(sampleBuddyWords([card('ねこ', '   ', 'cat')])[0].reading).toBeUndefined();
  });

  it('returns nothing when asked for nothing', () => {
    expect(sampleBuddyWords([card('犬', 'いぬ')], 0)).toEqual([]);
  });
});

describe('buddyWordText', () => {
  it('speaks the kana reading when there is one', () => {
    expect(buddyWordText({ word: '犬', reading: 'いぬ' })).toBe('いぬ');
  });

  it('falls back to the word itself', () => {
    expect(buddyWordText({ word: 'ねこ' })).toBe('ねこ');
  });
});

// These must stay in step with remember_buddy_words — the RPC's answer replaces
// this result on screen, and a disagreement shows up as a reshuffle.
describe('mergeWords', () => {
  it('rolls the newest words to the front', () => {
    const first = mergeWords([card('one'), card('two')], []);

    expect(names(mergeWords([card('three')], first))).toEqual(['three', 'one', 'two']);
  });

  it('moves a repeated word up instead of storing it twice', () => {
    const first = mergeWords([card('one'), card('two')], []);

    expect(names(mergeWords([card('two')], first))).toEqual(['two', 'one']);
  });

  it('holds a rolling window', () => {
    let window: BuddyWord[] = [];
    for (let i = 0; i < RECENT_WORD_CAP + 5; i++) window = mergeWords([card(`w${i}`)], window);

    expect(window).toHaveLength(RECENT_WORD_CAP);
    expect(window[0].word).toBe(`w${RECENT_WORD_CAP + 4}`);
  });

  it('leaves the window alone when a session had no usable words', () => {
    const window = mergeWords([card('one')], []);

    expect(names(mergeWords([], window))).toEqual(['one']);
    expect(names(mergeWords([card('')], window))).toEqual(['one']);
  });

  it('keeps a reading the newest copy of a word arrived without', () => {
    const window = mergeWords([card('犬', 'いぬ')], []);

    expect(mergeWords([card('犬')], window)).toEqual([{ word: '犬', reading: 'いぬ' }]);
  });

  it('truncates an over-long entry the way the RPC does', () => {
    const long = 'あ'.repeat(MAX_WORD_LENGTH + 20);

    expect(mergeWords([card(long)], [])[0].word).toHaveLength(MAX_WORD_LENGTH);
  });
});

describe('normalizeWords', () => {
  it('degrades to nothing on a column that is not a list', () => {
    expect(normalizeWords('not json')).toEqual([]);
    expect(normalizeWords({ word: 'solo' })).toEqual([]);
    expect(normalizeWords(null)).toEqual([]);
  });

  it('keeps the readable entries out of a half-broken list', () => {
    const stored = [{ nope: true }, { word: '犬', reading: 'いぬ', meaning: 'dog' }];

    expect(normalizeWords(stored)).toEqual([{ word: '犬', reading: 'いぬ' }]);
  });

  it('caps a row that somehow holds more than the window', () => {
    const stored = Array.from({ length: RECENT_WORD_CAP + 3 }, (_, i) => ({ word: `w${i}` }));

    expect(normalizeWords(stored)).toHaveLength(RECENT_WORD_CAP);
  });
});
