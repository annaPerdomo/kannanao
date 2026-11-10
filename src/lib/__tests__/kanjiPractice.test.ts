import { describe, expect, it } from 'vitest';

import { hasKanjiWords, isKanjiWord, suggestKanjiPractice } from '../kanjiPractice';

const month = { word: '一月', reading: 'いちがつ', mainViewMode: 'hiragana' };
const cat = { word: 'ねこ', reading: 'ねこ', mainViewMode: 'hiragana' };

describe('isKanjiWord', () => {
  it('needs kanji in the word and a kana reading that differs from it', () => {
    expect(isKanjiWord(month)).toBe(true);
    expect(isKanjiWord({ word: '月よう日', reading: ' げつようび ' })).toBe(true);
    expect(isKanjiWord(cat)).toBe(false);
    expect(isKanjiWord({ word: 'テレビ', reading: 'テレビ' })).toBe(false);
    expect(isKanjiWord({ word: '一月', reading: '' })).toBe(false);
    expect(isKanjiWord({ word: '一月', reading: 'ichigatsu' })).toBe(false);
  });
});

describe('hasKanjiWords', () => {
  it('is true as soon as one card qualifies', () => {
    expect(hasKanjiWords([cat, month])).toBe(true);
    expect(hasKanjiWords([cat])).toBe(false);
    expect(hasKanjiWords([])).toBe(false);
  });
});

describe('suggestKanjiPractice', () => {
  it('never suggests it for a deck with no kanji words', () => {
    expect(suggestKanjiPractice({ cards: [cat], classUsesKanji: true })).toBe(false);
  });

  it('follows the group once it already practises kanji', () => {
    expect(suggestKanjiPractice({ cards: [cat, month], classUsesKanji: true })).toBe(true);
  });

  it('stays off for a kana-view deck in a group new to kanji', () => {
    expect(suggestKanjiPractice({ cards: [month], classUsesKanji: false })).toBe(false);
  });

  it('turns on when a kanji word is shown kanji-first', () => {
    const shown = { ...month, mainViewMode: 'kanji' };
    expect(suggestKanjiPractice({ cards: [cat, shown], classUsesKanji: false })).toBe(true);
  });
});
