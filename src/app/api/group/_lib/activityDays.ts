/**
 * Days are cut in the *viewer's* timezone (minutes east of UTC, as the browser
 * reports it), not the server's: an evening session in New York belongs to that
 * evening, not to tomorrow in UTC.
 *
 * That offset is one scalar sampled now and applied to the whole window, so on
 * the two DST days a year the boundary hour lands on the adjacent local day.
 * Accepted — it smears a cell, never drops one. Exactness would mean shipping an
 * IANA zone and bucketing with Intl.DateTimeFormat.
 */

/** `YYYY-MM-DD` for an instant, shifted into the viewer's timezone. */
export function localDay(instant: Date, tzOffsetMinutes: number): string {
  return new Date(instant.getTime() + tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

/** The last `count` local days, oldest → newest, ending on the viewer's today. */
export function dayRange(count: number, tzOffsetMinutes: number, now: Date = new Date()): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    days.push(localDay(new Date(now.getTime() - i * 86_400_000), tzOffsetMinutes));
  }
  return days;
}
