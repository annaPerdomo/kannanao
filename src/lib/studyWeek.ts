/**
 * Weekly study-days math, computed from the recentSessions rows
 * ProgressContext already loads. All date bucketing uses localDateString
 * (streak/chest convention).
 */

import { localDateString } from './chest';

/**
 * Most recent Monday at local midnight. A calendar week on purpose: it
 * resets to a fresh, winnable goal every Monday, where a rolling 7-day
 * window silently decays (the flame problem again).
 */
export function weekStartLocal(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

/**
 * Unique local dates with real study (cards_studied > 0) from this week's
 * Monday through now. Rows with unparseable dates are skipped. The week dots
 * fill from this same set, so the dots and the count can never disagree.
 */
export function studyDaySet(
  sessions: Array<{ started_at: string; cards_studied: number }>,
  now: Date = new Date(),
): Set<string> {
  // Compare local DATES, not timestamps: started_at is server time, and a
  // client clock behind the server would drop a just-finished session as
  // "future".
  const firstDay = localDateString(weekStartLocal(now));
  const lastDay = localDateString(now);
  const days = new Set<string>();
  for (const session of sessions) {
    if (session.cards_studied <= 0) continue;
    const started = new Date(session.started_at);
    if (Number.isNaN(started.getTime())) continue;
    const day = localDateString(started);
    if (day < firstDay || day > lastDay) continue;
    days.add(day);
  }
  return days;
}

export function studyDaysThisWeek(
  sessions: Array<{ started_at: string; cards_studied: number }>,
  now: Date = new Date(),
): number {
  return studyDaySet(sessions, now).size;
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
