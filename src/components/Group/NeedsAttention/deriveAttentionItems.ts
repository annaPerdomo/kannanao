import type { Assignment } from '@/hooks/useAssignments';
import type { DifficultWord } from '@/hooks/useDifficultWords';
import type { GroupMember } from '@/hooks/useGroup';

import { groupAssignments } from '../AssignmentsList/groupAssignments';
import { daysUntilDue } from '../dueDate';
import { daysSinceActive, STALE_DAYS } from '../memberActivity';
import { hasReviewBacklog } from '../reviewBacklog';
import {
  CLOSE_ACCURACY_MARGIN,
  DUE_SOON_DAYS,
  MAX_BACKLOG_ROWS,
  MAX_INACTIVE_ROWS,
  MIN_FORGOTTEN_WORDS,
  MS_PER_DAY,
  WORDS_PREVIEW_COUNT,
} from './constants';
import type { AssignmentDueItem, AttentionItem, CloseToGoal, WordsForgottenItem } from './types';

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
 * One row for the whole group, not one per word: a teacher reteaches a set.
 * `learnersAffected` is the worst single word rather than a sum — the same
 * learner forgets several, so a sum can exceed the group's size.
 */
function forgottenWordsItem(words: DifficultWord[]): WordsForgottenItem | null {
  const forgotten = words.filter((w) => w.reason === 'forgotten');
  if (forgotten.length < MIN_FORGOTTEN_WORDS) return null;

  return {
    kind: 'wordsForgotten',
    severity: 'warning',
    count: forgotten.length,
    preview: forgotten.slice(0, WORDS_PREVIEW_COUNT).map((w) => w.word),
    learnersAffected: Math.max(...forgotten.map((w) => w.learnersAffected)),
  };
}

/**
 * Sort order is the contract: overdue assignments, then inactive learners
 * (stalest first), then due-soon assignments and forgotten words, then review
 * backlogs. Backlogs rank last as the only `info` rule — ahead of the warnings
 * they push a deck due tomorrow off the visible panel.
 */
export function deriveAttentionItems(
  members: GroupMember[],
  assignments: Assignment[],
  words: DifficultWord[] = [],
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
          reviewsWaiting: member.reviewsWaiting,
          reviewsOverdue3d: member.reviewsOverdue3d,
        }));

  // No second row about someone the inactive rule already named, collapsed
  // summary included. Their backlog rides that row's sub-line instead.
  const inactiveIds = new Set(inactive.map(({ member }) => member.id));

  const backlogged = members
    .filter((m) => !inactiveIds.has(m.id) && hasReviewBacklog(m))
    .sort((a, b) => (b.reviewsWaiting ?? 0) - (a.reviewsWaiting ?? 0));

  const backlogItems: AttentionItem[] =
    backlogged.length > MAX_BACKLOG_ROWS
      ? [{ kind: 'reviewBacklogCollapsed', severity: 'info', count: backlogged.length }]
      : backlogged.map((member) => ({
          kind: 'reviewBacklog',
          severity: 'info',
          memberId: member.id,
          name: member.displayName || member.username,
          reviewsWaiting: member.reviewsWaiting ?? 0,
          reviewsOverdue3d: member.reviewsOverdue3d ?? 0,
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

  const forgotten = forgottenWordsItem(words);

  return [
    ...overdueItems,
    ...inactiveItems,
    ...dueSoonItems,
    ...(forgotten ? [forgotten] : []),
    ...backlogItems,
  ];
}
