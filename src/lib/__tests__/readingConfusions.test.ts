import { describe, expect, it } from 'vitest';

import { MONTH_WORDS, WEEKDAY_WORDS } from '@/lib/calendarWords';
import { readingChoices, readingDistractors, splitReading } from '@/lib/readingConfusions';

const SEEDS = [1, 7, 42, 1234, 987654];

describe('splitReading', () => {
  it('sets the fixed ending of a month or weekday aside', () => {
    expect(splitReading('しがつ')).toEqual({ stem: 'し', suffix: 'がつ' });
    expect(splitReading('げつようび')).toEqual({ stem: 'げつ', suffix: 'ようび' });
  });

  it('leaves other words whole, including one that is only the ending', () => {
    expect(splitReading('がっこう')).toEqual({ stem: 'がっこう', suffix: '' });
    expect(splitReading('がつ')).toEqual({ stem: 'がつ', suffix: '' });
  });
});

describe('readingDistractors', () => {
  it('never offers the right answer or a repeat', () => {
    for (const seed of SEEDS) {
      for (const { word, reading } of [...MONTH_WORDS, ...WEEKDAY_WORDS]) {
        const wrong = readingDistractors(word, reading, seed);
        expect(wrong).toHaveLength(2);
        expect(wrong).not.toContain(reading);
        expect(new Set(wrong).size).toBe(2);
      }
    }
  });

  it('only changes the part before a fixed ending', () => {
    for (const seed of SEEDS) {
      for (const wrong of readingDistractors('月曜日', 'げつようび', seed)) {
        expect(wrong.endsWith('ようび')).toBe(true);
      }
    }
  });

  it('leads with another reading of the number where the test does', () => {
    const offered = (word: string, reading: string) =>
      new Set(SEEDS.flatMap((seed) => readingDistractors(word, reading, seed)));
    expect([...offered('四月', 'しがつ')].some((r) => r === 'よんがつ' || r === 'よがつ')).toBe(
      true,
    );
    expect([...offered('七月', 'しちがつ')].some((r) => r === 'なながつ' || r === 'ながつ')).toBe(
      true,
    );
    expect(offered('九月', 'くがつ')).toContain('きゅうがつ');
  });

  it('covers the small っ, long vowel and voicing traps', () => {
    const all = (word: string, reading: string) =>
      new Set(SEEDS.flatMap((seed) => readingDistractors(word, reading, seed, 8)));
    expect(all('月曜日', 'げつようび')).toContain('げっようび');
    expect(all('月曜日', 'げつようび')).toContain('けつようび');
    expect(all('土曜日', 'どようび')).toContain('どうようび');
    expect(all('土曜日', 'どようび')).toContain('とようび');
    expect(all('10月', 'じゅうがつ')).toContain('じゅがつ');
    expect(all('学校', 'がっこう')).toContain('がっこ');
  });

  it('never calls the other reading of a bare number wrong', () => {
    for (const seed of SEEDS) {
      expect(readingDistractors('七', 'なな', seed, 8)).not.toContain('しち');
      expect(readingDistractors('四', 'よん', seed, 8)).not.toContain('し');
      expect(readingDistractors('九', 'きゅう', seed, 8)).not.toContain('く');
      expect(readingDistractors('十', 'じゅう', seed, 8)).not.toContain('とお');
    }
  });

  it('offers a look-alike for the last kana and a question for a one-kana word', () => {
    const all = new Set(SEEDS.flatMap((seed) => readingDistractors('目', 'め', seed, 8)));
    expect(all).toContain('ぬ');
    expect(readingDistractors('目', 'め', 1)).toHaveLength(2);
  });

  it('never puts a small っ in front of a small ゃゅょ', () => {
    for (const seed of SEEDS) {
      for (const wrong of readingDistractors('東京', 'とうきょう', seed, 12)) {
        expect(wrong).not.toMatch(/っ[ゃゅょ]/);
      }
    }
  });

  it('gives a different second option on another seed', () => {
    const seen = new Set(SEEDS.map((seed) => readingDistractors('3月', 'さんがつ', seed).join()));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('returns nothing for a reading it cannot alter', () => {
    expect(readingDistractors('コーヒー', 'コーヒー', 1)).toEqual([]);
  });
});

describe('readingChoices', () => {
  it('returns three stems with the right one among them', () => {
    const choices = readingChoices('火曜日', 'かようび', 3)!;
    expect(choices.options).toHaveLength(3);
    expect(choices.options).toContain('か');
    expect(choices.answer).toBe('か');
    expect(choices.suffix).toBe('ようび');
  });

  it('is repeatable for one seed, so a printed answer key matches', () => {
    expect(readingChoices('8月', 'はちがつ', 99)).toEqual(readingChoices('8月', 'はちがつ', 99));
  });

  it('is null when two wrong answers cannot be made', () => {
    expect(readingChoices('ア', 'ア', 1)).toBeNull();
  });
});
