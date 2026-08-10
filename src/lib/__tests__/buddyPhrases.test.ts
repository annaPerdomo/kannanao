import { describe, expect, it } from 'vitest';

import { blendHomePhrases, storyLines, unlockedStories } from '@/lib/buddyPhrases';

const COPY = {
  l2: { story: ['two a', 'two b'], phrases: ['level two line'] },
  l3: { story: ['three a'], phrases: ['level three line'] },
  l4: { story: ['four a'], phrases: ['level four line'] },
  l5: { story: ['five a'], phrases: ['level five line'] },
};

const BASE = ['base one', 'base two'];

describe('blendHomePhrases', () => {
  it('returns the base pool at level 1, where nothing is unlocked yet', () => {
    expect(blendHomePhrases(BASE, COPY, 1)).toEqual(BASE);
  });

  it('adds every phrase up to the current level', () => {
    expect(blendHomePhrases(BASE, COPY, 3)).toEqual([
      ...BASE,
      'level two line',
      'level three line',
    ]);
  });

  it('adds all four unlocks at the top level', () => {
    expect(blendHomePhrases(BASE, COPY, 5)).toHaveLength(BASE.length + 4);
  });

  it('never reaches past the top level for copy that does not exist', () => {
    expect(blendHomePhrases(BASE, { ...COPY, l6: { phrases: ['nope'] } }, 9)).not.toContain('nope');
  });

  it('falls back to the base pool when the buddy has no friendship copy', () => {
    expect(blendHomePhrases(BASE, undefined, 5)).toEqual(BASE);
    expect(blendHomePhrases(BASE, null, 5)).toEqual(BASE);
    expect(blendHomePhrases(BASE, 'not an object', 5)).toEqual(BASE);
  });

  it('ignores malformed copy instead of rendering it', () => {
    const malformed = {
      l2: { phrases: 'a single string' },
      l3: { phrases: [42, null, 'kept'] },
      l4: 'not an object',
      l5: { phrases: ['   '] },
    };
    expect(blendHomePhrases(BASE, malformed, 5)).toEqual([...BASE, 'kept']);
  });

  it('drops duplicates so a repeated line does not come up twice as often', () => {
    const copy = { l2: { phrases: ['base one'] }, l3: { phrases: ['fresh', 'fresh'] } };
    expect(blendHomePhrases(BASE, copy, 3)).toEqual([...BASE, 'fresh']);
  });

  it('sanitises the base pool too', () => {
    expect(blendHomePhrases(['ok', '', ' '] as string[], COPY, 1)).toEqual(['ok']);
  });
});

describe('storyLines', () => {
  it('returns the story for the given level', () => {
    expect(storyLines(COPY, 2)).toEqual(['two a', 'two b']);
  });

  it('returns nothing for a level with no story written', () => {
    expect(storyLines(COPY, 1)).toEqual([]);
    expect(storyLines({ l2: { story: 'nope' } }, 2)).toEqual([]);
  });
});

describe('unlockedStories', () => {
  it('lists every story earned so far, oldest first', () => {
    expect(unlockedStories(COPY, 3)).toEqual([
      { level: 2, lines: ['two a', 'two b'] },
      { level: 3, lines: ['three a'] },
    ]);
  });

  it('has nothing to list at level 1', () => {
    expect(unlockedStories(COPY, 1)).toEqual([]);
  });

  it('skips levels the buddy has reached but has no copy for', () => {
    const partial = { l2: { story: ['told'] }, l4: { story: ['also told'] } };
    expect(unlockedStories(partial, 5).map((s) => s.level)).toEqual([2, 4]);
  });

  it('lists nothing for a buddy with no friendship copy at all', () => {
    expect(unlockedStories(null, 5)).toEqual([]);
  });
});
