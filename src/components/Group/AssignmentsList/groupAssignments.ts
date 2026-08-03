import type { Assignment } from '@/hooks/useAssignments';

export interface AssignmentBatch {
  key: string;
  deckName: string | null;
  deckEmoji: string | null;
  dueDate: string | null;
  /** Date the learner starts seeing it; null = already visible. */
  availableOn: string | null;
  total: number;
  completed: number;
  ids: string[];
  /** One member's copy, for the goal label and the edit dialog's current values. */
  sample: Assignment;
}

/**
 * Collapse one assignment per member into one row per deck + deadline + goal.
 *
 * The API stores an assignment per member because that is what completion is
 * tracked against, but a teacher assigned *one* thing: thirty identical rows is
 * the same handout listed thirty times. Every field the edit dialog can write is
 * part of the key, so two handouts of the same deck that differ in any of them
 * stay separate rows — a batch edit must never stamp one member's note or goal
 * onto another handout's copies. Unfinished batches lead, then the nearest
 * deadline.
 */
export function groupAssignments(assignments: Assignment[]): AssignmentBatch[] {
  const batches = new Map<string, AssignmentBatch>();

  for (const a of assignments) {
    const key = JSON.stringify([
      a.deck_id,
      a.due_date,
      a.available_on,
      a.required_accuracy,
      a.required_mode,
      a.note,
      a.title,
    ]);
    const batch = batches.get(key);
    if (batch) {
      batch.total += 1;
      batch.ids.push(a.id);
      if (a.completed_at) batch.completed += 1;
    } else {
      batches.set(key, {
        key,
        deckName: a.decks?.name ?? null,
        deckEmoji: a.decks?.emoji ?? null,
        dueDate: a.due_date,
        availableOn: a.available_on,
        total: 1,
        completed: a.completed_at ? 1 : 0,
        ids: [a.id],
        sample: a,
      });
    }
  }

  return [...batches.values()].sort((x, y) => {
    const xDone = x.completed === x.total;
    const yDone = y.completed === y.total;
    if (xDone !== yDone) return xDone ? 1 : -1;
    if (x.dueDate === y.dueDate) return 0;
    if (!x.dueDate) return 1;
    if (!y.dueDate) return -1;
    return x.dueDate.localeCompare(y.dueDate);
  });
}
