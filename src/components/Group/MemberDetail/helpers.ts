'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { MemberDetail } from '@/hooks/useGroup';
import type { HandoutRef } from '@/types/handout';

import { formatDate as formatDateShared } from '../dueDate';

export function handoutRefFromItem(item: MemberDetail['assignments']['items'][number]): HandoutRef {
  return {
    deckId: item.deckId,
    kanaSet: item.kanaSet,
    name: item.title || item.deckName,
    emoji: item.deckEmoji,
    note: item.note,
    availableOn: item.availableOn,
    dueDate: item.dueDate,
    requiredAccuracy: item.requiredAccuracy,
    requiredMode: item.requiredMode,
  };
}

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
        return formatDateShared(dateStr, locale);
      },
    }),
    [t, locale],
  );
}
