import type { useTranslations } from 'next-intl';

const MS_PER_DAY = 86_400_000;

/** UTC on purpose: `available_on` is a plain date compared as a string, so local time would drift near midnight. */
export function todayIso(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A bare 'YYYY-MM-DD' is built from its own parts, so a negative UTC offset can't roll it back a day. */
export function formatDate(iso: string, locale?: string): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (!PLAIN_DATE.test(iso)) return new Date(iso).toLocaleDateString(locale, options);
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, options);
}

export type DueBucket = 'overdue' | 'today' | 'tomorrow' | 'later';

/**
 * Ceiling, not floor: a deadline later tonight is "due today", not overdue.
 * Every deadline surface rounds here so they can't disagree on days remaining.
 */
export function daysUntilDue(dueDate: string, now = Date.now()): number {
  return Math.ceil((new Date(dueDate).getTime() - now) / MS_PER_DAY);
}

export function dueBucket(days: number): DueBucket {
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return 'later';
}

/** Badge text, from the `Group.assignmentCard` namespace. */
export function dueDateLabel(
  dueDate: string | null,
  t: ReturnType<typeof useTranslations>,
): string {
  if (!dueDate) return '';
  const days = daysUntilDue(dueDate);
  switch (dueBucket(days)) {
    case 'overdue':
      return t('overdueBy', { days: Math.abs(days) });
    case 'today':
      return t('dueToday');
    case 'tomorrow':
      return t('dueTomorrow');
    default:
      return t('dueInDays', { days });
  }
}
