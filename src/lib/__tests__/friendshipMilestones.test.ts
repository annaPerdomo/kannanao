import { describe, expect, it } from 'vitest';

import { LEVEL_THRESHOLDS } from '@/lib/friendship';
import {
  allMilestones,
  heartsToNext,
  MINOR_MILESTONES,
  nextMilestone,
  unlockedFactCount,
  unlockedFacts,
} from '@/lib/friendshipMilestones';

const MAX_POINTS = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

describe('allMilestones', () => {
  it('merges facts and levels into one ascending timeline', () => {
    const points = allMilestones().map((m) => m.atPoints);
    expect(points).toEqual([5, 10, 15, 25, 32, 40, 55, 68, 80, 100, 120, 140]);
  });

  it('tags every fact with its index into facts[] and every memory with its level', () => {
    const milestones = allMilestones();
    expect(milestones.filter((m) => m.kind === 'fact').map((m) => m.factIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(milestones.filter((m) => m.kind === 'memory')).toEqual([
      { atPoints: 15, kind: 'memory', level: 2 },
      { atPoints: 40, kind: 'memory', level: 3 },
      { atPoints: 80, kind: 'memory', level: 4 },
      { atPoints: 140, kind: 'memory', level: 5 },
    ]);
  });

  it('has one memory per level threshold past the starting level', () => {
    const memories = allMilestones().filter((m) => m.kind === 'memory');
    expect(memories.map((m) => m.atPoints)).toEqual(LEVEL_THRESHOLDS.slice(1));
  });

  it('has one fact per minor milestone and no duplicate thresholds', () => {
    const points = allMilestones().map((m) => m.atPoints);
    expect(new Set(points).size).toBe(points.length);
    expect(points).toHaveLength(MINOR_MILESTONES.length + LEVEL_THRESHOLDS.length - 1);
  });

  it('returns a fresh array each call so callers cannot mutate the timeline', () => {
    const first = allMilestones();
    first.pop();
    expect(allMilestones()).toHaveLength(12);
  });
});

describe('nextMilestone', () => {
  it('points at the first fact from a standing start', () => {
    expect(nextMilestone(0)).toEqual({ atPoints: 5, kind: 'fact', factIndex: 0 });
  });

  it('skips past a milestone the moment it is reached exactly', () => {
    expect(nextMilestone(5)?.atPoints).toBe(10);
    expect(nextMilestone(15)?.atPoints).toBe(25);
    expect(nextMilestone(14)?.atPoints).toBe(15);
  });

  it('returns the next level-up when it is the closest thing left', () => {
    expect(nextMilestone(120)).toEqual({ atPoints: 140, kind: 'memory', level: 5 });
  });

  it('is null at and past the final threshold', () => {
    expect(nextMilestone(MAX_POINTS)).toBeNull();
    expect(nextMilestone(141)).toBeNull();
    expect(nextMilestone(10_000)).toBeNull();
  });

  it('treats negative and garbage points as zero', () => {
    expect(nextMilestone(-40)?.atPoints).toBe(5);
    expect(nextMilestone(NaN)?.atPoints).toBe(5);
    expect(nextMilestone(-Infinity)?.atPoints).toBe(5);
  });
});

describe('heartsToNext', () => {
  it('counts the hearts still owed to the next unlock', () => {
    expect(heartsToNext(0)).toBe(5);
    expect(heartsToNext(4)).toBe(1);
    expect(heartsToNext(5)).toBe(5);
    expect(heartsToNext(139)).toBe(1);
  });

  it('is null once nothing is left to unlock', () => {
    expect(heartsToNext(MAX_POINTS)).toBeNull();
    expect(heartsToNext(999)).toBeNull();
  });

  it('measures garbage points from zero rather than going negative', () => {
    expect(heartsToNext(-30)).toBe(5);
    expect(heartsToNext(NaN)).toBe(5);
  });

  it('never returns a non-positive gap', () => {
    for (let points = 0; points <= MAX_POINTS; points++) {
      const gap = heartsToNext(points);
      if (gap !== null) expect(gap).toBeGreaterThan(0);
    }
  });
});

describe('unlockedFactCount', () => {
  it('counts nothing before the first fact', () => {
    expect(unlockedFactCount(0)).toBe(0);
    expect(unlockedFactCount(4)).toBe(0);
  });

  it('unlocks a fact exactly on its threshold', () => {
    expect(unlockedFactCount(5)).toBe(1);
    expect(unlockedFactCount(9)).toBe(1);
    expect(unlockedFactCount(10)).toBe(2);
    expect(unlockedFactCount(119)).toBe(7);
    expect(unlockedFactCount(120)).toBe(8);
  });

  it('caps at the number of authored facts', () => {
    expect(unlockedFactCount(MAX_POINTS)).toBe(MINOR_MILESTONES.length);
    expect(unlockedFactCount(10_000)).toBe(MINOR_MILESTONES.length);
  });

  it('clamps negative and garbage points to nothing unlocked', () => {
    expect(unlockedFactCount(-1)).toBe(0);
    expect(unlockedFactCount(NaN)).toBe(0);
  });
});

describe('unlockedFacts', () => {
  const FACTS = { facts: ['one', 'two', 'three'] };

  it('reveals a fact as each milestone lands', () => {
    expect(unlockedFacts(FACTS, 4)).toEqual([]);
    expect(unlockedFacts(FACTS, 5)).toEqual(['one']);
    expect(unlockedFacts(FACTS, 25)).toEqual(['one', 'two', 'three']);
  });

  it('never reaches past the facts a buddy actually has', () => {
    expect(unlockedFacts(FACTS, MAX_POINTS)).toEqual(['one', 'two', 'three']);
    expect(unlockedFacts({ facts: [] }, MAX_POINTS)).toEqual([]);
  });

  it('returns nothing for the buddies with no copy written yet', () => {
    expect(unlockedFacts(undefined, MAX_POINTS)).toEqual([]);
    expect(unlockedFacts({ l2: { story: ['told'] } }, MAX_POINTS)).toEqual([]);
  });

  it('skips an unauthored slot without shifting the facts after it', () => {
    const gapped = { facts: ['one', '', 'three'] };
    expect(unlockedFacts(gapped, 10)).toEqual(['one']);
    expect(unlockedFacts(gapped, 25)).toEqual(['one', 'three']);
  });
});

describe('MINOR_MILESTONES', () => {
  it('is strictly increasing and lands strictly between the level thresholds', () => {
    for (let i = 1; i < MINOR_MILESTONES.length; i++) {
      expect(MINOR_MILESTONES[i]).toBeGreaterThan(MINOR_MILESTONES[i - 1]);
    }
    for (const atPoints of MINOR_MILESTONES) {
      expect(LEVEL_THRESHOLDS).not.toContain(atPoints);
      expect(atPoints).toBeLessThan(MAX_POINTS);
    }
  });

  it('keeps every unlock within 20 hearts of the previous one', () => {
    const timeline = allMilestones().map((m) => m.atPoints);
    let previous = 0;
    for (const atPoints of timeline) {
      expect(atPoints - previous).toBeLessThanOrEqual(20);
      previous = atPoints;
    }
  });
});
