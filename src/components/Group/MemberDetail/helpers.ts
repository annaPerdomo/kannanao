'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

/**
 * Locale-aware date/duration formatters shared by the MemberDetail sections.
 * Keys live under Group.memberDetail so every section renders the same way.
 */
export function useMemberFormatters() {
  const t = useTranslations('Group.memberDetail');
  const locale = useLocale();

  return useMemo(
    () => ({
      formatDuration(secs: number | null): string {
        if (!secs) return '--';
        if (secs < 60) return t('durationSeconds', { secs });
        return t('durationMinutes', { mins: Math.floor(secs / 60) });
      },
      formatDate(dateStr: string | null): string {
        if (!dateStr) return t('never');
        return new Date(dateStr).toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
        });
      },
    }),
    [t, locale],
  );
}
