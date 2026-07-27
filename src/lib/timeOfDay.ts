/**
 * The three slots the home hero and greeting share.
 *
 * There is exactly one set of boundaries so the words and the picture can never
 * disagree — a "Good evening" over the sunrise banner is the kind of small lie
 * that makes the whole dashboard feel untended.
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/** Local-clock hour each slot starts at. */
const AFTERNOON_FROM = 12;
const EVENING_FROM = 17;

/** Which greeting slot a moment falls in, by the *local* clock. */
export function resolveTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour < AFTERNOON_FROM) return 'morning';
  if (hour < EVENING_FROM) return 'afternoon';
  return 'evening';
}
