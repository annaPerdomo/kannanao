import { describe, expect, it } from 'vitest';

import { getKanaEntry, isComboKana, isContextualKana, segmentReading } from '@/lib/kanaCurriculum';
import { isPureKana } from '@/lib/reviewGames';

import { pairsFor, WORD_PAIR_ROUND, WORD_PAIRS } from '../wordPairs';

describe('WORD_PAIRS', () => {
  it('should exercise only characters the chart actually has', () => {
    for (const pair of WORD_PAIRS) {
      expect(pair.chars.length).toBeGreaterThan(0);
      for (const kana of pair.chars) expect(getKanaEntry(kana)).toBeDefined();
    }
  });

  it('should be written in kana, so the spelling is what TTS speaks', () => {
    for (const pair of WORD_PAIRS) {
      expect(isPureKana(pair.word)).toBe(true);
      expect(isPureKana(pair.decoy)).toBe(true);
    }
  });

  it('should never offer the same spelling twice', () => {
    for (const pair of WORD_PAIRS) expect(pair.word).not.toBe(pair.decoy);
    expect(new Set(WORD_PAIRS.map((p) => p.word)).size).toBe(WORD_PAIRS.length);
  });

  it('should only exercise characters the decoy actually disagrees on', () => {
    const occurrences = (reading: string, kana: string) =>
      segmentReading(reading).filter((k) => k === kana).length;
    for (const pair of WORD_PAIRS) {
      for (const kana of pair.chars) {
        expect(occurrences(pair.word, kana)).toBeGreaterThan(occurrences(pair.decoy, kana));
      }
    }
  });

  it('should cover the small tsu, the long line and the two-part sounds', () => {
    const exercised = new Set(WORD_PAIRS.flatMap((p) => p.chars));
    expect(exercised).toContain('っ');
    expect(exercised).toContain('ッ');
    expect(exercised).toContain('ー');
    expect([...exercised].filter(isComboKana).length).toBeGreaterThanOrEqual(8);
  });

  it('should reach every contextual character, which has no other drill', () => {
    const exercised = new Set(WORD_PAIRS.flatMap((p) => p.chars));
    for (const kana of ['っ', 'ッ', 'ー']) {
      expect(pairsFor([kana]).length).toBeGreaterThan(0);
      expect(exercised.has(kana)).toBe(true);
    }
  });
});

describe('pairsFor', () => {
  it('should pick only pairs that exercise what the queue asked for', () => {
    for (const pair of pairsFor(['ー'])) expect(pair.chars).toContain('ー');
  });

  it('should hand back one round at a time, not the whole list', () => {
    expect(pairsFor(['っ']).length).toBeLessThanOrEqual(WORD_PAIR_ROUND);
    expect(pairsFor(['っ'], 2)).toHaveLength(2);
  });

  it('should say plainly that it has nothing for a character with no pair', () => {
    expect(pairsFor(['あ'.repeat(3)])).toEqual([]);
    expect(pairsFor([])).toEqual([]);
  });

  it('should only ever be asked about contextual or two-part characters', () => {
    const drillable = WORD_PAIRS.flatMap((p) => p.chars).filter(
      (kana) => !isContextualKana(kana) && !isComboKana(kana),
    );
    expect(drillable).toEqual([]);
  });
});
