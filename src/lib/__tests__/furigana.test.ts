import { describe, expect, it } from 'vitest';

import {
  furiganaToKana,
  normalizeFurigana,
  normalizeFuriganaDeep,
  parseFurigana,
  stripFurigana,
} from '@/lib/furigana';

// The shape Gemini returns for compounds: one reading per kanji, pipe-separated.
const PER_CHAR = '{学校|がっ|こう}へ{徒歩|と|ほ}で行きます';
const CANONICAL = 'お{会計|かいけい}お{願|ねが}いします';

describe('parseFurigana', () => {
  it('reads the canonical one-reading-per-group form', () => {
    expect(parseFurigana(CANONICAL)).toEqual([
      'お',
      { kanji: '会計', reading: 'かいけい' },
      'お',
      { kanji: '願', reading: 'ねが' },
      'いします',
    ]);
  });

  it('pairs a per-character reading with each kanji', () => {
    // This used to match nothing at all, so the braces and pipes rendered as
    // literal text on the card and were read out by the speak button.
    expect(parseFurigana(PER_CHAR)).toEqual([
      { kanji: '学', reading: 'がっ' },
      { kanji: '校', reading: 'こう' },
      'へ',
      { kanji: '徒', reading: 'と' },
      { kanji: '歩', reading: 'ほ' },
      'で行きます',
    ]);
  });

  it('joins readings that do not line up with the kanji', () => {
    expect(parseFurigana('{無関係|む|かんけい}です')).toEqual([
      { kanji: '無関係', reading: 'むかんけい' },
      'です',
    ]);
  });

  it('leaves unmarked text alone', () => {
    expect(parseFurigana('ねこが好きです')).toEqual(['ねこが好きです']);
    expect(parseFurigana('')).toEqual([]);
  });
});

describe('stripFurigana', () => {
  it('leaves the text as written', () => {
    expect(stripFurigana(CANONICAL)).toBe('お会計お願いします');
    expect(stripFurigana(PER_CHAR)).toBe('学校へ徒歩で行きます');
  });
});

describe('furiganaToKana', () => {
  it('replaces each kanji run with its reading', () => {
    expect(furiganaToKana(CANONICAL)).toBe('おかいけいおねがいします');
    expect(furiganaToKana('{学校|がっ|こう}へ')).toBe('がっこうへ');
  });
});

describe('normalizeFurigana', () => {
  it('splits a per-character group into one group per kanji', () => {
    expect(normalizeFurigana(PER_CHAR)).toBe('{学|がっ}{校|こう}へ{徒|と}{歩|ほ}で行きます');
  });

  it('leaves canonical markup untouched', () => {
    expect(normalizeFurigana(CANONICAL)).toBe(CANONICAL);
  });

  it('keeps a mismatched group as one group with the readings joined', () => {
    expect(normalizeFurigana('{無関係|む|かんけい}です')).toBe('{無関係|むかんけい}です');
  });
});

describe('normalizeFuriganaDeep', () => {
  it('normalizes every string in a nested reply', () => {
    const reply = {
      phrases: [{ japanese: '{学校|がっ|こう}へ', romaji: 'gakkou e', english: 'to school' }],
      note: null,
      count: 1,
    };
    expect(normalizeFuriganaDeep(reply)).toEqual({
      phrases: [{ japanese: '{学|がっ}{校|こう}へ', romaji: 'gakkou e', english: 'to school' }],
      note: null,
      count: 1,
    });
  });

  it('leaves non-Japanese payloads untouched', () => {
    const reply = { lines: ['hello', ''], ok: true, n: 3, nested: [[{ a: 'b' }]] };
    expect(normalizeFuriganaDeep(reply)).toEqual(reply);
  });
});
