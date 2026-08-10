export type AttentionSeverity = 'error' | 'warning' | 'info';

export interface CloseToGoal {
  name: string;
  progress: number;
  goal: number;
}

export interface InactiveLearnerItem {
  kind: 'inactiveLearner';
  severity: 'error';
  memberId: string;
  name: string;
  /** Whole days since last active; `null` for a learner who has never studied. */
  days: number | null;
  lastActive: string | null;
  /** Folded into the sub-line instead of getting its own row; `null` when unknown. */
  reviewsWaiting: number | null;
  reviewsOverdue3d: number | null;
}

/** Collapses >MAX_INACTIVE_ROWS inactive-learner rows into one summary row. */
export interface InactiveLearnersCollapsedItem {
  kind: 'inactiveLearnersCollapsed';
  severity: 'error';
  count: number;
}

export interface AssignmentDueItem {
  kind: 'assignmentDue';
  severity: 'error' | 'warning';
  batchKey: string;
  deckName: string;
  /** Negative = overdue by that many days; 0+ = due today/in N days. */
  daysUntilDue: number;
  done: number;
  total: number;
  close: CloseToGoal | null;
}

/** A learner who is studying but has let their review pile build up. */
export interface ReviewBacklogItem {
  kind: 'reviewBacklog';
  severity: 'info';
  memberId: string;
  name: string;
  reviewsWaiting: number;
  /** Of those, how many came due 3+ days ago; 0 hides the sub-line. */
  reviewsOverdue3d: number;
}

/** Collapses >MAX_BACKLOG_ROWS review-backlog rows into one summary row. */
export interface ReviewBacklogCollapsedItem {
  kind: 'reviewBacklogCollapsed';
  severity: 'info';
  count: number;
}

/** Words the group had learned and has started missing again. */
export interface WordsForgottenItem {
  kind: 'wordsForgotten';
  severity: 'warning';
  count: number;
  /** Up to WORDS_PREVIEW_COUNT of them, for the sub-line. */
  preview: string[];
  /** Most affected by any one of these words — a floor on the distinct learners. */
  learnersAffected: number;
}

/** A new rule kind means a member here plus a matching case in Row.tsx. */
export type AttentionItem =
  | InactiveLearnerItem
  | InactiveLearnersCollapsedItem
  | AssignmentDueItem
  | ReviewBacklogItem
  | ReviewBacklogCollapsedItem
  | WordsForgottenItem;
