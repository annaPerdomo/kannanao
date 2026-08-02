/**
 * Assignment quest planning — pure, so the whole step sequence can be unit
 * tested without a browser. Tapping an assignment must never present a menu:
 * it starts a fixed path of one-tap legs that ends on the mode the goal asks
 * for.
 *
 * Each leg is a REAL session on the existing route (`/deck/x/study`,
 * `/deck/x/practice/match`, …), so XP, streaks and the server-side assignment
 * completion all keep working untouched.
 */
import { PRACTICE_CONFIG } from '@/components/Deck/constants';

import { type GoalMode, isGoalMode } from './assignmentMastery';

export type QuestStep = 'warmup' | 'practice' | 'goal';

export interface QuestLeg {
  step: QuestStep;
  mode: GoalMode;
}

/**
 * Below this many cards the middle practice leg is skipped — the same
 * threshold the review quest uses to decide a deck is too small for a third
 * format (BOSS_MIN_DUE in `quest.ts`).
 */
export const QUEST_PRACTICE_MIN_CARDS = 4;

/** The one middle leg, chosen once: Word Match is the most approachable mode. */
const PRACTICE_LEG_MODE = 'match' satisfies GoalMode;

const PRACTICE_ROUTE_MODES: readonly string[] = PRACTICE_CONFIG.map((tile) => tile.mode);

/**
 * The legs for an assignment, in order. Deterministic — no randomness, no
 * time-of-day, so every leg page derives the identical plan from the deck size
 * and the goal.
 *
 * - No goal mode (legacy assignment) or a `study` goal → a single study leg;
 *   completion already fires on any study of the deck.
 * - Otherwise warm-up (flip study) → Word Match → the goal mode, dropping Word
 *   Match when the deck is too small for it or when it *is* the goal.
 */
export function planAssignmentQuest({
  cardCount,
  requiredMode,
}: {
  cardCount: number;
  requiredMode: string | null;
}): QuestLeg[] {
  const goal = isGoalMode(requiredMode) ? requiredMode : null;
  if (goal === null || goal === 'study') return [{ step: 'goal', mode: 'study' }];

  const legs: QuestLeg[] = [{ step: 'warmup', mode: 'study' }];
  if (goal !== PRACTICE_LEG_MODE && cardCount >= QUEST_PRACTICE_MIN_CARDS) {
    legs.push({ step: 'practice', mode: PRACTICE_LEG_MODE });
  }
  legs.push({ step: 'goal', mode: goal });
  return legs;
}

export const QUEST_PARAM = 'quest';
export const QUEST_PARAM_VALUE = 'assignment';

/**
 * Where a leg is played. Null when the mode has no deck route to send the
 * learner to — `review` is cross-deck, so an assignment can't require it and
 * the quest declines to start rather than navigating somewhere wrong.
 */
export function questLegHref(deckId: string, leg: QuestLeg): string | null {
  const marker = `?${QUEST_PARAM}=${QUEST_PARAM_VALUE}`;
  if (leg.mode === 'study') return `/deck/${deckId}/study${marker}`;
  if (PRACTICE_ROUTE_MODES.includes(leg.mode)) {
    return `/deck/${deckId}/practice/${leg.mode}${marker}`;
  }
  return null;
}

// ── Quest state ───────────────────────────────────────────────────────────────

export interface AssignmentQuestState {
  assignmentId: string;
  deckId: string;
  requiredMode: string | null;
  requiredAccuracy: number | null;
  /**
   * Deck size, resolved once and kept so every leg plans the same number of
   * steps (the banner would otherwise renumber itself mid-quest). Null until
   * the first leg that knows it writes it back.
   */
  cardCount: number | null;
  /** Index into `planAssignmentQuest(...)`. */
  index: number;
}

const STORAGE_KEY = 'kannanao:assignment-quest';

/**
 * sessionStorage, not React state: the quest spans full route navigations and
 * has to survive a refresh mid-leg. Every read re-validates the shape so a
 * stale or hand-edited entry degrades to "no quest" instead of throwing.
 */
export function readQuestState(): AssignmentQuestState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const s = parsed as Partial<AssignmentQuestState>;
    if (typeof s.assignmentId !== 'string' || typeof s.deckId !== 'string') return null;
    if (typeof s.index !== 'number' || s.index < 0) return null;
    return {
      assignmentId: s.assignmentId,
      deckId: s.deckId,
      requiredMode: typeof s.requiredMode === 'string' ? s.requiredMode : null,
      requiredAccuracy: typeof s.requiredAccuracy === 'number' ? s.requiredAccuracy : null,
      cardCount: typeof s.cardCount === 'number' ? s.cardCount : null,
      index: s.index,
    };
  } catch {
    return null;
  }
}

export function writeQuestState(state: AssignmentQuestState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private-mode quota failures just mean no quest chrome — never a crash.
  }
}

export function clearQuestState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
