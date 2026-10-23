import { describe, expect, it } from 'vitest';

import { levelFromXp, XP_PER_WRONG, xpForLevel } from '../xp';

describe('xpForLevel', () => {
  it('scales linearly with level', () => {
    expect(xpForLevel(1)).toBe(200);
    expect(xpForLevel(3)).toBe(600);
  });
});

describe('levelFromXp', () => {
  it('starts at level 1 for 0 xp', () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it('rolls over to the next level exactly at the threshold', () => {
    expect(levelFromXp(199)).toBe(1);
    expect(levelFromXp(200)).toBe(2);
  });

  it('handles several level-ups', () => {
    expect(levelFromXp(200 + 400 + 10)).toBe(3);
  });
});

describe('XP_PER_WRONG', () => {
  it('is the small participation amount', () => {
    expect(XP_PER_WRONG).toBe(2);
  });
});
