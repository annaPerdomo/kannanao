import { describe, expect, it } from 'vitest';

import {
  awardLine,
  blendHomePhrases,
  buddyFacts,
  memoryTeaser,
  memoryTitle,
  storyLines,
  unlockedStories,
} from '@/lib/buddyPhrases';

const COPY = {
  l2: {
    title: 'two title',
    teaser: 'two teaser',
    story: ['two a', 'two b'],
    phrases: ['level two line'],
  },
  l3: { story: ['three a'], phrases: ['level three line'] },
  l4: { story: ['four a'], phrases: ['level four line'] },
  l5: { story: ['five a'], phrases: ['level five line'] },
  facts: ['fact one', 'fact two'],
  awards: { adventure: 'adventure line', session: 'session line', pet: 'pet line' },
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

describe('memoryTitle / memoryTeaser', () => {
  it('reads the authored title and teaser for a level', () => {
    expect(memoryTitle(COPY, 2)).toBe('two title');
    expect(memoryTeaser(COPY, 2)).toBe('two teaser');
  });

  it('is null for a level whose copy has a story but no title yet', () => {
    expect(memoryTitle(COPY, 3)).toBeNull();
    expect(memoryTeaser(COPY, 3)).toBeNull();
  });

  it('is null for a buddy with no friendship copy at all', () => {
    expect(memoryTitle(undefined, 2)).toBeNull();
    expect(memoryTitle(null, 2)).toBeNull();
    expect(memoryTeaser('not an object', 2)).toBeNull();
  });

  it('rejects blank and non-string values instead of rendering them', () => {
    const malformed = { l2: { title: '   ', teaser: 42 }, l3: 'not an object' };
    expect(memoryTitle(malformed, 2)).toBeNull();
    expect(memoryTeaser(malformed, 2)).toBeNull();
    expect(memoryTitle(malformed, 3)).toBeNull();
  });
});

describe('buddyFacts', () => {
  it('lists the authored facts in order', () => {
    expect(buddyFacts(COPY)).toEqual(['fact one', 'fact two']);
  });

  it('is empty when facts are missing or garbage', () => {
    expect(buddyFacts({ l2: { story: ['told'] } })).toEqual([]);
    expect(buddyFacts({ facts: 'a single string' })).toEqual([]);
    expect(buddyFacts(undefined)).toEqual([]);
    expect(buddyFacts('not an object')).toEqual([]);
  });

  it('holds an unauthored slot in place so later facts keep their milestone', () => {
    expect(buddyFacts({ facts: [42, null, '  ', 'kept'] })).toEqual(['', '', '', 'kept']);
    expect(buddyFacts({ facts: ['first', '', 'third'] })).toEqual(['first', '', 'third']);
  });

  it('drops trailing blanks so length still means "how many were written"', () => {
    expect(buddyFacts({ facts: ['first', '', '', ''] })).toEqual(['first']);
    expect(buddyFacts({ facts: ['', ''] })).toEqual([]);
  });
});

describe('awardLine', () => {
  it('reads the line for each source', () => {
    expect(awardLine(COPY, 'adventure')).toBe('adventure line');
    expect(awardLine(COPY, 'session')).toBe('session line');
    expect(awardLine(COPY, 'pet')).toBe('pet line');
  });

  it('is null when awards are missing or half-authored', () => {
    expect(awardLine({ awards: { adventure: 'only this one' } }, 'pet')).toBeNull();
    expect(awardLine({ awards: { pet: '  ' } }, 'pet')).toBeNull();
    expect(awardLine({ awards: 'not an object' }, 'pet')).toBeNull();
    expect(awardLine({ l2: { story: ['told'] } }, 'adventure')).toBeNull();
    expect(awardLine(null, 'adventure')).toBeNull();
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
