import { describe, expect, it } from 'vitest';

import type { Assignment } from '@/hooks/useAssignments';
import type { GroupMember } from '@/hooks/useGroup';

import { deriveAttentionItems } from '../deriveAttentionItems';
import type { AssignmentDueItem, InactiveLearnerItem, ReviewBacklogItem } from '../types';

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
    reviewsWaiting: 0,
    reviewsOverdue3d: 0,
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

  it('flags an active learner once their backlog reaches 20 reviews', () => {
    const behind = member({
      id: 'behind',
      displayName: 'Behind',
      lastActive: daysAgo(1),
      reviewsWaiting: 34,
      reviewsOverdue3d: 12,
    });
    const justUnder = member({
      id: 'under',
      lastActive: daysAgo(1),
      reviewsWaiting: 19,
      reviewsOverdue3d: 19,
    });

    const items = deriveAttentionItems([behind, justUnder], [], NOW);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      kind: 'reviewBacklog',
      severity: 'info',
      memberId: 'behind',
      name: 'Behind',
      reviewsWaiting: 34,
      reviewsOverdue3d: 12,
    });
  });

  it('stays quiet about a big backlog that is all freshly due', () => {
    const justStudied = member({
      id: 'fresh',
      lastActive: daysAgo(0),
      reviewsWaiting: 40,
      reviewsOverdue3d: 0,
    });
    expect(deriveAttentionItems([justStudied], [], NOW)).toEqual([]);
  });

  it('never flags a backlog whose count failed to load', () => {
    const unknown = member({
      id: 'unknown',
      lastActive: daysAgo(1),
      reviewsWaiting: null,
      reviewsOverdue3d: null,
    });
    expect(deriveAttentionItems([unknown], [], NOW)).toEqual([]);
  });

  it('ranks backlog rows biggest-first', () => {
    const small = member({
      id: 'small',
      lastActive: daysAgo(1),
      reviewsWaiting: 21,
      reviewsOverdue3d: 1,
    });
    const huge = member({
      id: 'huge',
      lastActive: daysAgo(1),
      reviewsWaiting: 90,
      reviewsOverdue3d: 40,
    });
    const items = deriveAttentionItems([small, huge], [], NOW);
    expect(items.map((i) => (i as ReviewBacklogItem).memberId)).toEqual(['huge', 'small']);
  });

  it('collapses more than 3 backlog rows into one summary row', () => {
    const members = ['a', 'b', 'c', 'd'].map((id) =>
      member({ id, lastActive: daysAgo(1), reviewsWaiting: 30, reviewsOverdue3d: 5 }),
    );
    const items = deriveAttentionItems(members, [], NOW);
    expect(items).toEqual([{ kind: 'reviewBacklogCollapsed', severity: 'info', count: 4 }]);
  });

  it('folds the backlog into an inactive learner instead of adding a second row', () => {
    const stale = member({
      id: 'stale',
      lastActive: daysAgo(10),
      reviewsWaiting: 40,
      reviewsOverdue3d: 40,
    });
    const items = deriveAttentionItems([stale], [], NOW);

    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('inactiveLearner');
    expect((items[0] as InactiveLearnerItem).reviewsWaiting).toBe(40);
  });

  // The collapsed summary already speaks for those learners, so a backlog row
  // would name someone the panel has deliberately stopped listing individually.
  it('stays silent about the backlog of learners hidden behind the collapsed row', () => {
    const members = [8, 9, 10, 11].map((days, i) =>
      member({
        id: `m${i}`,
        lastActive: daysAgo(days),
        reviewsWaiting: 50,
        reviewsOverdue3d: 50,
      }),
    );
    const items = deriveAttentionItems(members, [], NOW);
    expect(items).toEqual([{ kind: 'inactiveLearnersCollapsed', severity: 'error', count: 4 }]);
  });

  it('sorts overdue assignments, then inactive learners, then due-soon assignments, then backlogs', () => {
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
    const backlogged = member({
      id: 'piled-up',
      lastActive: daysAgo(1),
      reviewsWaiting: 25,
      reviewsOverdue3d: 5,
    });

    const items = deriveAttentionItems(
      [inactive, backlogged],
      [overdueA, overdueB, soonA, soonB],
      NOW,
    );

    expect(items.map((i) => i.kind)).toEqual([
      'assignmentDue',
      'assignmentDue',
      'inactiveLearner',
      'assignmentDue',
      'assignmentDue',
      'reviewBacklog',
    ]);
    // Most overdue first, then soonest-due first.
    expect((items[0] as AssignmentDueItem).daysUntilDue).toBe(-5);
    expect((items[1] as AssignmentDueItem).daysUntilDue).toBe(-1);
    expect((items[3] as AssignmentDueItem).daysUntilDue).toBe(0);
    expect((items[4] as AssignmentDueItem).daysUntilDue).toBe(2);
  });

  // Regression: an uncapped info list ahead of the warnings pushed the deck row
  // past MAX_VISIBLE_ROWS and behind "View all".
  it('keeps a due-soon assignment visible when many learners are behind', () => {
    const dueSoon = assignment({ id: 'soon', due_date: daysFromNow(1), completed_at: null });
    const behind = Array.from({ length: 10 }, (_, i) =>
      member({ id: `b${i}`, lastActive: daysAgo(1), reviewsWaiting: 30, reviewsOverdue3d: 5 }),
    );

    const items = deriveAttentionItems(behind, [dueSoon], NOW);

    expect(items[0].kind).toBe('assignmentDue');
    expect(items).toHaveLength(2);
  });
});
