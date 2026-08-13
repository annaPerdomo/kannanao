import { describe, expect, it } from 'vitest';

import {
  canEarn,
  clampPoints,
  friendshipLevel,
  friendshipProgress,
  type FriendshipSource,
  heartsEarnedToday,
  isMeaningfulSession,
  LEVEL_THRESHOLDS,
  MAX_FRIENDSHIP_LEVEL,
  reachableToday,
  todayOpportunities,
} from '@/lib/friendship';

const TODAY = '2026-08-09';
const YESTERDAY = '2026-08-08';

describe('clampPoints', () => {
  it('passes real point totals through untouched', () => {
    expect(clampPoints(0)).toBe(0);
    expect(clampPoints(37)).toBe(37);
  });

  it('reads anything a corrupt row could hold as zero', () => {
    expect(clampPoints(-1)).toBe(0);
    expect(clampPoints(NaN)).toBe(0);
    expect(clampPoints(-Infinity)).toBe(0);
    expect(clampPoints(Infinity)).toBe(0);
  });
});

describe('friendshipLevel', () => {
  it('maps each exact threshold boundary to the right level', () => {
    expect(friendshipLevel(0)).toBe(1);
    expect(friendshipLevel(14)).toBe(1);
    expect(friendshipLevel(15)).toBe(2);
    expect(friendshipLevel(39)).toBe(2);
    expect(friendshipLevel(40)).toBe(3);
    expect(friendshipLevel(79)).toBe(3);
    expect(friendshipLevel(80)).toBe(4);
    expect(friendshipLevel(139)).toBe(4);
    expect(friendshipLevel(140)).toBe(5);
  });

  it('stays at max level beyond the last threshold', () => {
    expect(friendshipLevel(141)).toBe(MAX_FRIENDSHIP_LEVEL);
    expect(friendshipLevel(10_000)).toBe(MAX_FRIENDSHIP_LEVEL);
  });

  it('clamps negative and garbage points to level 1', () => {
    expect(friendshipLevel(-1)).toBe(1);
    expect(friendshipLevel(-500)).toBe(1);
    expect(friendshipLevel(NaN)).toBe(1);
    expect(friendshipLevel(-Infinity)).toBe(1);
  });
});

describe('friendshipProgress', () => {
  it('starts each level at 0 hearts into the full level width', () => {
    expect(friendshipProgress(0)).toEqual({ current: 0, needed: 15 });
    expect(friendshipProgress(15)).toEqual({ current: 0, needed: 25 });
    expect(friendshipProgress(40)).toEqual({ current: 0, needed: 40 });
    expect(friendshipProgress(80)).toEqual({ current: 0, needed: 60 });
  });

  it('reports hearts into the current level mid-way', () => {
    expect(friendshipProgress(7)).toEqual({ current: 7, needed: 15 });
    expect(friendshipProgress(30)).toEqual({ current: 15, needed: 25 });
    expect(friendshipProgress(100)).toEqual({ current: 20, needed: 60 });
  });

  it('is null at max level', () => {
    expect(friendshipProgress(140)).toBeNull();
    expect(friendshipProgress(999)).toBeNull();
  });

  it('treats garbage points as 0', () => {
    expect(friendshipProgress(-5)).toEqual({ current: 0, needed: 15 });
    expect(friendshipProgress(NaN)).toEqual({ current: 0, needed: 15 });
  });
});

describe('canEarn', () => {
  const sources: FriendshipSource[] = ['adventure', 'session', 'pet'];

  it.each(sources)('%s can earn when its stamp is unset', (source) => {
    expect(canEarn(source, {}, TODAY)).toBe(true);
    expect(canEarn(source, { [source]: null }, TODAY)).toBe(true);
  });

  it.each(sources)('%s can earn when its stamp is yesterday', (source) => {
    expect(canEarn(source, { [source]: YESTERDAY }, TODAY)).toBe(true);
  });

  it.each(sources)('%s cannot earn twice on the same day', (source) => {
    expect(canEarn(source, { [source]: TODAY }, TODAY)).toBe(false);
  });

  it('caps each source independently', () => {
    const stamps = { adventure: TODAY, session: YESTERDAY, pet: null };
    expect(canEarn('adventure', stamps, TODAY)).toBe(false);
    expect(canEarn('session', stamps, TODAY)).toBe(true);
    expect(canEarn('pet', stamps, TODAY)).toBe(true);
  });
});

