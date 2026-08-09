import { describe, expect, it } from 'vitest';

import type { GroupMember } from '@/hooks/useGroup';

import { accuracyFraction, accuracyTone, learnerStatus, sortLearners } from '../derive';

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
    reviewsWaiting: 0,
    reviewsOverdue3d: 0,
    ...overrides,
  };
}

describe('learnerStatus', () => {
  it('is neverStarted for a member who has no lastActive', () => {
    expect(learnerStatus(null, NOW)).toEqual({ kind: 'neverStarted' });
  });

  it('is activeToday for anything under a day old', () => {
    expect(learnerStatus(daysAgo(0), NOW)).toEqual({ kind: 'activeToday' });
  });

  it('is activeRecently between 1 and 6 days', () => {
    expect(learnerStatus(daysAgo(3), NOW)).toEqual({ kind: 'activeRecently', days: 3 });
  });

  it('is inactive at 7+ days, matching STALE_DAYS', () => {
    expect(learnerStatus(daysAgo(7), NOW)).toEqual({ kind: 'inactive', days: 7 });
    expect(learnerStatus(daysAgo(30), NOW)).toEqual({ kind: 'inactive', days: 30 });
  });
});

describe('accuracyFraction', () => {
  it('is null with no cards studied, avoiding a divide-by-zero', () => {
    expect(accuracyFraction(member({ totalCardsStudied: 0, totalCorrect: 0 }))).toBeNull();
  });

  it('divides correct by studied', () => {
    expect(accuracyFraction(member({ totalCardsStudied: 20, totalCorrect: 15 }))).toBe(0.75);
  });
});

describe('accuracyTone', () => {
  it('is success at 80% and above', () => {
    expect(accuracyTone(0.8)).toBe('success');
    expect(accuracyTone(1)).toBe('success');
  });

  it('is warning between 60% and 79%', () => {
    expect(accuracyTone(0.6)).toBe('warning');
    expect(accuracyTone(0.79)).toBe('warning');
  });

  it('is error below 60%', () => {
    expect(accuracyTone(0.59)).toBe('error');
    expect(accuracyTone(0)).toBe('error');
  });
});

describe('sortLearners', () => {
  const members = [
    member({
      displayName: 'Recent',
      lastActive: daysAgo(0),
      streakDays: 2,
      totalCardsStudied: 10,
      totalCorrect: 5,
      reviewsWaiting: 7,
    }),
    member({
      displayName: 'Never',
      lastActive: null,
      streakDays: 0,
      totalCardsStudied: 0,
      totalCorrect: 0,
      reviewsWaiting: 0,
    }),
    member({
      displayName: 'Stale',
      lastActive: daysAgo(10),
      streakDays: 9,
      totalCardsStudied: 100,
      totalCorrect: 90,
      reviewsWaiting: 42,
    }),
  ];

  it('defaults status/desc to stalest-first, matching the old panel default', () => {
    const sorted = sortLearners(members, 'status', 'desc', NOW);
    expect(sorted.map((m) => m.displayName)).toEqual(['Never', 'Stale', 'Recent']);
  });

  it('reverses for status/asc', () => {
    const sorted = sortLearners(members, 'status', 'asc', NOW);
    expect(sorted.map((m) => m.displayName)).toEqual(['Recent', 'Stale', 'Never']);
  });

  it('sorts by streak', () => {
    const sorted = sortLearners(members, 'streak', 'desc', NOW);
    expect(sorted.map((m) => m.displayName)).toEqual(['Stale', 'Recent', 'Never']);
  });

  it('sorts by cards studied', () => {
    const sorted = sortLearners(members, 'cards', 'asc', NOW);
    expect(sorted.map((m) => m.displayName)).toEqual(['Never', 'Recent', 'Stale']);
  });

  it('sorts by reviews waiting', () => {
    expect(sortLearners(members, 'reviews', 'desc', NOW).map((m) => m.displayName)).toEqual([
      'Stale',
      'Recent',
      'Never',
    ]);
    expect(sortLearners(members, 'reviews', 'asc', NOW).map((m) => m.displayName)).toEqual([
      'Never',
      'Recent',
      'Stale',
    ]);
  });

  it('sorts by accuracy, treating no-data as lowest', () => {
    const sorted = sortLearners(members, 'accuracy', 'desc', NOW);
    expect(sorted.map((m) => m.displayName)).toEqual(['Stale', 'Recent', 'Never']);
  });

  it('does not mutate the input array', () => {
    const copy = [...members];
    sortLearners(members, 'streak', 'asc', NOW);
    expect(members).toEqual(copy);
  });
});
