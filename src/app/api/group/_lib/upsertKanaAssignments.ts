import type { SupabaseClient } from '@supabase/supabase-js';

interface AssignmentFields {
  title: string | null;
  note: string | null;
  due_date: string | null;
  available_on: string | null;
  required_accuracy: number | null;
  required_mode: string | null;
}

interface Result {
  data: unknown[] | null;
  error: { message: string } | null;
}

/**
 * Read-then-write rather than an upsert: kana uniqueness lives in a partial
 * index, and PostgREST emits a bare `ON CONFLICT (cols)` that Postgres will not
 * infer a partial index from. Updates touch only the goal fields, so a
 * re-assign leaves `completed_at` standing.
 */
export async function upsertKanaAssignments(
  sb: SupabaseClient,
  args: {
    groupId: string;
    kanaSet: string;
    memberIds: string[];
    rows: Record<string, unknown>[];
    fields: AssignmentFields;
    /**
     * False leaves existing rows untouched. The update branch overwrites every
     * goal field, so a caller that assigns as a side effect of something else
     * would wipe a note or due date the organizer set by hand.
     */
    updateExisting?: boolean;
  },
): Promise<Result> {
  const { groupId, kanaSet, memberIds, rows, fields, updateExisting = true } = args;

  const { data: existing, error: findError } = await sb
    .from('assignments')
    .select('member_id')
    .eq('group_id', groupId)
    .eq('kana_set', kanaSet)
    .in('member_id', memberIds);
  if (findError) return { data: null, error: findError };

  const have = new Set((existing ?? []).map((r) => r.member_id as string));
  const saved: unknown[] = [];

  if (updateExisting && have.size > 0) {
    const { data, error } = await sb
      .from('assignments')
      .update(fields)
      .eq('group_id', groupId)
      .eq('kana_set', kanaSet)
      .in('member_id', [...have])
      .select();
    if (error) return { data: null, error };
    saved.push(...(data ?? []));
  }

  const inserts = rows.filter((r) => !have.has(r.member_id as string));
  if (inserts.length > 0) {
    const { data, error } = await sb.from('assignments').insert(inserts).select();
    if (error) return { data: null, error };
    saved.push(...(data ?? []));
  }

  return { data: saved, error: null };
}
