import { beforeAll, describe, expect, it } from 'vitest';

import {
  isUsualReading,
  type KanjiReadingDict,
  loadKanjiReadings,
  splitReading,
} from '@/lib/kanjiReadings';

let dict: KanjiReadingDict;
beforeAll(async () => {
  dict = await loadKanjiReadings();
});

describe('splitReading', () => {
  it.each([
    ['駐車', 'ちゅうしゃ', ['ちゅう', 'しゃ']],
    ['禁止', 'きんし', ['きん', 'し']],
    ['無関係', 'むかんけい', ['む', 'かん', 'けい']],
    ['学校', 'がっこう', ['がっ', 'こう']],
    ['日記', 'にっき', ['にっ', 'き']],
    ['人々', 'ひとびと', ['ひと', 'びと']],
    ['一本', 'いっぽん', ['いっ', 'ぽん']],
    ['手紙', 'てがみ', ['て', 'がみ']],
    ['取引', 'とりひき', ['とり', 'ひき']],
    ['切手', 'きって', ['きっ', 'て']],
    ['日本', 'にほん', ['に', 'ほん']],
    ['入居者', 'にゅうきょしゃ', ['にゅう', 'きょ', 'しゃ']],
  ])('%s %s → %j', (kanji, reading, expected) => {
    expect(splitReading(kanji, reading, dict)).toEqual(expected);
  });

  it('keeps katakana readings as typed while matching them as hiragana', () => {
    expect(splitReading('駐車', 'チュウシャ', dict)).toEqual(['チュウ', 'シャ']);
  });

  it.each([
    ['今日', 'きょう'],
    ['大人', 'おとな'],
    ['明日', 'あした'],
    ['時計', 'とけい'],
    ['一人', 'ひとり'],
    ['二人', 'ふたり'],
    ['上手', 'じょうず'],
    ['一人暮', 'ひとりぐ'],
  ])('returns null for jukujikun %s %s', (kanji, reading) => {
    expect(splitReading(kanji, reading, dict)).toBeNull();
  });

  it('still splits compounds that only resemble a jukujikun exception in kanji or reading', () => {
    expect(splitReading('人々', 'ひとびと', dict)).toEqual(['ひと', 'びと']);
    expect(splitReading('入居者', 'にゅうきょしゃ', dict)).toEqual(['にゅう', 'きょ', 'しゃ']);
  });

  it('returns null for a wrong reading, a single kanji, or an empty reading', () => {
    expect(splitReading('駐車', 'ちゅうくるまま', dict)).toBeNull();
    expect(splitReading('駐', 'ちゅう', dict)).toBeNull();
    expect(splitReading('駐車', '', dict)).toBeNull();
  });

  it('returns null when the dictionary allows more than one division', () => {
    const tiny: KanjiReadingDict = new Map([
      ['甲', ['あ', 'あい']],
      ['乙', ['いう', 'う']],
    ]);
    expect(splitReading('甲乙', 'あいう', tiny)).toBeNull();
  });
});

describe('isUsualReading', () => {
  it('accepts on, kun, rendaku and small-tsu forms', () => {
    expect(isUsualReading('車', 'しゃ', dict)).toBe(true);
    expect(isUsualReading('車', 'くるま', dict)).toBe(true);
    expect(isUsualReading('車', 'ぐるま', dict)).toBe(true);
    expect(isUsualReading('学', 'がっ', dict)).toBe(true);
  });

  it('accepts supplemental readings KANJIDIC leaves out', () => {
    expect(isUsualReading('日', 'に', dict)).toBe(true);
  });

  it('flags a reading the kanji does not have', () => {
    expect(isUsualReading('駐', 'ちゅ', dict)).toBe(false);
    expect(isUsualReading('車', 'しゃう', dict)).toBe(false);
    expect(isUsualReading('上', 'あげり', dict)).toBe(false);
  });

  it('has no opinion on unknown characters or empty readings', () => {
    expect(isUsualReading('々', 'びと', dict)).toBeNull();
    expect(isUsualReading('車', '', dict)).toBeNull();
  });
});
