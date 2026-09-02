/**
 * A practice chain: a short run of ordinary sessions played back to back, with
 * one button at the end of each and nothing to choose in between. Two things
 * ride on it — the assignment quest (warm up → practice → the teacher's goal)
 * and Mixed Practice (the deck page's single Practice button).
 *
 * Each leg is a REAL session on the existing route (`/deck/x/study`,
 * `/deck/x/practice/match`), which is what lets XP, streaks and the
 * server-side assignment completion keep working untouched.
 */
import { PRACTICE_CONFIG } from '@/components/Deck/constants';

import type { GoalMode } from './assignmentMastery';

export type ChainStep = 'review' | 'warmup' | 'practice' | 'goal';

export interface ChainLeg {
  step: ChainStep;
  mode: GoalMode;
  /** Unset means the chain's deck. */
  deckId?: string;
  /** Unset means the chain's `cardIds`, else the whole deck. */
  cardIds?: string[];
}

export type ChainKind = 'assignment' | 'mixed' | 'daily';

export const REVIEW_LEG_HREF = '/review/today';

const PRACTICE_ROUTE_MODES: readonly string[] = PRACTICE_CONFIG.map((tile) => tile.mode);

export const CHAIN_PARAM = 'chain';

/**
 * Where a leg is played. Null for a mode with no deck route — `review` is
 * cross-deck — so callers can decline to start rather than navigate wrong.
 */
export function chainLegHref(deckId: string, leg: ChainLeg, kind: ChainKind): string | null {
  const marker = `?${CHAIN_PARAM}=${kind}`;
  const deck = leg.deckId ?? deckId;
  if (leg.mode === 'review') return kind === 'daily' ? `${REVIEW_LEG_HREF}${marker}` : null;
  if (leg.mode === 'study') return `/deck/${deck}/study${marker}`;
  if (PRACTICE_ROUTE_MODES.includes(leg.mode)) {
    return `/deck/${deck}/practice/${leg.mode}${marker}`;
  }
  return null;
}

// ── Chain state ───────────────────────────────────────────────────────────────

export interface PracticeChainState {
  kind: ChainKind;
  deckId: string;
  /** Index into the chain's legs. */
  index: number;
  /**
   * A mixed session's plan, carried because it depends on per-card progress a
   * later leg can't re-derive. A quest leaves it null and re-plans per leg.
   */
  legs: ChainLeg[] | null;
  /** The cards every leg of a mixed session plays. Null means the whole deck. */
  cardIds: string[] | null;
  assignmentId: string | null;
  requiredMode: string | null;
  requiredAccuracy: number | null;
  /** Deck size, resolved once; null until the first leg that knows it writes it back. */
  cardCount: number | null;
}

const STORAGE_KEY = 'kannanao:practice-chain';

function readLegs(value: unknown): ChainLeg[] | null {
  if (!Array.isArray(value)) return null;
  const legs = value.filter(
    (leg): leg is ChainLeg =>
      !!leg &&
      typeof leg === 'object' &&
      typeof (leg as ChainLeg).mode === 'string' &&
      ((leg as ChainLeg).deckId === undefined || typeof (leg as ChainLeg).deckId === 'string') &&
      ((leg as ChainLeg).cardIds === undefined ||
        (Array.isArray((leg as ChainLeg).cardIds) &&
          (leg as ChainLeg).cardIds!.every((id) => typeof id === 'string'))),
  );
  return legs.length === value.length ? legs : null;
}

/**
 * sessionStorage, because a chain spans full route navigations and a refresh
 * mid-leg. Reads re-validate the shape so a stale or hand-edited entry degrades
 * to "no chain" instead of throwing.
 */
export function readChainState(): PracticeChainState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const s = parsed as Partial<PracticeChainState>;
    if (typeof s.deckId !== 'string') return null;
    if (typeof s.index !== 'number' || s.index < 0) return null;
    const kind: ChainKind =
      s.kind === 'mixed' ? 'mixed' : s.kind === 'daily' ? 'daily' : 'assignment';
    // An assignment quest with no assignment has nothing to complete or grade.
    if (kind === 'assignment' && typeof s.assignmentId !== 'string') return null;
    if (kind === 'daily' && !readLegs(s.legs)) return null;
    return {
      kind,
      deckId: s.deckId,
      index: s.index,
      legs: readLegs(s.legs),
      cardIds:
        Array.isArray(s.cardIds) && s.cardIds.every((id) => typeof id === 'string')
          ? s.cardIds
          : null,
      assignmentId: typeof s.assignmentId === 'string' ? s.assignmentId : null,
      requiredMode: typeof s.requiredMode === 'string' ? s.requiredMode : null,
      requiredAccuracy: typeof s.requiredAccuracy === 'number' ? s.requiredAccuracy : null,
      cardCount: typeof s.cardCount === 'number' ? s.cardCount : null,
    };
  } catch {
    return null;
  }
}

export function writeChainState(state: PracticeChainState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A private-mode quota failure just means no chain chrome — never a crash.
  }
}

export function clearChainState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
