export const WEEK_DAYS = 7;

/** Sum of the last `n` entries of a daily series (oldest → newest). */
export function sumLastDays(values: number[], n = WEEK_DAYS): number {
  return values.slice(-n).reduce((total, v) => total + v, 0);
}

export function toHoursMinutes(secs: number): { hours: number; minutes: number } {
  const totalMinutes = Math.floor(secs / 60);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}
