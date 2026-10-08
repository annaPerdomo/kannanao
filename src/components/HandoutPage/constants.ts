import type { GroupWordInsight } from '@/lib/handoutWords';

export type WordFilter = 'all' | 'tricky' | 'unseen' | 'strong';

export const WORD_FILTERS: WordFilter[] = ['all', 'tricky', 'unseen', 'strong'];

export function matchesFilter(
  insight: GroupWordInsight,
  filter: WordFilter,
  learnerCount: number,
): boolean {
  if (filter === 'tricky') return insight.trickyCount > 0;
  if (filter === 'unseen') return insight.seenCount === 0;
  if (filter === 'strong') return learnerCount > 0 && insight.strongCount > learnerCount / 2;
  return true;
}

export interface ViewMember {
  id: string;
  name: string;
}
