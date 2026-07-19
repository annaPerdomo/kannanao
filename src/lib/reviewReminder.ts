/**
 * Daily review reminder — pure decision logic, side-effect-free for unit testing.
 *
 * One push per user per day, and only to a user who has something to do: cards
 * are due, they have not studied yet today, and they have not already been
 * reminded today. Everything that decides *whether* and *what* to send lives
 * here; the cron route (src/app/api/cron/review-reminders) only does I/O.
 */

import { APP_NAME } from './brand';

/**
 * The timezone the reminder job calls "today".
 *
 * The streak columns store a LOCAL calendar date written by the client
 * (see toLocalDateString in useProgress) — the server has no idea what timezone
 * any given user is in, because nothing persists one. So the job picks a single
 * reference timezone for the whole user base and compares against that.
 *
 * This MUST stay paired with the cron hour in vercel.json: the schedule is chosen
 * so the job fires in the late afternoon *here*, far from a midnight date
 * boundary, which is what keeps "haven't studied today" honest. Change one and
 * you must change the other.
 */
export const REMINDER_TIMEZONE = process.env.REMINDER_TIMEZONE || 'America/Los_Angeles';

/** A streak this long is worth mentioning — below it, the number is not motivating. */
export const STREAK_AT_RISK_MIN = 3;

/** One user's state, as returned by the review_reminder_candidates() RPC. */
export interface ReminderCandidate {
  userId: string;
  /** Cards with next_review_at <= now(). */
  dueCount: number;
  /** profiles.review_reminders — the settings switch. */
  remindersEnabled: boolean;
  /** user_progress.last_study_date — YYYY-MM-DD, written by the client. */
  lastStudyDate: string | null;
  /** user_progress.last_reminder_date — YYYY-MM-DD, written by this job. */
  lastReminderDate: string | null;
  /** user_progress.streak_days. */
  streakDays: number;
}

/** The notification itself, in the shape sendPushToUser already speaks. */
export interface ReminderPayload {
  title: string;
  body: string;
  url: string;
}

/** Why a candidate got nothing. Every skip is counted, so a quiet run is explainable. */
export type SkipReason = 'disabled' | 'nothing-due' | 'studied-today' | 'already-reminded';

export interface ReminderPlan {
  send: { userId: string; payload: ReminderPayload }[];
  skipped: Record<SkipReason, number>;
}

/** YYYY-MM-DD for `date` in `timeZone`. en-CA is the locale that formats as ISO. */
export function dateStringInTimeZone(date: Date, timeZone: string = REMINDER_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** The calendar day before `dateStr`. Parsed as UTC so no timezone can shift it. */
export function previousDay(dateStr: string): string {
  const ms = Date.parse(`${dateStr}T00:00:00Z`);
  return new Date(ms - 86_400_000).toISOString().slice(0, 10);
}

/**
 * Why this user gets no reminder today, or null if they should get one.
 *
 * Order matters only for the skip counters — the conditions are independent.
 */
export function skipReason(candidate: ReminderCandidate, today: string): SkipReason | null {
  if (!candidate.remindersEnabled) return 'disabled';
  // Never nag someone with nothing to do. This is the rule that makes the whole
  // feature tolerable: on a day with an empty queue, the app stays silent.
  if (candidate.dueCount <= 0) return 'nothing-due';
  if (candidate.lastStudyDate === today) return 'studied-today';
  if (candidate.lastReminderDate === today) return 'already-reminded';
  return null;
}

/** True when today is the day the streak breaks — they studied yesterday, not yet today. */
function streakIsAtRisk(candidate: ReminderCandidate, today: string): boolean {
  return (
    candidate.streakDays >= STREAK_AT_RISK_MIN && candidate.lastStudyDate === previousDay(today)
  );
}

function words(count: number): string {
  return count === 1 ? '1 word' : `${count} words`;
}

/**
 * The message. Two variants: the plain nudge, and — when today is the day a real
 * streak would break — the one that says what is actually at stake.
 */
export function buildReminderPayload(candidate: ReminderCandidate, today: string): ReminderPayload {
  const ready = words(candidate.dueCount);
  const body = streakIsAtRisk(candidate, today)
    ? `Keep your ${candidate.streakDays}-day streak going — ${ready} ${
        candidate.dueCount === 1 ? 'is' : 'are'
      } ready!`
    : `${ready} ${candidate.dueCount === 1 ? 'is' : 'are'} ready to review! 🌱`;

  return { title: APP_NAME, body, url: '/review' };
}

/** Split the candidates into the pushes to send and a tally of why the rest got none. */
export function selectReminders(candidates: ReminderCandidate[], today: string): ReminderPlan {
  const plan: ReminderPlan = {
    send: [],
    skipped: { disabled: 0, 'nothing-due': 0, 'studied-today': 0, 'already-reminded': 0 },
  };

  for (const candidate of candidates) {
    const reason = skipReason(candidate, today);
    if (reason) {
      plan.skipped[reason] += 1;
      continue;
    }
    plan.send.push({ userId: candidate.userId, payload: buildReminderPayload(candidate, today) });
  }

  return plan;
}
