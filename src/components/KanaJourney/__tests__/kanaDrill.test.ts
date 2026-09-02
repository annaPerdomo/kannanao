import { describe, expect, it } from 'vitest';

import { allKana, isContextualKana } from '@/lib/kanaCurriculum';

import {
  buildDrillPool,
  buildKanaChoices,
  buildRomajiChoices,
  CHOICE_COUNT,
  drillOrder,
  FOCUS_SIZE,
  focusDrillChars,
  pickDecoys,
  romajiOf,
} from '../kanaDrill';

const HIRA_A = ['あ', 'い', 'う', 'え', 'お'];

describe('focusDrillChars', () => {
  it('should put the tapped character first, then its look-alikes, then its row', () => {
    expect(focusDrillChars('ぬ')).toEqual(['ぬ', 'め', 'な', 'に', 'ね']);
  });

  it('should fill a session from the row, so a short row still gives its whole row', () => {
    for (const kana of ['あ', 'ソ']) expect(focusDrillChars(kana)).toHaveLength(FOCUS_SIZE);
    expect(focusDrillChars('ん')).toEqual(['ん', 'わ', 'を']);
    expect(focusDrillChars('きゅ')).toEqual(['きゅ', 'きゃ', 'きょ']);
  });

  it('should return nothing for a character outside the curriculum', () => {
    expect(focusDrillChars('漢')).toEqual([]);
  });
});

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
  it('should draw on the whole track when no pool is given', () => {
    const pool = buildDrillPool(['な', 'に']);
    expect(pool).toEqual(allKana('hiragana').filter((k) => !isContextualKana(k)));
  });

  it('should keep っ and ー out of every pool: they cannot label an option', () => {
    expect(buildDrillPool(['な']).some(isContextualKana)).toBe(false);
    expect(buildDrillPool(['ナ'], ['ッ', 'ー']).some(isContextualKana)).toBe(false);
    expect(buildDrillPool([]).some(isContextualKana)).toBe(false);
  });

  it('should span both scripts for a mixed queue', () => {
    const pool = buildDrillPool(['な', 'ニ']);
    expect(pool).toContain('な');
    expect(pool).toContain('ニ');
  });

  it('should top up a pool too small to fill four options', () => {
    const pool = buildDrillPool(['あ'], ['あ', 'い']);
    expect(pool.length).toBeGreaterThanOrEqual(CHOICE_COUNT);
    expect(pool.slice(0, 2)).toEqual(['あ', 'い']);
    expect(new Set(pool).size).toBe(pool.length);
  });

  it('should keep a big enough pool exactly as given', () => {
    const given = [...HIRA_A, 'か'];
    expect(buildDrillPool(['あ'], given)).toEqual(given);
  });

  it('should fall back to the whole chart for characters it does not know', () => {
    expect(buildDrillPool(['漢'])).toEqual(allKana().filter((k) => !isContextualKana(k)));
  });
});

describe('pickDecoys', () => {
  it('should return the requested number of decoys, never the target', () => {
    const decoys = pickDecoys('あ', buildDrillPool(HIRA_A));
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
    expect(pickDecoys('あ', buildDrillPool(['か', 'き', 'く', 'け', 'こ']), 1)).toHaveLength(1);
  });
});

describe('buildRomajiChoices', () => {
  it('should offer four sounds with exactly one right answer', () => {
    const choices = buildRomajiChoices('か', buildDrillPool(['か', 'き', 'く', 'け', 'こ']));
    expect(choices).toHaveLength(CHOICE_COUNT);
    expect(choices.filter((c) => c.correct)).toHaveLength(1);
    expect(choices.find((c) => c.correct)!.text).toBe('ka');
  });

  it('should never repeat a sound among the options', () => {
    for (const kana of ['じ', 'ず', 'ぢ', 'づ']) {
      const texts = buildRomajiChoices(kana, buildDrillPool(['だ', 'ぢ', 'づ', 'で', 'ど'])).map(
        (c) => c.text,
      );
      expect(new Set(texts).size).toBe(texts.length);
    }
  });
});

describe('buildKanaChoices', () => {
  it('should offer four characters with exactly one right answer', () => {
    const choices = buildKanaChoices('き', buildDrillPool(['か', 'き', 'く', 'け', 'こ']));
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
