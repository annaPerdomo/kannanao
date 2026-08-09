import { describe, expect, it } from 'vitest';

import type { GroupMember } from '@/hooks/useGroup';
import type { GroupActivity } from '@/hooks/useGroupActivity';

import { computeWeekStats } from '../computeWeekStats';

const NOW = Date.UTC(2026, 7, 8, 12, 0, 0);
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

let memberId = 0;
function member(overrides: Partial<GroupMember> = {}): GroupMember {
  memberId += 1;
  return {
    id: `member-${memberId}`,
    username: `user${memberId}`,
    displayName: null,
    avatar: null,
    createdAt: '2026-01-01T00:00:00Z',
    level: 1,
    totalXp: 0,
    streakDays: 0,
    totalCardsStudied: 0,
    totalCorrect: 0,
    totalSessions: 0,
    lastActive: null,
    lastNudgedAt: null,
    masteryLearning: 0,
    masteryStrong: 0,
    ...overrides,
  };
}

function activity(overrides: Partial<GroupActivity['totals']> = {}): GroupActivity {
  const days = Array.from({ length: 14 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`);
  return {
    days,
    totals: {
      cards: days.map(() => 0),
      xp: days.map(() => 0),
      correct: days.map(() => 0),
      durationSecs: days.map(() => 0),
      ...overrides,
    },
    members: [],
    modeBreakdown: [],
  };
}

describe('computeWeekStats', () => {
  it('is all zeros/null for a brand-new group with no members or sessions', () => {
    const stats = computeWeekStats([], null, NOW);
    expect(stats).toEqual({
      learnerCount: 0,
      activeCount: 0,
      cardsThisWeek: 0,
      accuracyPct: null,
      accuracyDeltaPct: null,
      studySecs: 0,
      bestStreak: null,
      masteredCount: 0,
      groupXp: 0,
    });
  });

  it('counts learners and who is active within the last 7 days', () => {
    const members = [
      member({ lastActive: daysAgo(0) }),
      member({ lastActive: daysAgo(6) }),
      member({ lastActive: daysAgo(9) }),
      member({ lastActive: null }),
    ];
    const stats = computeWeekStats(members, null, NOW);
    expect(stats.learnerCount).toBe(4);
    expect(stats.activeCount).toBe(2);
  });

  it('sums this week (last 7 entries) for cards and study time', () => {
    // 14 entries oldest -> newest; last 7 are 8..14.
    const cards = [1, 1, 1, 1, 1, 1, 1, 10, 20, 30, 5, 5, 5, 5];
    const durationSecs = [0, 0, 0, 0, 0, 0, 0, 60, 60, 60, 60, 60, 60, 60];
    const stats = computeWeekStats([], activity({ cards, durationSecs }), NOW);
    expect(stats.cardsThisWeek).toBe(10 + 20 + 30 + 5 + 5 + 5 + 5);
    expect(stats.studySecs).toBe(60 * 7);
  });

  it('computes this-week accuracy and the delta against the prior 7 days', () => {
    const cards = [...Array(7).fill(10), ...Array(7).fill(10)];
    const correct = [...Array(7).fill(5), ...Array(7).fill(8)]; // prev week 50%, this week 80%
    const stats = computeWeekStats([], activity({ cards, correct }), NOW);
    expect(stats.accuracyPct).toBe(80);
    expect(stats.accuracyDeltaPct).toBe(30);
  });

  it('hides the delta when the previous week has no data', () => {
    const cards = [...Array(7).fill(0), ...Array(7).fill(10)];
    const correct = [...Array(7).fill(0), ...Array(7).fill(8)];
    const stats = computeWeekStats([], activity({ cards, correct }), NOW);
    expect(stats.accuracyPct).toBe(80);
    expect(stats.accuracyDeltaPct).toBeNull();
  });

  it('avoids divide-by-zero when nobody studied this week', () => {
    const stats = computeWeekStats([], activity(), NOW);
    expect(stats.accuracyPct).toBeNull();
    expect(stats.accuracyDeltaPct).toBeNull();
  });

  it('handles a shorter-than-14-day activity window', () => {
    const days = ['2026-08-06', '2026-08-07', '2026-08-08'];
    const short: GroupActivity = {
      days,
      totals: { cards: [1, 2, 3], xp: [0, 0, 0], correct: [1, 2, 2], durationSecs: [10, 20, 30] },
      members: [],
      modeBreakdown: [],
    };
    const stats = computeWeekStats([], short, NOW);
    expect(stats.cardsThisWeek).toBe(6);
    expect(stats.accuracyPct).toBe(Math.round((5 / 6) * 100));
    expect(stats.accuracyDeltaPct).toBeNull();
  });

  it('picks the member with the highest streak, preferring display name over username', () => {
    const members = [
      member({ displayName: null, username: 'taro', streakDays: 3 }),
      member({ displayName: 'Naomi', username: 'naomi2', streakDays: 9 }),
      member({ displayName: null, username: 'hana', streakDays: 5 }),
    ];
    const stats = computeWeekStats(members, null, NOW);
    expect(stats.bestStreak).toEqual({ name: 'Naomi', days: 9 });
  });

  it('sums mastered cards and group XP across all members', () => {
    const members = [
      member({ masteryStrong: 4, totalXp: 100 }),
      member({ masteryStrong: 6, totalXp: 250 }),
    ];
    const stats = computeWeekStats(members, null, NOW);
    expect(stats.masteredCount).toBe(10);
    expect(stats.groupXp).toBe(350);
  });
});
