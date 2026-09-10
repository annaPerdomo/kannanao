import type { Assignment } from '@/hooks/useAssignments';

export interface HandoutRef {
  deckId: string | null;
  kanaSet: string | null;
  /** Deck name, or the kana row label already computed for the batch. */
  name: string;
  emoji: string | null;
  note: string | null;
  availableOn: string | null;
  dueDate: string | null;
  requiredAccuracy: number | null;
  requiredMode: string | null;
}

export function handoutRefFromAssignment(a: Assignment, name: string): HandoutRef {
  return {
    deckId: a.deck_id,
    kanaSet: a.kana_set,
    name,
    emoji: a.decks?.emoji ?? null,
    note: a.note,
    availableOn: a.available_on,
    dueDate: a.due_date,
    requiredAccuracy: a.required_accuracy,
    requiredMode: a.required_mode,
  };
}
