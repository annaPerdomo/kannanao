/**
 * Weekly study-days math — pure, derived entirely from the recentSessions
 * rows ProgressContext already loads, so it needs no schema change. All
 * date bucketing uses localDateString (streak/chest convention).
 */

import { localDateString } from './chest';

/**
 * Most recent Monday at local midnight. A calendar week on purpose: it
 * resets to a fresh, winnable goal every Monday, where a rolling 7-day
 * window silently decays (the flame problem again).
 */
export function weekStartLocal(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay(); // 0 = Sunday
  const daysSinceMonday = (day + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

/**
 * Count of unique local dates with real study (cards_studied > 0) from
 * this week's Monday through now. Rows with unparseable dates are skipped.
 */
export function studyDaysThisWeek(
  sessions: Array<{ started_at: string; cards_studied: number }>,
  now: Date = new Date(),
): number {
  const weekStart = weekStartLocal(now);
  const days = new Set<string>();
  for (const session of sessions) {
    if (session.cards_studied <= 0) continue;
    const started = new Date(session.started_at);
    if (Number.isNaN(started.getTime())) continue;
    if (started < weekStart || started > now) continue;
    days.add(localDateString(started));
  }
  return days.size;
}

/**
 * True when the user is coming back after a gap: they HAVE studied before,
 * but not today and not yesterday. Both comparison dates are passed in as
 * local YYYY-MM-DD strings so this stays clock-free and testable.
 */
export function isReturningAfterBreak(
  lastStudyDate: string | null,
  today: string,
  yesterday: string,
): boolean {
  if (!lastStudyDate) return false;
  return lastStudyDate !== today && lastStudyDate !== yesterday;
}
