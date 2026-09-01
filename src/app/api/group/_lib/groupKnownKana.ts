import { allKana } from '@/lib/kanaCurriculum';
import {
  type GroupKanaReadiness,
  KANA_SIGNAL_MIN_ANSWERS,
  type KanaGroupMember,
} from '@/lib/kanaGaps';
import { isKanaKnown, type KanaMastery } from '@/lib/kanaProficiency';

import { allRows } from './allRows';
import { memberIdsFor } from './membership';
import { getServiceSupabase } from './serviceSupabase';

interface KanaProgressRow {
  user_id: string;
  kana: string;
  correct_count: number | null;
  wrong_count: number | null;
}

export async function getGroupKnownKana(
  groupId: string,
  organizerId: string,
): Promise<GroupKanaReadiness> {
  const sb = getServiceSupabase();
  const rosterIds = await memberIdsFor({ organizerId, groupId });
  if (rosterIds.length === 0) return { members: [], shakyBy: {} };

  const [profileRows, progressRows] = await Promise.all([
    allRows<{ id: string; username: string | null; display_name: string | null }>((from, to) =>
      sb
        .from('profiles')
        .select('id, username, display_name')
        .in('id', rosterIds)
        .order('created_at', { ascending: true })
        // created_at is not unique: without a tiebreak a row can repeat or
        // vanish across a page boundary, and shakyBy indexes into this list.
        .order('id', { ascending: true })
        .range(from, to),
    ),
    allRows<KanaProgressRow>((from, to) =>
      sb
        .from('kana_progress')
        .select('user_id, kana, correct_count, wrong_count')
        .in('user_id', rosterIds)
        .order('user_id', { ascending: true })
        .order('kana', { ascending: true })
        .range(from, to),
    ),
  ]);

  const answersByMember = new Map<string, number>();
  const knownByMember = new Map<string, Set<string>>();

  for (const row of progressRows) {
    const mastery: KanaMastery = {
      correctCount: row.correct_count ?? 0,
      wrongCount: row.wrong_count ?? 0,
    };
    answersByMember.set(
      row.user_id,
      (answersByMember.get(row.user_id) ?? 0) + mastery.correctCount + mastery.wrongCount,
    );
    if (!isKanaKnown(mastery)) continue;
    const known = knownByMember.get(row.user_id) ?? new Set<string>();
    known.add(row.kana);
    knownByMember.set(row.user_id, known);
  }

  const members: KanaGroupMember[] = profileRows.map((profile) => ({
    id: profile.id,
    name: profile.display_name?.trim() || profile.username || '',
    started: (answersByMember.get(profile.id) ?? 0) >= KANA_SIGNAL_MIN_ANSWERS,
  }));

  // Untried members are excluded from the judgement entirely: counting their
  // absent rows as gaps would flag every character in every plan.
  const startedIndexes = members.flatMap((m, i) => (m.started ? [i] : []));
  const shakyBy: Record<string, number[]> = {};
  for (const kana of startedIndexes.length > 0 ? allKana() : []) {
    const behind = startedIndexes.filter((i) => !knownByMember.get(members[i].id)?.has(kana));
    if (behind.length > 0) shakyBy[kana] = behind;
  }

  return { members, shakyBy };
}
