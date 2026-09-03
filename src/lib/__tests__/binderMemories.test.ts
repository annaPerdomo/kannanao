import { describe, expect, it } from 'vitest';

import { buildMemoryCards, memoryBuddyKeys } from '@/lib/binderMemories';

const copy = {
  l2: { title: 'The Bento Box', teaser: 'Something smelled great.', story: ['Line one.'] },
  l3: {
    title: 'Rainy Day',
    story: ['Drip.', 'Drop.'],
    word: { jp: '雨', reading: 'あめ', en: 'rain' },
  },
  l4: { story: [] },
  l5: { title: 'The Long Walk', story: ['We walked.'] },
};

describe('memoryBuddyKeys', () => {
  it('puts the equipped buddy first and then every buddy with hearts, most first', () => {
    const keys = memoryBuddyKeys('buddy_tango', {
      buddy_fox: { points: 3 },
      buddy_tango: { points: 1 },
      buddy_bunny: { points: 20 },
      buddy_panda: { points: 0 },
    });
    expect(keys).toEqual(['buddy_tango', 'buddy_bunny', 'buddy_fox']);
  });

  it('keeps an equipped buddy with no row', () => {
    expect(memoryBuddyKeys('buddy_tango', {})).toEqual(['buddy_tango']);
  });
});

describe('buildMemoryCards', () => {
  it('makes one card per authored level and skips a level with nothing written', () => {
    const cards = buildMemoryCards(
      ['buddy_tango'],
      () => 0,
      () => copy,
    );
    expect(cards.map((c) => c.level)).toEqual([2, 3, 5]);
    expect(cards[0]).toMatchObject({
      buddyKey: 'buddy_tango',
      title: 'The Bento Box',
      teaser: 'Something smelled great.',
      lines: ['Line one.'],
      unlocked: false,
      heartsAway: 15,
      word: null,
    });
    expect(cards[1].word).toEqual({ jp: '雨', reading: 'あめ', en: 'rain' });
  });

  it('unlocks the levels the hearts have reached and counts the rest down', () => {
    const cards = buildMemoryCards(
      ['buddy_tango'],
      () => 42,
      () => copy,
    );
    expect(cards.map((c) => c.unlocked)).toEqual([true, true, false]);
    expect(cards.map((c) => c.heartsAway)).toEqual([0, 0, 98]);
  });

  it('tolerates garbage copy and negative points', () => {
    expect(
      buildMemoryCards(
        ['x'],
        () => -5,
        () => 'nope',
      ),
    ).toEqual([]);
    expect(
      buildMemoryCards(
        ['x'],
        () => -5,
        () => ({ l2: { story: ['ok'] } }),
      ),
    ).toMatchObject([{ level: 2, unlocked: false, heartsAway: 15, title: null }]);
  });

  it('lists each buddy once', () => {
    const cards = buildMemoryCards(
      ['a', 'a'],
      () => 0,
      () => copy,
    );
    expect(cards).toHaveLength(3);
  });
});
