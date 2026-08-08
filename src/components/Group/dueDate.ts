import type { useTranslations } from 'next-intl';

const MS_PER_DAY = 86_400_000;

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
