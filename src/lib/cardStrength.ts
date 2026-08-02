/**
 * How well a learner knows one card, read off the SRS row the scheduler already
 * writes (`card_progress`). The three tiers are the rungs of the ladder mixed
 * practice climbs — recognize, recall, produce — not a score shown to anyone.
 */
import type { CardProgress } from './supabase';

export type CardStrength = 'new' | 'learning' | 'strong';

/**
 * A wrong answer resets the interval to 0 (see `nextSchedule`), so an interval
 * this long already means "answered right on separate days".
 */
export const STRONG_MIN_INTERVAL_DAYS = 3;
/** Ease starts at 2.5 and drops 0.2 per miss: this is "at most two misses". */
export const STRONG_MIN_EASE = 2.0;

export function cardStrength(progress: CardProgress | undefined): CardStrength {
  if (!progress) return 'new';
  return progress.intervalDays >= STRONG_MIN_INTERVAL_DAYS && progress.ease >= STRONG_MIN_EASE
    ? 'strong'
    : 'learning';
}

export interface StrengthCounts {
  new: number;
  learning: number;
  strong: number;
}

/** Progress rows span every deck, so a card of this deck with no row is new. */
export function countStrengths(cardIds: string[], progress: CardProgress[]): StrengthCounts {
  const byCard = new Map(progress.map((row) => [row.cardId, row]));
  const counts: StrengthCounts = { new: 0, learning: 0, strong: 0 };
  for (const id of cardIds) counts[cardStrength(byCard.get(id))]++;
  return counts;
}
