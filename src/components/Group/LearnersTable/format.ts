import type { useTranslations } from 'next-intl';

import type { GroupMember } from '@/hooks/useGroup';

import { accuracyFraction } from './derive';

type T = ReturnType<typeof useTranslations>;

export function streakLabel(member: Pick<GroupMember, 'streakDays'>, t: T): string {
  return member.streakDays > 0
    ? `🔥 ${t('streakValue', { count: member.streakDays })}`
    : t('noStreak');
}

export function cardsLabel(member: Pick<GroupMember, 'totalCardsStudied'>): string {
  return member.totalCardsStudied.toLocaleString();
}

export function accuracyLabel(
  member: Pick<GroupMember, 'totalCorrect' | 'totalCardsStudied'>,
  t: T,
): string {
  const fraction = accuracyFraction(member);
  return fraction === null
    ? t('noAccuracy')
    : t('accuracyValue', { pct: Math.round(fraction * 100) });
}

/** Word-labeled variant for the mobile/compact meta line, which has no column headers. */
export function cardsStudiedLabel(member: Pick<GroupMember, 'totalCardsStudied'>, t: T): string {
  return t('cardsStudiedCompact', { count: member.totalCardsStudied });
}

export function accuracyCompactLabel(
  member: Pick<GroupMember, 'totalCorrect' | 'totalCardsStudied'>,
  t: T,
): string {
  const fraction = accuracyFraction(member);
  return fraction === null
    ? t('noAccuracy')
    : t('accuracyCompact', { pct: Math.round(fraction * 100) });
}
