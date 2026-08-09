import { describe, expect, it } from 'vitest';

import type { Assignment } from '@/hooks/useAssignments';
import type { GroupMember } from '@/hooks/useGroup';

import { deriveAttentionItems } from '../deriveAttentionItems';
import type { AssignmentDueItem, InactiveLearnerItem } from '../types';

const NOW = Date.UTC(2026, 7, 8, 12, 0, 0);
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();
const daysFromNow = (n: number) => new Date(NOW + n * DAY).toISOString();

let memberId = 0;
function member(overrides: Partial<GroupMember> = {}): GroupMember {
  memberId += 1;
  return {
    id: `member-${memberId}`,
    username: `user${memberId}`,
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
    ...overrides,
  };
}

let assignmentId = 0;
function assignment(overrides: Partial<Assignment> = {}): Assignment {
  assignmentId += 1;
  return {
    id: `assignment-${assignmentId}`,
    organizer_id: 'org1',
    member_id: 'member-1',
    deck_id: 'deck-1',
    title: null,
    note: null,
    due_date: null,
    available_on: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    required_accuracy: null,
    required_mode: null,
    progress_accuracy: null,
    decks: { id: 'deck-1', name: 'Kanji Basics', emoji: '📘' },
    profiles: { display_name: 'Learner', username: 'learner' },
    ...overrides,
  };
}

