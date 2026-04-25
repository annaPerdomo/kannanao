import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cardXp, XP_PER_CORRECT, XP_PER_WRONG, XP_PERFECT_BONUS, xpForLevel, levelFromXp, xpProgressInLevel } from '@/hooks/useProgress';

// Note: useProgress hook itself requires Supabase. We test its pure exports here.

describe('XP and Level utilities (from useProgress)', () => {
  describe('xpForLevel', () => {
    it('should return level * 200', () => {
      expect(xpForLevel(1)).toBe(200);
      expect(xpForLevel(5)).toBe(1000);
      expect(xpForLevel(10)).toBe(2000);
    });
  });

  describe('levelFromXp', () => {
    it('should return 1 for 0 XP', () => {
      expect(levelFromXp(0)).toBe(1);
    });

    it('should return 1 for XP below level 1 threshold (< 200)', () => {
      expect(levelFromXp(199)).toBe(1);
    });

    it('should return 2 at exactly 200 XP', () => {
      expect(levelFromXp(200)).toBe(2);
    });

    it('should return 3 at 200+400=600 XP', () => {
      expect(levelFromXp(600)).toBe(3);
    });

    it('should compute level correctly for large XP values', () => {
      // Level 1: 200, Level 2: 400, Level 3: 600, Level 4: 800
      // Total for level 4: 200+400+600 = 1200 XP to reach level 4
      expect(levelFromXp(1200)).toBe(4);
    });
  });

  describe('xpProgressInLevel', () => {
    it('should return current=0 and needed=200 at start', () => {
      const { current, needed } = xpProgressInLevel(0);
      expect(current).toBe(0);
      expect(needed).toBe(200);
    });

    it('should return correct progress within a level', () => {
      const { current, needed } = xpProgressInLevel(150);
      expect(current).toBe(150);
      expect(needed).toBe(200);
    });

    it('should correctly compute progress at level 2', () => {
      // 200 XP to reach level 2, then need 400 more for level 3
      const { current, needed } = xpProgressInLevel(300);
      expect(current).toBe(100); // 100 XP into level 2
      expect(needed).toBe(400);  // need 400 to reach level 3
    });
  });

  describe('XP constants', () => {
    it('should export correct XP_PER_CORRECT', () => {
      expect(XP_PER_CORRECT).toBe(10);
    });

    it('should export correct XP_PER_WRONG', () => {
      expect(XP_PER_WRONG).toBe(2);
    });

    it('should export correct XP_PERFECT_BONUS', () => {
      expect(XP_PERFECT_BONUS).toBe(50);
    });
  });
});
