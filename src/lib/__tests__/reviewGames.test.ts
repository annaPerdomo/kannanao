import { describe, expect, it } from 'vitest';

import {
  buildKanaTiles,
  buildQuizOptions,
  chunkRounds,
  countBlanks,
  hiraganaToKatakana,
  isBlankAnswer,
  isKatakana,
  isPureKana,
  shuffle,
} from '@/lib/reviewGames';

describe('isPureKana / isKatakana', () => {
  it('classifies scripts correctly', () => {
    expect(isPureKana('ひこうき')).toBe(true);
    expect(isPureKana('ハムスター')).toBe(true);
    expect(isPureKana('飛行機')).toBe(false);
    expect(isPureKana('へや room')).toBe(false);
    expect(isKatakana('ヨット')).toBe(true);
    expect(isKatakana('よっと')).toBe(false);
  });
});

describe('hiraganaToKatakana', () => {
  it('converts the homework katakana words correctly', () => {
    expect(hiraganaToKatakana('ういるす')).toBe('ウイルス');
    expect(hiraganaToKatakana('いーぐる')).toBe('イーグル');
    expect(hiraganaToKatakana('おれんじ')).toBe('オレンジ');
    expect(hiraganaToKatakana('よーぐると')).toBe('ヨーグルト');
    expect(hiraganaToKatakana('はむすたー')).toBe('ハムスター');
    expect(hiraganaToKatakana('よっと')).toBe('ヨット');
  });

  it('passes through the long-vowel mark and non-hiragana characters', () => {
    expect(hiraganaToKatakana('ー')).toBe('ー');
    expect(hiraganaToKatakana('abc 123')).toBe('abc 123');
  });

  it('handles small kana', () => {
    expect(hiraganaToKatakana('きゃ')).toBe('キャ');
    expect(hiraganaToKatakana('っ')).toBe('ッ');
  });
});

describe('buildKanaTiles', () => {
  it('contains every character of the word plus the requested decoys', () => {
    const word = 'ヨーグルト';
    const tiles = buildKanaTiles(word, 3);
    expect(tiles).toHaveLength(word.length + 3);
    const pool = [...tiles];
    for (const ch of word) {
      const i = pool.indexOf(ch);
      expect(i).toBeGreaterThanOrEqual(0);
      pool.splice(i, 1);
    }
    // Remaining tiles are decoys not present in the word
    for (const decoy of pool) {
      expect(word.includes(decoy)).toBe(false);
    }
  });

  it('keeps duplicate characters (ヨーヨー has two ヨ and two ー)', () => {
    const tiles = buildKanaTiles('ヨーヨー', 2);
    expect(tiles.filter((c) => c === 'ヨ').length).toBe(2);
    expect(tiles.filter((c) => c === 'ー').length).toBe(2);
  });

  it('draws decoys from the word’s own script', () => {
    const hiraganaDecoys = buildKanaTiles('ひこうき', 4).filter((c) => !'ひこうき'.includes(c));
    expect(hiraganaDecoys).toHaveLength(4);
    for (const decoy of hiraganaDecoys) {
      expect(/^[ぁ-ゖー]$/.test(decoy)).toBe(true);
    }
  });
});

describe('buildQuizOptions', () => {
  it('includes exactly one correct option among the distractors', () => {
    const options = buildQuizOptions('ねこ です。', ['なのか です。', 'ちこく です。']);
    expect(options).toHaveLength(3);
    expect(options.filter((o) => o.correct)).toHaveLength(1);
    expect(options.find((o) => o.correct)?.text).toBe('ねこ です。');
  });
});

describe('particle sentence helpers', () => {
  const segments = ['わたし', { answers: ['は'] }, 'ごはん', { answers: ['が'] }, 'すきです。'];

  it('counts blanks', () => {
    expect(countBlanks(segments)).toBe(2);
    expect(countBlanks(['ぼくは', 'せいとです。'])).toBe(0);
  });

  it('accepts any listed particle for a blank', () => {
    const blank = { answers: ['に', 'へ'] };
    expect(isBlankAnswer(blank, 'に')).toBe(true);
    expect(isBlankAnswer(blank, 'へ')).toBe(true);
    expect(isBlankAnswer(blank, 'を')).toBe(false);
    expect(isBlankAnswer('plain text', 'は')).toBe(false);
  });
});

describe('chunkRounds', () => {
  it('splits items into rounds of the given size', () => {
    expect(chunkRounds([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    expect(chunkRounds([], 3)).toEqual([]);
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    const out = shuffle(input);
    expect(input).toEqual(copy);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
