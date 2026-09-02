import { alpha, type Theme } from '@mui/material/styles';

import type { KanaEntry, KanaSet, KanaSetKind, KanaTrack } from '@/lib/kanaCurriculum';
import { setsForTrack } from '@/lib/kanaCurriculum';
import type { KanaStrengthState } from '@/lib/kanaProficiency';

// Applied as the scroll box's `dir`, never by reversing the columns: the DOM
// and tab order stay あ → ん and a phone opens on the あ column.
export const CHART_DIRECTION: 'rtl' | 'ltr' = 'rtl';

export const VOWEL_ROWS = ['a', 'i', 'u', 'e', 'o'] as const;

// Lightning grades ~2 answers a second: at the 40 XP card rate one replayed row
// would outrank a week of vocabulary study on the group leaderboard.
export const KANA_XP = 8;
export const COMBO_ROWS = ['ya', 'yu', 'yo'] as const;

// Real holes, not short columns: the gaps in や and わ are part of how the
// chart is recognised, so each short row names the vowel slots it fills.
const SHORT_ROW_SLOTS: Record<string, (number | null)[]> = {
  ya: [0, null, 1, null, 2],
  wa: [0, null, null, null, 1],
};

const N_ROW_KEY = 'wa';
const N_ENTRY_INDEX = 2;

export interface ChartColumn {
  setId: string;
  label: string;
  cells: (KanaEntry | null)[];
}

export interface ChartBlock {
  id: 'base' | 'marked' | 'combo' | 'contextual';
  rowLabels: readonly string[];
  columns: ChartColumn[];
}

function rowKey(set: KanaSet): string {
  return set.id.slice(set.id.indexOf('-') + 1);
}

function column(set: KanaSet, slots: (number | null)[]): ChartColumn {
  const cells = slots.map((i) => (i === null ? null : (set.entries[i] ?? null)));
  const first = cells.find((cell) => cell !== null);
  return { setId: set.id, label: first?.kana ?? set.label, cells };
}

function block(
  id: ChartBlock['id'],
  rowLabels: readonly string[],
  sets: KanaSet[],
  extra: ChartColumn[] = [],
): ChartBlock {
  const fullRow = rowLabels.map((_, i) => i);
  const columns = [
    ...sets.map((set) => column(set, SHORT_ROW_SLOTS[rowKey(set)] ?? fullRow)),
    ...extra,
  ];
  return { id, rowLabels, columns };
}

// No column header: it would offer a "practise this row" tap the cells already give.
function contextualBlock(sets: KanaSet[]): ChartBlock {
  const set = sets.find((s) => s.kind === 'contextual')!;
  return {
    id: 'contextual',
    rowLabels: [],
    columns: [{ setId: set.id, label: set.label, cells: set.entries }],
  };
}

export function buildKanaChart(track: KanaTrack): ChartBlock[] {
  const sets = setsForTrack(track);
  const ofKind = (kind: KanaSetKind) => sets.filter((set) => set.kind === kind);
  const waSet = sets.find((set) => rowKey(set) === N_ROW_KEY)!;
  const nColumn = column(waSet, [N_ENTRY_INDEX, null, null, null, null]);

  return [
    block('base', VOWEL_ROWS, ofKind('base'), [nColumn]),
    block('marked', VOWEL_ROWS, ofKind('marked')),
    block('combo', COMBO_ROWS, ofKind('combo')),
    contextualBlock(sets),
  ];
}

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
