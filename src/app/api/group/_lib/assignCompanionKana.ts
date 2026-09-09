import type { SupabaseClient } from '@supabase/supabase-js';

import { setCharacters } from '@/lib/kanaCurriculum';
import { logger } from '@/lib/logger';

import { upsertKanaAssignments } from './upsertKanaAssignments';

export interface CompanionKanaRow {
  setId: string;
  dueDate: string | null;
}

interface AssignCompanionKanaArgs {
  sb: SupabaseClient;
  rows: CompanionKanaRow[];
  organizerId: string;
  groupId: string;
  memberIds: string[];
  requiredAccuracy?: number | null;
  route: string;
}

/**
 * The one writer for kana rows. `updateExisting: false`, so a re-run never
 * overwrites a row the organizer edited or a learner completed.
 */
export async function assignCompanionKana(
  args: AssignCompanionKanaArgs,
): Promise<{ assigned: string[]; failed: string[] }> {
  if (args.rows.length === 0 || args.memberIds.length === 0) {
    return { assigned: [], failed: [] };
  }

  const assigned: string[] = [];
  const failed: string[] = [];

  for (const row of args.rows) {
    const fields = {
      title: (setCharacters(row.setId) ?? row.setId).slice(0, 200),
      note: null,
      due_date: row.dueDate,
      // Reading practice opens at once rather than a week before its own due
      // date like the decks do: it is needed for week 1, not saved for later.
      available_on: null,
      required_accuracy: args.requiredAccuracy ?? null,
      required_mode: null,
    };

    const { error } = await upsertKanaAssignments(args.sb, {
      groupId: args.groupId,
      kanaSet: row.setId,
      memberIds: args.memberIds,
      rows: args.memberIds.map((memberId) => ({
        organizer_id: args.organizerId,
        group_id: args.groupId,
        member_id: memberId,
        deck_id: null,
        kana_set: row.setId,
        ...fields,
      })),
      fields,
      updateExisting: false,
    });

    if (error) {
      logger.error('Failed to assign a companion kana row', {
        route: args.route,
        groupId: args.groupId,
        kanaSet: row.setId,
        error: error.message,
      });
      failed.push(row.setId);
      continue;
    }
    assigned.push(row.setId);
  }

  return { assigned, failed };
}
