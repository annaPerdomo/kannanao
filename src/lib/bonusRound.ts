export const MAX_BONUS_ROUNDS = 3;
export const BONUS_ROUND_CARDS = 15;
export const BONUS_XP = 50;

const STORAGE_KEY = 'kannanao:bonus-rounds';

interface BonusRoundRecord {
  date: string;
  count: number;
}

function readRecord(): BonusRoundRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const r = parsed as Partial<BonusRoundRecord>;
    return typeof r.date === 'string' && typeof r.count === 'number'
      ? { date: r.date, count: r.count }
      : null;
  } catch {
    return null;
  }
}

/** How many bonus rounds have already been played today; 0 on a bad or stale value. */
export function bonusRoundsToday(today: string): number {
  const record = readRecord();
  return record && record.date === today ? record.count : 0;
}

export function recordBonusRound(today: string): void {
  if (typeof window === 'undefined') return;
  try {
    const count = bonusRoundsToday(today) + 1;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count }));
  } catch {
    // A private-mode quota failure just means the cap can't be enforced locally.
  }
}
