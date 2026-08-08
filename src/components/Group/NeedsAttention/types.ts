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

/** A new rule kind means a member here plus a matching case in Row.tsx. */
export type AttentionItem = InactiveLearnerItem | InactiveLearnersCollapsedItem | AssignmentDueItem;
