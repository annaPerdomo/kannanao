import type { GroupActivityModeStat } from '@/hooks/useGroupActivity';

/** Under this many cards in the window an accuracy figure is noise, not a signal. */
export const MIN_MODE_CARDS = 10;

export interface PracticeModeStrength {
  mode: string;
  cardsStudied: number;
  /** 0–100, as the activity endpoint reports it. Meaningless when `enoughData` is false. */
  accuracy: number;
  enoughData: boolean;
}

/**
 * Weakest first, except that modes below the sample floor sink to the bottom —
 * they would otherwise take the top slot on one unlucky session of three cards.
 */
export function rankPracticeModes(
  modes: GroupActivityModeStat[],
  minCards = MIN_MODE_CARDS,
): PracticeModeStrength[] {
  return modes
    .filter((m) => m.cardsStudied > 0)
    .map((m) => ({
      mode: m.mode,
      cardsStudied: m.cardsStudied,
      accuracy: m.accuracy,
      enoughData: m.cardsStudied >= minCards,
    }))
    .sort((a, b) => {
      if (a.enoughData !== b.enoughData) return a.enoughData ? -1 : 1;
      if (a.enoughData && a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.cardsStudied - a.cardsStudied;
    });
}
