import type { Assignment } from '@/hooks/useAssignments';
import type { Deck } from '@/types/deck';

import { type AssignmentBatch, groupAssignments } from '../AssignmentsList/groupAssignments';
import { sectionBatches } from '../AssignmentsList/sectionBatches';

const RECENT_LIMIT = 3;

export interface MaterialsProgress {
  finishedCount: number;
  currentCount: number;
  upcomingCount: number;
  nextDue: AssignmentBatch | null;
  recentlyFinished: AssignmentBatch[];
  notHandedOut: Deck[];
}

export function deriveMaterialsProgress(opts: {
  assignments: Assignment[];
  ownDecks: Deck[];
  today: string;
}): MaterialsProgress {
  const { assignments, ownDecks, today } = opts;
  const { current, upcoming, finished } = sectionBatches(groupAssignments(assignments), today);

  const nextDue = current.reduce<AssignmentBatch | null>((closest, batch) => {
    if (!batch.dueDate) return closest;
    if (!closest || !closest.dueDate || batch.dueDate < closest.dueDate) return batch;
    return closest;
  }, null);

  const assignedDeckIds = new Set(
    assignments.map((a) => a.deck_id).filter((id): id is string => id !== null),
  );
  const notHandedOut = ownDecks.filter((deck) => !assignedDeckIds.has(deck.id));

  return {
    finishedCount: finished.length,
    currentCount: current.length,
    upcomingCount: upcoming.length,
    nextDue,
    recentlyFinished: finished.slice(0, RECENT_LIMIT),
    notHandedOut,
  };
}
