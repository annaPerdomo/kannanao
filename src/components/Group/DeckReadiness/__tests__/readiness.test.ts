import { describe, expect, it } from 'vitest';

import {
  readinessLevel,
  readinessMeter,
  strugglingNames,
} from '@/components/Group/DeckReadiness/readiness';
import type { GroupMember } from '@/hooks/useGroup';

function member(overrides: Partial<GroupMember> & { id: string }): GroupMember {
  return {
    username: 'learner',
    displayName: null,
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

describe('readinessLevel', () => {
  it('measures against every tier, not just the answered ones', () => {
    expect(readinessLevel({ strong: 30, learning: 10, unseen: 60 })).toBe('needsLesson');
  });

  it('calls 80% and up ready to move on', () => {
    expect(readinessLevel({ strong: 8, learning: 1, unseen: 1 })).toBe('ready');
    expect(readinessLevel({ strong: 10, learning: 0, unseen: 0 })).toBe('ready');
  });

  it('calls the 40–79% band getting there', () => {
    expect(readinessLevel({ strong: 40, learning: 10, unseen: 50 })).toBe('gettingThere');
    expect(readinessLevel({ strong: 79, learning: 1, unseen: 20 })).toBe('gettingThere');
  });

  it('agrees with the percentage the row prints at a band edge', () => {
    // 0.795 rounds to the 80% the row shows, so the verdict must say 80% too.
    expect(readinessLevel({ strong: 159, learning: 1, unseen: 40 })).toBe('ready');
    expect(readinessLevel({ strong: 79, learning: 1, unseen: 120 })).toBe('gettingThere');
  });

  it('does not tell an educator to reteach a deck nobody has opened', () => {
    expect(readinessLevel({ strong: 0, learning: 0, unseen: 200 })).toBe('notStarted');
    expect(readinessLevel({ strong: 0, learning: 0, unseen: 0 })).toBe('notStarted');
  });
});

describe('readinessMeter', () => {
  it('returns percentages that sum to 100 even when rounding disagrees', () => {
    const meter = readinessMeter({ strong: 1, learning: 1, unseen: 1 });
    expect(meter.strongPct + meter.learningPct + meter.unseenPct).toBe(100);
  });

  it('leaves an unassigned deck with no segments at all', () => {
    expect(readinessMeter({ strong: 0, learning: 0, unseen: 0 })).toEqual({
      strongPct: 0,
      learningPct: 0,
      unseenPct: 0,
    });
  });

  it('never lets the unseen remainder go negative', () => {
    const meter = readinessMeter({ strong: 5, learning: 5, unseen: 0 });
    expect(meter).toEqual({ strongPct: 50, learningPct: 50, unseenPct: 0 });
  });
});

describe('strugglingNames', () => {
  const members = [
    member({ id: 'a', displayName: 'Mika Tanaka' }),
    member({ id: 'b', displayName: null, username: 'ken' }),
    member({ id: 'c', displayName: 'Sora' }),
    member({ id: 'd', displayName: 'Yui' }),
  ];

  it('uses first names, falling back to the username', () => {
    expect(strugglingNames(['a', 'b'], members)).toEqual({ text: 'Mika, ken', resolved: 2 });
  });

  it('caps the list and counts the rest', () => {
    expect(strugglingNames(['a', 'b', 'c', 'd'], members)).toEqual({
      text: 'Mika, ken, Sora +1',
      resolved: 4,
    });
  });

  it('drops ids with no matching member rather than printing a uuid', () => {
    expect(strugglingNames(['a', 'gone'], members)).toEqual({ text: 'Mika', resolved: 1 });
  });

  it('gives an empty string when nobody resolves, so the caller can use the count', () => {
    expect(strugglingNames(['gone'], members)).toEqual({ text: '', resolved: 0 });
    expect(strugglingNames([], members)).toEqual({ text: '', resolved: 0 });
  });
});
