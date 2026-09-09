import { DEFAULT_TIME_ZONE } from '@/i18n/config';
import { orderKanaSets } from '@/lib/kanaCurriculum';

import { dateStringInTimeZone } from './reviewReminder';

/**
 * The calendar date that decides whether an assignment has started.
 *
 * `assignments.available_on` is a plain date, so "has it started?" needs a
 * single reference day. It has to be the *same* day on the server (assignment
 * list, completion) and in the browser (deck library) or a learner sees a deck
 * that its assignment says hasn't started. `DEFAULT_TIME_ZONE` is a literal, not
 * an env var, precisely so both sides agree — see src/i18n/config.ts.
 */
export function availabilityToday(now: Date = new Date()): string {
  return dateStringInTimeZone(now, DEFAULT_TIME_ZONE);
}

/**
 * PostgREST `.or()` argument matching assignments the learner can see now.
 * A null `available_on` means "available immediately", which is every
 * assignment created before the column existed.
 */
export function availableNowFilter(today: string = availabilityToday()): string {
  return `available_on.is.null,available_on.lte.${today}`;
}

/** True when an already-loaded assignment row has started for the learner. */
export function isAvailable(availableOn: string | null | undefined, today = availabilityToday()) {
  return !availableOn || availableOn <= today;
}

/** Open kana rows, in curriculum order. */
export function openKanaSetIds(
  assignments: {
    kana_set: string | null;
    completed_at: string | null;
    available_on: string | null;
  }[],
  today = availabilityToday(),
): string[] {
  const ids = assignments
    .filter((a) => a.kana_set != null && !a.completed_at && isAvailable(a.available_on, today))
    .map((a) => a.kana_set as string);
  return orderKanaSets(new Set(ids)).map((set) => set.id);
}
