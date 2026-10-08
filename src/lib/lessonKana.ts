import {
  getSet,
  isKanaSetId,
  kanaSetForChar,
  orderKanaSets,
  segmentReading,
} from './kanaCurriculum';

export const LESSON_KANA_MAX = 8;

const SUGGESTION_LIMIT = 6;

/** Ranks curriculum rows by how often this batch of words would use them, dropping anything already covered. */
export function suggestKanaSets(
  cards: { reading: string | null }[],
  exclude: Iterable<string> = [],
): string[] {
  const excluded = new Set(exclude);
  const counts = new Map<string, number>();

  for (const card of cards) {
    if (!card.reading) continue;
    for (const kana of segmentReading(card.reading)) {
      const setId = kanaSetForChar(kana);
      if (!setId || excluded.has(setId) || !isKanaSetId(setId)) continue;
      counts.set(setId, (counts.get(setId) ?? 0) + 1);
    }
  }

  const ordered = orderKanaSets(counts.keys());
  return ordered
    .slice()
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
    .slice(0, SUGGESTION_LIMIT)
    .map((set) => set.id);
}

export function kanaSetLabel(setId: string): string {
  return getSet(setId)?.label ?? setId;
}

export function sortKanaSets(ids: string[]): string[] {
  return orderKanaSets(new Set(ids)).map((set) => set.id);
}
