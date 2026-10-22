export interface WordProgress {
  total: number;
  seen: number;
  known: number;
}

export const BASELINE_CHOICES = [70, 80, 90, 100] as const;
export const DEFAULT_BASELINE = 80;

export function summarizeWordProgress(
  cardIds: string[],
  rows: { card_id: string; last_reviewed_at: string | null; interval_days: number }[],
  since: string,
): WordProgress {
  const cardIdSet = new Set(cardIds);
  let seen = 0;
  let known = 0;
  for (const row of rows) {
    if (!cardIdSet.has(row.card_id)) continue;
    if (!row.last_reviewed_at || row.last_reviewed_at < since) continue;
    seen += 1;
    if (row.interval_days >= 1) known += 1;
  }
  return { total: cardIds.length, seen, known };
}

export function wordsDone(p: WordProgress, baseline: number): boolean {
  if (p.total === 0) return true;
  return p.seen === p.total && p.known * 100 >= baseline * p.total;
}

export function wordsNeeded(p: WordProgress, baseline: number): number {
  return Math.max(0, Math.ceil((baseline * p.total) / 100) - p.known);
}
