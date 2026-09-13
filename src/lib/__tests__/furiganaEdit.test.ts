import { describe, expect, it } from 'vitest';

import { parseFurigana } from '@/lib/furigana';
import {
  isKana,
  reflowReadings,
  segmentsToMarkup,
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
