import { describe, expect, it } from 'vitest';

import { getSet, kanaBefore } from '@/lib/kanaCurriculum';

import {
  buildDrillPool,
  buildKanaChoices,
  buildRomajiChoices,
  CHOICE_COUNT,
  drillOrder,
  pickDecoys,
  romajiOf,
} from '../kanaDrill';

const HIRA_A = ['あ', 'い', 'う', 'え', 'お'];

describe('romajiOf', () => {
  it('should read a character from the curriculum', () => {
    expect(romajiOf('し')).toBe('shi');
    expect(romajiOf('きゃ')).toBe('kya');
  });

  it('should fall back to the input for something not in the curriculum', () => {
    expect(romajiOf('漢')).toBe('漢');
  });
});

describe('buildDrillPool', () => {
  it('should draw on the set itself plus everything unlocked before it', () => {
    const pool = buildDrillPool('hira-na');
    expect(pool).toEqual(expect.arrayContaining(getSet('hira-na')!.entries.map((e) => e.kana)));
    expect(pool).toEqual(expect.arrayContaining(kanaBefore('hira-na')));
    expect(pool).not.toContain('ま');
  });

  it('should top up from the rest of the track when the learner has almost nothing unlocked', () => {
    const pool = buildDrillPool('hira-a', ['あ', 'い']);
    expect(pool.length).toBeGreaterThanOrEqual(CHOICE_COUNT);
    expect(pool.slice(0, 2)).toEqual(['あ', 'い']);
    expect(new Set(pool).size).toBe(pool.length);
  });

  it('should keep a big enough unlocked pool exactly as given', () => {
    const unlocked = [...HIRA_A, 'か'];
    expect(buildDrillPool('hira-a', unlocked)).toEqual(unlocked);
  });

  it('should stay with the unlocked list for an unknown set', () => {
    expect(buildDrillPool('nope', ['あ'])).toEqual(['あ']);
    expect(buildDrillPool('nope')).toEqual([]);
  });
});

describe('pickDecoys', () => {
  it('should return the requested number of decoys, never the target', () => {
    const decoys = pickDecoys('あ', buildDrillPool('hira-a'));
    expect(decoys).toHaveLength(CHOICE_COUNT - 1);
    expect(decoys).not.toContain('あ');
  });

  it('should prefer unlocked look-alikes — telling those apart is the skill', () => {
    const pool = ['ね', 'れ', 'わ', 'あ', 'い', 'う', 'え', 'お', 'か', 'き'];
    for (let i = 0; i < 20; i++) {
      const decoys = pickDecoys('ね', pool);
      expect(decoys.slice(0, 2).sort()).toEqual(['れ', 'わ']);
    }
  });

  it('should skip look-alikes the learner has not unlocked yet', () => {
    const pool = ['ね', 'あ', 'い', 'う', 'え'];
    const decoys = pickDecoys('ね', pool);
    expect(decoys).not.toContain('れ');
    expect(decoys).toHaveLength(3);
  });

  it('should never offer two characters with the same sound', () => {
    // じ and ぢ both read "ji": one of them would silently be a second right answer.
    const pool = ['じ', 'ぢ', 'ず', 'づ', 'か', 'き', 'く'];
    for (let i = 0; i < 20; i++) {
      const decoys = pickDecoys('じ', pool);
      const sounds = decoys.map(romajiOf);
      expect(sounds).not.toContain('ji');
      expect(new Set(sounds).size).toBe(sounds.length);
    }
  });

  it('should return what it can when the pool is smaller than the ask', () => {
    expect(pickDecoys('あ', ['あ', 'い'])).toEqual(['い']);
    expect(pickDecoys('あ', [])).toEqual([]);
  });

  it('should honour a custom decoy count', () => {
    expect(pickDecoys('あ', buildDrillPool('hira-ka'), 1)).toHaveLength(1);
  });
});

describe('buildRomajiChoices', () => {
  it('should offer four sounds with exactly one right answer', () => {
    const choices = buildRomajiChoices('か', buildDrillPool('hira-ka'));
    expect(choices).toHaveLength(CHOICE_COUNT);
    expect(choices.filter((c) => c.correct)).toHaveLength(1);
    expect(choices.find((c) => c.correct)!.text).toBe('ka');
  });

  it('should never repeat a sound among the options', () => {
    for (const kana of ['じ', 'ず', 'ぢ', 'づ']) {
      const texts = buildRomajiChoices(kana, buildDrillPool('hira-da')).map((c) => c.text);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });
});

describe('buildKanaChoices', () => {
  it('should offer four characters with exactly one right answer', () => {
    const choices = buildKanaChoices('き', buildDrillPool('hira-ka'));
    expect(choices).toHaveLength(CHOICE_COUNT);
    expect(choices.filter((c) => c.correct)).toHaveLength(1);
    expect(choices.find((c) => c.correct)!.text).toBe('き');
  });

  it('should draw tiles only from the unlocked pool', () => {
    const unlocked = [...HIRA_A, 'か', 'き', 'く'];
    const texts = buildKanaChoices('あ', unlocked).map((c) => c.text);
    for (const text of texts) expect(unlocked).toContain(text);
  });
});

describe('drillOrder', () => {
  it('should ask every character once by default', () => {
    expect(drillOrder(HIRA_A).sort()).toEqual([...HIRA_A].sort());
  });

  it('should repeat the whole set for a multi-round stream', () => {
    const order = drillOrder(HIRA_A, 3);
    expect(order).toHaveLength(15);
    for (const kana of HIRA_A) {
      expect(order.filter((k) => k === kana)).toHaveLength(3);
    }
  });

  it('should cope with an empty set', () => {
    expect(drillOrder([], 3)).toEqual([]);
  });
});
