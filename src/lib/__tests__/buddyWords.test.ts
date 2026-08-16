import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buddyWordText,
  clearWords,
  RECENT_WORD_CAP,
  recentWords,
  rememberWords,
  sampleBuddyWords,
} from '@/lib/buddyWords';

const USER = 'user-1';
const OTHER = 'user-2';

function card(word: string, reading = '', meaning = 'meaning') {
  return { id: word, word, reading, meaning, deckId: 'd1' };
}

beforeEach(() => {
  localStorage.clear();
});

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

describe('rememberWords', () => {
  it('rolls the newest words to the front', () => {
    rememberWords(USER, [card('one'), card('two')]);
    rememberWords(USER, [card('three')]);

    expect(recentWords(USER).map((w) => w.word)).toEqual(['three', 'one', 'two']);
  });

  it('moves a repeated word up instead of storing it twice', () => {
    rememberWords(USER, [card('one'), card('two')]);
    rememberWords(USER, [card('two')]);

    expect(recentWords(USER).map((w) => w.word)).toEqual(['two', 'one']);
  });

  it('holds a rolling window', () => {
    for (let i = 0; i < RECENT_WORD_CAP + 5; i++) rememberWords(USER, [card(`w${i}`)]);

    const stored = recentWords(USER);
    expect(stored).toHaveLength(RECENT_WORD_CAP);
    expect(stored[0].word).toBe(`w${RECENT_WORD_CAP + 4}`);
  });

  it('leaves the stored list alone when a session had no usable words', () => {
    rememberWords(USER, [card('one')]);

    expect(rememberWords(USER, []).map((w) => w.word)).toEqual(['one']);
    expect(rememberWords(USER, [card('')]).map((w) => w.word)).toEqual(['one']);
  });

  it('keeps each account separate', () => {
    rememberWords(USER, [card('mine')]);
    rememberWords(OTHER, [card('theirs')]);

    expect(recentWords(USER).map((w) => w.word)).toEqual(['mine']);
    expect(recentWords(OTHER).map((w) => w.word)).toEqual(['theirs']);
  });

  it('stores nothing for a signed-out visitor', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    expect(rememberWords(null, [card('one')])).toEqual([]);
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('survives storage refusing the write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(() => rememberWords(USER, [card('one')])).not.toThrow();
    setItem.mockRestore();
  });
});

describe('recentWords', () => {
  it('degrades to nothing on garbage in storage', () => {
    localStorage.setItem('kannanao:buddy-words:user-1', 'not json');
    expect(recentWords(USER)).toEqual([]);

    localStorage.setItem('kannanao:buddy-words:user-1', '{"word":"solo"}');
    expect(recentWords(USER)).toEqual([]);
  });

  it('keeps the readable entries out of a half-broken list', () => {
    localStorage.setItem(
      'kannanao:buddy-words:user-1',
      JSON.stringify([{ nope: true }, { word: '犬', reading: 'いぬ', meaning: 'dog' }]),
    );

    expect(recentWords(USER)).toEqual([{ word: '犬', reading: 'いぬ' }]);
  });

  it('has nothing to report without a user', () => {
    expect(recentWords(undefined)).toEqual([]);
  });
});

describe('clearWords', () => {
  it('empties one account without touching the other', () => {
    rememberWords(USER, [card('mine')]);
    rememberWords(OTHER, [card('theirs')]);

    clearWords(USER);

    expect(recentWords(USER)).toEqual([]);
    expect(recentWords(OTHER)).toHaveLength(1);
  });

  it('is a no-op without a user', () => {
    expect(() => clearWords(null)).not.toThrow();
  });
});
