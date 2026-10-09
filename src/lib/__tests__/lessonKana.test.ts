import { describe, expect, it } from 'vitest';

import { kanaSetLabel, LESSON_KANA_MAX, sortKanaSets, suggestKanaSets } from '../lessonKana';

describe('suggestKanaSets', () => {
  it('orders suggestions by curriculum order when all rows are equally frequent', () => {
    const cards = [{ reading: 'さかな' }];
    expect(suggestKanaSets(cards)).toEqual(['hira-ka', 'hira-sa', 'hira-na']);
  });

  it('ranks a row higher the more its characters appear', () => {
    const cards = [{ reading: 'あい' }, { reading: 'あお' }, { reading: 'かき' }];
    const result = suggestKanaSets(cards);
    expect(result[0]).toBe('hira-a');
    expect(result).toContain('hira-ka');
  });

  it('drops excluded rows', () => {
    const cards = [{ reading: 'あかさ' }];
    expect(suggestKanaSets(cards, ['hira-a'])).toEqual(['hira-ka', 'hira-sa']);
  });

  it('caps suggestions at 6 rows', () => {
    const cards = [{ reading: 'あかさたなはまやらわ' }];
    expect(suggestKanaSets(cards)).toHaveLength(6);
  });

  it('ignores null readings', () => {
    expect(suggestKanaSets([{ reading: null }, { reading: '' }])).toEqual([]);
  });

  it('ignores characters outside the curriculum, such as kanji', () => {
    expect(suggestKanaSets([{ reading: '食' }])).toEqual([]);
  });
});

describe('kanaSetLabel', () => {
  it('returns the curriculum label for a known set', () => {
    expect(kanaSetLabel('hira-a')).toBe('あ');
  });

  it('falls back to the id for an unknown set', () => {
    expect(kanaSetLabel('not-a-set')).toBe('not-a-set');
  });
});

describe('sortKanaSets', () => {
  it('sorts by curriculum order and dedupes', () => {
    expect(sortKanaSets(['hira-ka', 'hira-a', 'hira-ka'])).toEqual(['hira-a', 'hira-ka']);
  });
});

describe('LESSON_KANA_MAX', () => {
  it('is 8', () => {
    expect(LESSON_KANA_MAX).toBe(8);
  });
});
