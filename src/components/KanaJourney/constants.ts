import { alpha, type Theme } from '@mui/material/styles';

import type { KanaStrengthState } from '@/lib/kanaProficiency';

// Re-exported: the screen imports the chart from here, the printed sheet from @/lib/kanaChart.
export {
  buildKanaChart,
  CHART_DIRECTION,
  type ChartBlock,
  type ChartColumn,
  COMBO_ROWS,
  VOWEL_ROWS,
} from '@/lib/kanaChart';

// Lightning grades ~2 answers a second: at the 40 XP card rate one replayed row
// would outrank a week of vocabulary study on the group leaderboard.
export const KANA_XP = 8;

/** Narrow enough that the 11-column chart fits a sideways tablet without scrolling. */
export const CELL_WIDTH = { xs: 52, sm: 62 } as const;

const TINTS: Record<KanaStrengthState, { color: (theme: Theme) => string; weight: number }> = {
  new: { color: (t) => t.palette.brand[300], weight: 0.1 },
  learning: { color: (t) => t.palette.info.main, weight: 0.16 },
  rusty: { color: (t) => t.palette.warning.main, weight: 0.24 },
  solid: { color: (t) => t.palette.success.main, weight: 0.18 },
};

export function stateTint(theme: Theme, state: KanaStrengthState) {
  const { color, weight } = TINTS[state];
  const base = color(theme);
  return {
    bgcolor: alpha(base, weight),
    border: `${state === 'rusty' ? 2 : 1}px solid ${alpha(base, state === 'new' ? 0.3 : 0.55)}`,
  };
}
