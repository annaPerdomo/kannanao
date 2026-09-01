import { describe, expect, it } from 'vitest';

import {
  groupBatchMembers,
  isNearGoal,
} from '@/components/Group/AssignmentsList/batchMemberGrouping';
import type { Assignment } from '@/hooks/useAssignments';

function member(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1',
    organizer_id: 'org1',
    member_id: 'm1',
    deck_id: 'd1',
    kana_set: null,
    title: null,
    note: null,
    due_date: null,
    available_on: null,
    completed_at: null,
    created_at: '2026-07-01T00:00:00Z',
    required_accuracy: null,
    required_mode: null,
    progress_accuracy: null,
    decks: { id: 'd1', name: 'Animals', emoji: '🐾' },
    profiles: { display_name: 'Mika', username: 'mika' },
    ...overrides,
  };
}

describe('groupBatchMembers', () => {
  it('orders done before close before not-started', () => {
    const rows = groupBatchMembers([
      member({ member_id: 'm-not-started' }),
      member({ member_id: 'm-close', progress_accuracy: 60 }),
      member({ member_id: 'm-done', completed_at: '2026-07-05T00:00:00Z' }),
    ]);

    expect(rows.map((r) => r.memberId)).toEqual(['m-done', 'm-close', 'm-not-started']);
    expect(rows.map((r) => r.status)).toEqual(['done', 'close', 'notStarted']);
  });

  it('treats a member with no attempted session as not started', () => {
    const rows = groupBatchMembers([member({ progress_accuracy: null })]);
    expect(rows[0].status).toBe('notStarted');
  });

  it('treats any not-done member with a session as close, even far from goal', () => {
    const rows = groupBatchMembers([member({ progress_accuracy: 20 })]);
    expect(rows[0].status).toBe('close');
  });

  it('sorts done members by most recently finished first', () => {
    const rows = groupBatchMembers([
      member({ member_id: 'm-early', completed_at: '2026-07-01T00:00:00Z' }),
      member({ member_id: 'm-late', completed_at: '2026-07-10T00:00:00Z' }),
    ]);
    expect(rows.map((r) => r.memberId)).toEqual(['m-late', 'm-early']);
  });

  it('sorts close members by highest progress first', () => {
    const rows = groupBatchMembers([
      member({ member_id: 'm-low', progress_accuracy: 30 }),
      member({ member_id: 'm-high', progress_accuracy: 75 }),
    ]);
    expect(rows.map((r) => r.memberId)).toEqual(['m-high', 'm-low']);
  });

  it("carries the member profile's last_nudged_at through as lastNudgedAt", () => {
    const rows = groupBatchMembers([
      member({
        profiles: {
          display_name: 'Mika',
          username: 'mika',
          last_nudged_at: '2026-08-01T00:00:00Z',
        },
      }),
    ]);
    expect(rows[0].lastNudgedAt).toBe('2026-08-01T00:00:00Z');
  });

  it('defaults lastNudgedAt to null when the profile has never been nudged', () => {
    const rows = groupBatchMembers([member()]);
    expect(rows[0].lastNudgedAt).toBeNull();
  });
});

describe('isNearGoal', () => {
  it('is false when the member has not attempted a session', () => {
    expect(isNearGoal(null, 80)).toBe(false);
  });

  it('is true for any progress when the batch has no accuracy goal', () => {
    expect(isNearGoal(10, null)).toBe(true);
  });

  it('is true within the 15-point margin', () => {
    expect(isNearGoal(70, 80)).toBe(true);
    expect(isNearGoal(65, 80)).toBe(true);
  });

  it('is false outside the 15-point margin', () => {
    expect(isNearGoal(50, 80)).toBe(false);
  });
});
