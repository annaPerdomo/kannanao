import type { useTranslations } from 'next-intl';

/** Relative time in the `Group.timeAgo` vocabulary — pass that namespace's `t`. */
export function timeAgo(dateStr: string | null, t: ReturnType<typeof useTranslations>): string {
  if (!dateStr) return t('never');
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('justNow');
  if (mins < 60) return t('minutesAgo', { mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('hoursAgo', { hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t('yesterday');
  return t('daysAgo', { days });
}
