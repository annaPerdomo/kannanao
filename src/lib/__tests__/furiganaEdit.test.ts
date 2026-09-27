import { describe, expect, it } from 'vitest';

import { parseFurigana } from '@/lib/furigana';
import {
  dictionarySplit,
  isKana,
  joinGroups,
  readingCutOptions,
  reflowReadings,
  segmentsFromMarkup,
  segmentsToMarkup,
  splitAllByKanji,
  splitGroup,
  splitKanjiRuns,
  withReading,
} from '@/lib/furiganaEdit';

describe('splitKanjiRuns', () => {
  it('splits plain text into kanji runs with empty readings', () => {
    expect(splitKanjiRuns('私は日本語を話す')).toEqual([
      { kanji: '私', reading: '' },
      'は',
      { kanji: '日本語', reading: '' },
      'を',
      { kanji: '話', reading: '' },
      'す',
    ]);
  });
});

describe('segmentsToMarkup', () => {
  it('round-trips parseFurigana', () => {
    const s = '{私|わたし}は{日本語|にほんご}を{話|はな}す';
    expect(segmentsToMarkup(parseFurigana(s))).toBe(s);
  });

  it('drops braces for empty readings', () => {
    expect(segmentsToMarkup([{ kanji: '私', reading: '' }, 'は'])).toBe('私は');
  });
});

describe('reflowReadings', () => {
  it('keeps a reading when the run is unchanged', () => {
    const prior = parseFurigana('{私|わたし}は');
    expect(reflowReadings('私は', prior)).toEqual([{ kanji: '私', reading: 'わたし' }, 'は']);
  });

  it('drops a reading when the kanji changed', () => {
    const prior = parseFurigana('{私|わたし}は');
    expect(reflowReadings('僕は', prior)).toEqual([{ kanji: '僕', reading: '' }, 'は']);
  });

  it('preserves a split when consecutive prior groups exactly cover the run', () => {
    const prior = parseFurigana('{日本|にほん}{語|ご}');
    expect(reflowReadings('日本語', prior)).toEqual([
      { kanji: '日本', reading: 'にほん' },
      { kanji: '語', reading: 'ご' },
    ]);
  });

  it('keeps one group of a split when the run shrinks to just that group', () => {
    const prior = parseFurigana('{日本|にほん}{語|ご}');
    expect(reflowReadings('日本', prior)).toEqual([{ kanji: '日本', reading: 'にほん' }]);
  });

  it('uses each prior group once', () => {
    const prior = parseFurigana('{人|ひと}');
    expect(reflowReadings('人と人', prior)).toEqual([
      { kanji: '人', reading: 'ひと' },
      'と',
      { kanji: '人', reading: '' },
    ]);
  });
});

describe('withReading', () => {
  it('replaces only the i-th group without mutating the input', () => {
    const segments = parseFurigana('{私|わたし}は{話|はな}す');
    const result = withReading(segments, 1, 'はなす');
    expect(result).toEqual(parseFurigana('{私|わたし}は{話|はなす}す'));
    expect(segments).toEqual(parseFurigana('{私|わたし}は{話|はな}す'));
  });
});

describe('isKana', () => {
  it.each([
    ['', true],
    ['にほんご', true],
    ['ニホンゴー', true],
    ['nihongo', false],
    ['日本', false],
  ])('%s -> %s', (text, expected) => {
    expect(isKana(text)).toBe(expected);
  });
});

const DICT = new Map([
  ['駐', ['ちゅう']],
  ['車', ['しゃ', 'くるま']],
  ['今', ['こん', 'いま']],
  ['日', ['にち', 'ひ']],
]);

describe('segmentsFromMarkup', () => {
  it('keeps stored per-kanji groups apart and turns bare kanji into empty groups', () => {
    expect(segmentsFromMarkup('{駐|ちゅう}{車|しゃ}は禁止')).toEqual([
      { kanji: '駐', reading: 'ちゅう' },
      { kanji: '車', reading: 'しゃ' },
      'は',
      { kanji: '禁止', reading: '' },
    ]);
  });

  it('keeps a cleared neighbour as its own group', () => {
    expect(segmentsFromMarkup('駐{車|しゃ}')).toEqual([
      { kanji: '駐', reading: '' },
      { kanji: '車', reading: 'しゃ' },
    ]);
  });
});

describe('joinGroups / splitGroup', () => {
  const split = segmentsFromMarkup('{駐|ちゅう}{車|しゃ}です');

  it('joins a group with the next one, concatenating readings', () => {
    expect(joinGroups(split, 0)).toEqual([{ kanji: '駐車', reading: 'ちゅうしゃ' }, 'です']);
  });

  it('splits a group before a character with the given readings', () => {
    const joined = joinGroups(split, 0);
    expect(splitGroup(joined, 0, 1, ['ちゅう', 'しゃ'])).toEqual(split);
  });

  it('join then split round-trips through markup', () => {
    const markup = segmentsToMarkup(splitGroup(joinGroups(split, 0), 0, 1, ['ちゅう', 'しゃ']));
    expect(markup).toBe('{駐|ちゅう}{車|しゃ}です');
  });
});

describe('dictionarySplit / splitAllByKanji', () => {
  it('divides a group at a character when the dictionary knows the kanji', () => {
    expect(dictionarySplit({ kanji: '駐車', reading: 'ちゅうしゃ' }, 1, DICT)).toEqual([
      'ちゅう',
      'しゃ',
    ]);
    expect(dictionarySplit({ kanji: '今日', reading: 'きょう' }, 1, DICT)).toBeNull();
  });

  it('splits every divisible group and leaves jukujikun whole', () => {
    const segments = segmentsFromMarkup('{今日|きょう}は{駐車|ちゅうしゃ}');
    expect(segmentsToMarkup(splitAllByKanji(segments, DICT))).toBe(
      '{今日|きょう}は{駐|ちゅう}{車|しゃ}',
    );
  });
});

describe('readingCutOptions', () => {
  it('skips cuts that would start a reading with a small kana or ん', () => {
    expect(readingCutOptions('ちゅうしゃ')).toEqual([
      ['ちゅ', 'うしゃ'],
      ['ちゅう', 'しゃ'],
    ]);
    expect(readingCutOptions('きんし')).toEqual([['きん', 'し']]);
  });
});