describe('deriveAttentionItems', () => {
  it('returns nothing for an empty group', () => {
    expect(deriveAttentionItems([], [], NOW)).toEqual([]);
  });

  it('flags members inactive 7+ days, stalest first, and excludes recent ones', () => {
    const stale = member({ id: 'stale', displayName: 'Stale', lastActive: daysAgo(10) });
    const stalest = member({ id: 'stalest', displayName: 'Stalest', lastActive: daysAgo(20) });
    const active = member({ id: 'active', displayName: 'Active', lastActive: daysAgo(2) });
    const exactlyAtThreshold = member({
      id: 'threshold',
      displayName: 'Threshold',
      lastActive: daysAgo(7),
    });

    const items = deriveAttentionItems([stale, stalest, active, exactlyAtThreshold], [], NOW);

    expect(items.map((i) => (i as InactiveLearnerItem).memberId)).toEqual([
      'stalest',
      'stale',
      'threshold',
    ]);
    expect(items.every((i) => i.kind === 'inactiveLearner')).toBe(true);
  });

  it('rounds down to whole days since last active', () => {
    const m = member({ id: 'm', displayName: 'M', lastActive: daysAgo(10.7) });
    const [item] = deriveAttentionItems([m], [], NOW);
    expect((item as InactiveLearnerItem).days).toBe(10);
  });

  it('marks a long-joined learner who never studied with days null, not Infinity', () => {
    const m = member({
      id: 'm',
      displayName: 'M',
      lastActive: null,
      createdAt: daysAgo(30),
    });
    const items = deriveAttentionItems([m], [], NOW);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('inactiveLearner');
    // A stray Infinity here would render as "hasn't studied in ∞ days".
    expect((items[0] as InactiveLearnerItem).days).toBeNull();
  });

  it('leaves a learner who joined this week alone until they have had time to start', () => {
    const justJoined = member({ id: 'new', lastActive: null, createdAt: daysAgo(1) });
    const settledIn = member({ id: 'old', lastActive: null, createdAt: daysAgo(8) });
    const items = deriveAttentionItems([justJoined, settledIn], [], NOW);
    expect(items.map((i) => (i as InactiveLearnerItem).memberId)).toEqual(['old']);
  });

  it('ranks never-studied learners by how long they have been in the group', () => {
    const recent = member({ id: 'recent', lastActive: null, createdAt: daysAgo(8) });
    const ancient = member({ id: 'ancient', lastActive: null, createdAt: daysAgo(60) });
    const items = deriveAttentionItems([recent, ancient], [], NOW);
    expect(items.map((i) => (i as InactiveLearnerItem).memberId)).toEqual(['ancient', 'recent']);
  });

  it('collapses more than 3 inactive learners into one summary row', () => {
    const members = [
      member({ id: 'a', lastActive: daysAgo(8) }),
      member({ id: 'b', lastActive: daysAgo(9) }),
      member({ id: 'c', lastActive: daysAgo(10) }),
      member({ id: 'd', lastActive: daysAgo(11) }),
    ];
    const items = deriveAttentionItems(members, [], NOW);
    expect(items).toEqual([{ kind: 'inactiveLearnersCollapsed', severity: 'error', count: 4 }]);
  });

  it('keeps individual rows when exactly at the collapse threshold', () => {
    const members = [
      member({ id: 'a', lastActive: daysAgo(8) }),
      member({ id: 'b', lastActive: daysAgo(9) }),
      member({ id: 'c', lastActive: daysAgo(10) }),
    ];
    const items = deriveAttentionItems(members, [], NOW);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.kind === 'inactiveLearner')).toBe(true);
  });

  it('flags an overdue, unfinished batch as error severity', () => {
    const assignments = [
      assignment({ id: 'a1', member_id: 'm1', due_date: daysAgo(2), completed_at: null }),
      assignment({ id: 'a2', member_id: 'm2', due_date: daysAgo(2), completed_at: daysAgo(1) }),
    ];
    const [item] = deriveAttentionItems([], assignments, NOW);
    expect(item.kind).toBe('assignmentDue');
    const due = item as AssignmentDueItem;
    expect(due.severity).toBe('error');
    expect(due.daysUntilDue).toBe(-2);
    expect(due.done).toBe(1);
    expect(due.total).toBe(2);
  });

  it('flags a batch due within 3 days as warning severity', () => {
    const assignments = [assignment({ due_date: daysFromNow(2), completed_at: null })];
    const [item] = deriveAttentionItems([], assignments, NOW) as [AssignmentDueItem];
    expect(item.severity).toBe('warning');
    expect(item.daysUntilDue).toBe(2);
  });

  it('ignores batches due more than 3 days out, without a due date, or fully completed', () => {
    const tooFarOut = assignment({ due_date: daysFromNow(10), completed_at: null });
    const noDueDate = assignment({ due_date: null, completed_at: null });
    const finishedGroup = [
      assignment({ id: 'f1', member_id: 'm1', due_date: daysAgo(1), completed_at: daysAgo(1) }),
    ];
    const items = deriveAttentionItems([], [tooFarOut, noDueDate, ...finishedGroup], NOW);
    expect(items).toEqual([]);
  });

  it('surfaces the unfinished member closest to the accuracy goal, within 10 points', () => {
    const assignments = [
      assignment({
        id: 'close',
        member_id: 'm-close',
        due_date: daysAgo(1),
        required_accuracy: 80,
        progress_accuracy: 75,
        completed_at: null,
        profiles: { display_name: 'Close Learner', username: 'closer' },
      }),
      assignment({
        id: 'far',
        member_id: 'm-far',
        due_date: daysAgo(1),
        required_accuracy: 80,
        progress_accuracy: 40,
        completed_at: null,
        profiles: { display_name: 'Far Learner', username: 'farr' },
      }),
    ];
    const [item] = deriveAttentionItems([], assignments, NOW) as [AssignmentDueItem];
    expect(item.close).toEqual({ name: 'Close Learner', progress: 75, goal: 80 });
  });

  it('leaves close null when no unfinished member is within the margin', () => {
    const assignments = [
      assignment({
        due_date: daysAgo(1),
        required_accuracy: 80,
        progress_accuracy: 40,
        completed_at: null,
      }),
    ];
    const [item] = deriveAttentionItems([], assignments, NOW) as [AssignmentDueItem];
    expect(item.close).toBeNull();
  });

  it('sorts overdue assignments, then inactive learners, then due-soon assignments', () => {
    const overdueA = assignment({
      id: 'overdue-a',
      member_id: 'oa',
      due_date: daysAgo(5),
      completed_at: null,
    });
    const overdueB = assignment({
      id: 'overdue-b',
      member_id: 'ob',
      due_date: daysAgo(1),
      completed_at: null,
    });
    const soonA = assignment({
      id: 'soon-a',
      member_id: 'sa',
      due_date: daysFromNow(2),
      completed_at: null,
    });
    const soonB = assignment({
      id: 'soon-b',
      member_id: 'sb',
      due_date: daysFromNow(0),
      completed_at: null,
    });
    const inactive = member({ id: 'stale', lastActive: daysAgo(8) });

    const items = deriveAttentionItems([inactive], [overdueA, overdueB, soonA, soonB], NOW);

    expect(items.map((i) => i.kind)).toEqual([
      'assignmentDue',
      'assignmentDue',
      'inactiveLearner',
      'assignmentDue',
      'assignmentDue',
    ]);
    // Most overdue first, then soonest-due first.
    expect((items[0] as AssignmentDueItem).daysUntilDue).toBe(-5);
    expect((items[1] as AssignmentDueItem).daysUntilDue).toBe(-1);
    expect((items[3] as AssignmentDueItem).daysUntilDue).toBe(0);
    expect((items[4] as AssignmentDueItem).daysUntilDue).toBe(2);
  });
});
