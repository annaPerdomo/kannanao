import type { Assignment } from '@/hooks/useAssignments';
import type { Deck } from '@/types/deck';
import type { Flashcard } from '@/types/flashcard';

import { isAvailable } from './assignmentAvailability';
import { type GoalMode, isGoalMode } from './assignmentMastery';
import { countStrengths } from './cardStrength';
import { deckSupport, pickMixedSessionCards, planMixedPractice } from './mixedPractice';
import type { ChainLeg } from './practiceChain';
import type { CardProgress } from './supabase';

/** Review leg included; five legs is roughly ten minutes. */
export const MAX_DAILY_LEGS = 5;
export const DAILY_REVIEW_CAP = 12;
/** Below this a deck can't serve the flip + meaning-pick floor. */
export const MIN_FOCUS_CARDS = 2;
const SECONDS_PER_REVIEW = 20;
const MINUTES_PER_LEG = 1.5;

export interface FocusAssignment {
  id: string;
  requiredMode: string | null;
  requiredAccuracy: number | null;
}

export interface FocusPick {
  deckId: string;
  deckName: string;
  emoji: string;
  cardCount: number;
  readingUnlocked: boolean;
  assignment: FocusAssignment | null;
}

function byDueThenCreated(a: Assignment, b: Assignment): number {
  if (a.due_date !== b.due_date) {
    if (a.due_date == null) return 1;
    if (b.due_date == null) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

function toFocus(deck: Deck, assignment: Assignment | null): FocusPick {
  return {
    deckId: deck.id,
    deckName: deck.name,
    emoji: deck.emoji,
    cardCount: deck.cardCount,
    readingUnlocked: deck.readingPractice === true,
    assignment: assignment
      ? {
          id: assignment.id,
          requiredMode: assignment.required_mode,
          requiredAccuracy: assignment.required_accuracy,
        }
      : null,
  };
}

function dayIndex(today: string): number {
  const ms = Date.parse(`${today}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : 0;
}

export function pickFocusDeck(
  assignments: Assignment[],
  decks: Deck[],
  today: string,
  round = 0,
): FocusPick | null {
  const byId = new Map(decks.map((d) => [d.id, d]));
  const usable = (deck: Deck | undefined): deck is Deck =>
    !!deck && deck.cardCount >= MIN_FOCUS_CARDS;

  const open = assignments
    .filter(
      (a) => !a.completed_at && isAvailable(a.available_on, today) && usable(byId.get(a.deck_id)),
    )
    .sort(byDueThenCreated);
  if (open.length > 0) {
    const pick = open[round % open.length];
    return toFocus(byId.get(pick.deck_id)!, pick);
  }

  const assignedIds = new Set(
    assignments.filter((a) => isAvailable(a.available_on, today)).map((a) => a.deck_id),
  );
  const pool = [
    ...decks.filter((d) => usable(d) && assignedIds.has(d.id)),
    ...decks.filter((d) => usable(d) && !assignedIds.has(d.id)),
  ];
  if (pool.length === 0) return null;
  return toFocus(pool[(dayIndex(today) + round) % pool.length], null);
}

export interface DailyPlanInput {
  dueCount: number;
  focus: FocusPick | null;
  cards: Flashcard[];
  progress: CardProgress[];
  ttsReady: boolean;
}

function focusGoal(focus: FocusPick): GoalMode | null {
  const mode = focus.assignment?.requiredMode;
  if (!isGoalMode(mode) || mode === 'review') return null;
  if (mode === 'reading' && !focus.readingUnlocked) return null;
  return mode;
}

function fit(legs: ChainLeg[], budget: number): ChainLeg[] {
  if (legs.length <= budget) return legs;
  if (budget <= 0) return [];
  if (budget === 1) return [legs[0]];
  return [...legs.slice(0, budget - 1), legs[legs.length - 1]];
}

export function planDailyPractice({
  dueCount,
  focus,
  cards,
  progress,
  ttsReady,
}: DailyPlanInput): ChainLeg[] {
  const legs: ChainLeg[] = [];
  if (dueCount > 0) legs.push({ step: 'review', mode: 'review' });
  if (!focus) return legs;

  const goal = focusGoal(focus);
  const session = pickMixedSessionCards(cards, progress);
  const sessionIds = session.map((c) => c.id);
  const mixed = planMixedPractice({
    support: deckSupport(session, { readingUnlocked: focus.readingUnlocked, ttsReady }),
    counts: countStrengths(sessionIds, progress),
    exclude: goal ? [goal] : [],
  });

  const budget = MAX_DAILY_LEGS - legs.length - (goal ? 1 : 0);
  for (const leg of fit(mixed, budget)) {
    legs.push({ ...leg, deckId: focus.deckId, cardIds: sessionIds });
  }
  // The goal leg plays the whole deck: the trimmed session slice can fall under
  // the server's mastery card floor and never complete the assignment.
  if (goal && cards.length > 0) legs.push({ step: 'goal', mode: goal, deckId: focus.deckId });
  return legs;
}

export function estimateMinutes(legs: ChainLeg[], dueCount: number): number {
  const played = Math.min(dueCount, DAILY_REVIEW_CAP);
  const review = legs.some((l) => l.step === 'review') ? (played * SECONDS_PER_REVIEW) / 60 : 0;
  const rest = legs.filter((l) => l.step !== 'review').length * MINUTES_PER_LEG;
  return Math.max(1, Math.round(review + rest));
}

const ROUND_KEY = 'kannanao:daily-practice-round';

/** sessionStorage on purpose: a fresh tab restarting the rotation at the first deck is fine. */
export function readDailyRound(today: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.sessionStorage.getItem(ROUND_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date?: unknown; round?: unknown };
    return parsed.date === today && typeof parsed.round === 'number' ? parsed.round : 0;
  } catch {
    return 0;
  }
}

export function bumpDailyRound(today: string): void {
  if (typeof window === 'undefined') return;
  try {
    const round = readDailyRound(today) + 1;
    window.sessionStorage.setItem(ROUND_KEY, JSON.stringify({ date: today, round }));
  } catch {
    // A private-mode quota failure only costs the rotation.
  }
}

const PREVIEW_DECK_LEGS = 3;

export function previewMinutes(dueCount: number, hasFocus: boolean): number {
  const legs: ChainLeg[] = [];
  if (dueCount > 0) legs.push({ step: 'review', mode: 'review' });
  for (let i = 0; hasFocus && i < PREVIEW_DECK_LEGS; i++)
    legs.push({ step: 'practice', mode: 'recall' });
  return estimateMinutes(legs, dueCount);
}
