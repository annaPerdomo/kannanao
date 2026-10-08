'use client';
import { useGroups } from '@/hooks/useGroups';

import { TeachingToday } from './TeachingToday';

/** Own `useGroups()` fetch, independent of Home's hideable "groups" section (that toggle is for the pinned-decks grid only). */
export function TeachingTodayCard() {
  const { groups } = useGroups(true);
  return <TeachingToday groups={groups} />;
}
