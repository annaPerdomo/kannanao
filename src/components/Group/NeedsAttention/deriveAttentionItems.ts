import type { Assignment } from '@/hooks/useAssignments';
import type { GroupMember } from '@/hooks/useGroup';

import { groupAssignments } from '../AssignmentsList/groupAssignments';
import { daysUntilDue } from '../dueDate';
import { daysSinceActive, STALE_DAYS } from '../MembersPanel';
import { CLOSE_ACCURACY_MARGIN, DUE_SOON_DAYS, MAX_INACTIVE_ROWS, MS_PER_DAY } from './constants';
import type { AssignmentDueItem, AttentionItem, CloseToGoal } from './types';

/** The unfinished member closest to (but not yet at) the batch's accuracy goal. */
function findCloseMember(batchAssignments: Assignment[]): CloseToGoal | null {
  let best: CloseToGoal | null = null;
  for (const a of batchAssignments) {
    if (a.completed_at) continue;
    if (a.required_accuracy == null || a.progress_accuracy == null) continue;
    const gap = a.required_accuracy - a.progress_accuracy;
    if (gap < 0 || gap > CLOSE_ACCURACY_MARGIN) continue;
    if (!best || a.progress_accuracy > best.progress) {
      best = {
        name: a.profiles?.display_name || a.profiles?.username || '',
        progress: a.progress_accuracy,
        goal: a.required_accuracy,
      };
    }
  }
  return best;
}

/**
 * Sort order is the contract: overdue assignments, then inactive learners
 * (stalest first), then due-soon assignments.
 */
export function deriveAttentionItems(
  members: GroupMember[],
  assignments: Assignment[],
  now = Date.now(),
): AttentionItem[] {
  const inactive = members
    .map((member) => {
      // No last-active date to age, so fall back to time in the group. That
      // also drops a learner who joined today: not behind, just hasn't started.
      const neverStudied = member.lastActive === null;
      const days = neverStudied
        ? (now - new Date(member.createdAt).getTime()) / MS_PER_DAY
        : daysSinceActive(member.lastActive, now);
      return { member, days, neverStudied };
    })
    .filter(({ days }) => days >= STALE_DAYS)
    .sort((a, b) => b.days - a.days);

  const inactiveItems: AttentionItem[] =
    inactive.length > MAX_INACTIVE_ROWS
      ? [{ kind: 'inactiveLearnersCollapsed', severity: 'error', count: inactive.length }]
      : inactive.map(({ member, days, neverStudied }) => ({
          kind: 'inactiveLearner',
          severity: 'error',
          memberId: member.id,
          name: member.displayName || member.username,
          days: neverStudied ? null : Math.floor(days),
          lastActive: member.lastActive,
        }));

  const overdueItems: AssignmentDueItem[] = [];
  const dueSoonItems: AssignmentDueItem[] = [];

  const unfinishedBatches = groupAssignments(assignments).filter(
    (b) => b.dueDate && b.completed < b.total,
  );
  const byId = new Map(assignments.map((a) => [a.id, a]));

  for (const batch of unfinishedBatches) {
    const days = daysUntilDue(batch.dueDate as string, now);
    if (days > DUE_SOON_DAYS) continue;

    const batchAssignments = batch.ids
      .map((id) => byId.get(id))
      .filter((a): a is Assignment => a !== undefined);
    const item: AssignmentDueItem = {
      kind: 'assignmentDue',
      severity: days < 0 ? 'error' : 'warning',
      batchKey: batch.key,
      deckName: batch.deckName ?? '',
      daysUntilDue: days,
      done: batch.completed,
      total: batch.total,
      close: findCloseMember(batchAssignments),
    };
    (item.severity === 'error' ? overdueItems : dueSoonItems).push(item);
  }

  overdueItems.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  dueSoonItems.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  return [...overdueItems, ...inactiveItems, ...dueSoonItems];
}