describe('todayOpportunities', () => {
  it('always lists all three sources with adventure first', () => {
    expect(todayOpportunities({}, TODAY)).toEqual([
      { source: 'adventure', points: 3, done: false },
      { source: 'session', points: 1, done: false },
      { source: 'pet', points: 1, done: false },
    ]);
  });

  it('still lists a source that is already done today', () => {
    const done = todayOpportunities({ adventure: TODAY, session: TODAY, pet: TODAY }, TODAY);
    expect(done.map((o) => o.source)).toEqual(['adventure', 'session', 'pet']);
    expect(done.every((o) => o.done)).toBe(true);
  });

  it('marks only the sources paid out today', () => {
    const partial = todayOpportunities({ adventure: TODAY, session: YESTERDAY, pet: null }, TODAY);
    expect(partial.map((o) => o.done)).toEqual([true, false, false]);
  });

  it('treats yesterday stamps as a fresh day', () => {
    const stale = { adventure: YESTERDAY, session: YESTERDAY, pet: YESTERDAY };
    expect(todayOpportunities(stale, TODAY).some((o) => o.done)).toBe(false);
  });
});

describe('heartsEarnedToday', () => {
  it('is 0 before anything is earned', () => {
    expect(heartsEarnedToday({}, TODAY)).toBe(0);
    expect(heartsEarnedToday({ adventure: YESTERDAY, session: null }, TODAY)).toBe(0);
  });

  it('weights each source by its payout', () => {
    expect(heartsEarnedToday({ adventure: TODAY }, TODAY)).toBe(3);
    expect(heartsEarnedToday({ session: TODAY }, TODAY)).toBe(1);
    expect(heartsEarnedToday({ session: TODAY, pet: TODAY }, TODAY)).toBe(2);
  });

  it('tops out at the daily cap of 5', () => {
    expect(heartsEarnedToday({ adventure: TODAY, session: TODAY, pet: TODAY }, TODAY)).toBe(5);
  });
});

describe('reachableToday', () => {
  it('accepts anything within the full 5 hearts on an untouched day', () => {
    expect(reachableToday(5, {}, TODAY)).toBe(true);
    expect(reachableToday(6, {}, TODAY)).toBe(false);
  });

  it('shrinks as sources are spent', () => {
    const afterAdventure = { adventure: TODAY };
    expect(reachableToday(2, afterAdventure, TODAY)).toBe(true);
    expect(reachableToday(3, afterAdventure, TODAY)).toBe(false);
  });

  it('is false for any gap once the day is fully earned', () => {
    const spent = { adventure: TODAY, session: TODAY, pet: TODAY };
    expect(reachableToday(1, spent, TODAY)).toBe(false);
    expect(reachableToday(0, spent, TODAY)).toBe(true);
  });

  it('ignores stamps from yesterday', () => {
    expect(reachableToday(5, { adventure: YESTERDAY, session: YESTERDAY }, TODAY)).toBe(true);
  });
});

describe('isMeaningfulSession', () => {
  it('needs at least 5 cards studied', () => {
    expect(isMeaningfulSession(4)).toBe(false);
    expect(isMeaningfulSession(5)).toBe(true);
    expect(isMeaningfulSession(6)).toBe(true);
  });
});

describe('LEVEL_THRESHOLDS', () => {
  it('has one threshold per level and is strictly increasing from 0', () => {
    expect(LEVEL_THRESHOLDS).toHaveLength(MAX_FRIENDSHIP_LEVEL);
    expect(LEVEL_THRESHOLDS[0]).toBe(0);
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i]).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1]);
    }
  });
});
