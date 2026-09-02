import type { GroupKanaCoverage } from '@/lib/kanaChartPrintable';
import { isKanaKnown, type KanaMastery } from '@/lib/kanaProficiency';

import { allRows } from './allRows';
import { memberIdsFor } from './membership';
import { getServiceSupabase } from './serviceSupabase';

interface KanaProgressRow {
  kana: string;
  correct_count: number | null;
  wrong_count: number | null;
}

/** Counts only: the chart this feeds is a wall chart, so no learner is ever identified. */
export async function getGroupKanaCoverage(
  groupId: string,
  organizerId: string,
): Promise<GroupKanaCoverage> {
  const rosterIds = await memberIdsFor({ organizerId, groupId });
  if (rosterIds.length === 0) return { learnerCount: 0, knownByKana: {} };

  const sb = getServiceSupabase();
  const progressRows = await allRows<KanaProgressRow>((from, to) =>
    sb
      .from('kana_progress')
      .select('kana, correct_count, wrong_count')
      .in('user_id', rosterIds)
      .order('user_id', { ascending: true })
      .order('kana', { ascending: true })
      .range(from, to),
  );

  const knownByKana: Record<string, number> = {};
  for (const row of progressRows) {
    const mastery: KanaMastery = {
      correctCount: row.correct_count ?? 0,
      wrongCount: row.wrong_count ?? 0,
    };
    if (!isKanaKnown(mastery)) continue;
    knownByKana[row.kana] = (knownByKana[row.kana] ?? 0) + 1;
  }

  return { learnerCount: rosterIds.length, knownByKana };
}
