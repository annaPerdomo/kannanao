import type { GroupActivityModeStat } from '@/hooks/useGroupActivity';

import { MIN_MODE_CARDS } from '../modeSample';

export interface ModeVolume {
  mode: string;
  cardsStudied: number;
  sessions: number;
  /** 0–100. Meaningless when `enoughData` is false. */
  accuracy: number;
  enoughData: boolean;
  /** Share of every card studied in the window, as a whole percent, floored at 1. */
  share: number;
  /** Bar length as a percent of the busiest mode. */
  barPct: number;
}

/**
 * Busiest mode first, for a ranked bar chart of where the group's practice time
 * actually went. Bars scale to the busiest mode rather than to the total: the
 * comparison the reader makes is mode against mode, and scaling to the total
 * leaves every bar a stub as soon as a group spreads across a dozen modes.
 */
export function rankModeVolume(modes: GroupActivityModeStat[]): ModeVolume[] {
  const used = modes.filter((m) => m.cardsStudied > 0);
  const total = used.reduce((sum, m) => sum + m.cardsStudied, 0);
  const max = Math.max(0, ...used.map((m) => m.cardsStudied));

  return used
    .map((m) => ({
      mode: m.mode,
      cardsStudied: m.cardsStudied,
      sessions: m.sessions,
      accuracy: m.accuracy,
      enoughData: m.cardsStudied >= MIN_MODE_CARDS,
      // Every mode here studied a card, and "0% of cards" beside a visible bar
      // and a real count reads as a broken row, not a small one.
      share: total > 0 ? Math.max(1, Math.round((m.cardsStudied / total) * 100)) : 0,
      barPct: max > 0 ? (m.cardsStudied / max) * 100 : 0,
    }))
    .sort((a, b) => b.cardsStudied - a.cardsStudied || a.mode.localeCompare(b.mode));
}
