import { describe, expect, it } from 'vitest';

import { daysSinceActive, sortMembers } from '@/components/Group/MembersPanel';
import { rankQuizRows } from '@/components/Group/QuizScoresPanel';
import type { GroupMember } from '@/hooks/useGroup';
import type { QuizScoreRow } from '@/lib/quiz';

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

function member(name: string, lastActive: string | null): GroupMember {
  return {
    id: name,
    username: name.toLowerCase(),
    displayName: name,
    avatar: null,
    createdAt: daysAgo(90),
    level: 3,
    totalXp: 500,
    streakDays: 0,
    totalCardsStudied: 100,
    totalCorrect: 80,
    totalSessions: 10,
    lastActive,
    masteryLearning: 0,
    masteryStrong: 0,
  };
}

function row(name: string, attempts: number, accuracy: number | null): QuizScoreRow {
  return {
    memberId: name,
    name,
    attempts,
    best: accuracy === null ? null : { score: accuracy / 10, total: 10, accuracy },
    latest: null,
  };
}

describe('daysSinceActive', () => {
  it('treats a member who never studied as infinitely stale', () => {
    expect(daysSinceActive(null)).toBe(Infinity);
  });

  it('measures in days', () => {
    expect(Math.round(daysSinceActive(daysAgo(4)))).toBe(4);
  });
});

describe('sortMembers', () => {
  const members = [
    member('Recent', daysAgo(0)),
    member('Never', null),
    member('Stale', daysAgo(6)),
  ];

  // The point of the default sort: at thirty members, the quiet ones are the
  // whole reason the organizer opened the page.
  it('puts the quietest members first under "needs a nudge"', () => {
    expect(sortMembers(members, 'attention').map((m) => m.displayName)).toEqual([
      'Never',
      'Stale',
      'Recent',
    ]);
  });

  it('reverses that for "most recent"', () => {
    expect(sortMembers(members, 'active').map((m) => m.displayName)).toEqual([
      'Recent',
      'Stale',
      'Never',
    ]);
  });

  it('sorts by name without touching the input array', () => {
    const sorted = sortMembers(members, 'name');
    expect(sorted.map((m) => m.displayName)).toEqual(['Never', 'Recent', 'Stale']);
    expect(members[0].displayName).toBe('Recent');
  });
});

describe('rankQuizRows', () => {
  it('lists members who have not taken it first, then the lowest scores', () => {
    const ranked = rankQuizRows([
      row('Top', 2, 95),
      row('NotTaken', 0, null),
      row('Middle', 1, 70),
      row('Low', 3, 40),
    ]);
    expect(ranked.map((r) => r.name)).toEqual(['NotTaken', 'Low', 'Middle', 'Top']);
  });

  it('leaves the source rows alone', () => {
    const rows = [row('B', 1, 50), row('A', 0, null)];
    rankQuizRows(rows);
    expect(rows.map((r) => r.name)).toEqual(['B', 'A']);
  });
});
