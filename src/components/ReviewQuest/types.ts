import type { ComboStepResult } from '@/lib/combo';
import type { JlptLevel } from '@/types/flashcard';

/**
 * The one grading primitive every quest node calls. It fires the base XP pop,
 * records the answer into the quest's single session (advancing the SRS when a
 * cardId is given), and steps the shared combo — returning the combo result so
 * a node can react to a threshold. A wrong Word Match attempt pairs two
 * different cards, so it passes no cardId (XP, no card_progress) — mirroring the
 * standalone games.
 */
export type QuestGrade = (
  correct: boolean,
  jlpt: JlptLevel | undefined,
  cardId: string | undefined,
) => ComboStepResult;
