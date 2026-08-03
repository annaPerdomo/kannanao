import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';

/**
 * Fields that make two assignment rows "the same handout". Kept in step with
 * the key groupAssignments() batches on, so a caught-up learner joins the
 * existing row on the organizer's list instead of starting a new one.
 */
const HANDOUT_FIELDS = [
  'deck_id',
  'title',
  'note',
  'due_date',
  'available_on',
  'required_accuracy',
  'required_mode',
] as const;

interface AssignmentRow {
  deck_id: string;
  title: string | null;
  note: string | null;
  due_date: string | null;
  available_on: string | null;
  required_accuracy: number | null;
  required_mode: string | null;
}

function handoutKey(row: AssignmentRow): string {
  return JSON.stringify(HANDOUT_FIELDS.map((f) => row[f]));
}

/**
 * Gives a learner who just joined the work the group is already doing.
 *
 * Assignments are stored one row per learner, because completion is tracked
 * against them. That means someone who joins on week three used to see an empty
 * assignment list until the organizer noticed and re-assigned every handout by
 * hand — the group's work existed, just not for them. This copies each of the
 * group's still-open handouts once, skipping any the learner already has.
 *
 * Deliberately not copied: handouts whose deadline has already passed. Landing
 * in a new group with a stack of things that are late reads as failure on day
 * one, and the organizer can always re-assign one if it still matters.
 */
export async function catchUpGroupAssignments(
  sb: SupabaseClient,
  args: { groupId: string; organizerId: string; memberId: string; today: string; route: string },
): Promise<number> {
  const { groupId, organizerId, memberId, today, route } = args;

  const columns = `member_id, ${HANDOUT_FIELDS.join(', ')}`;

  const { data: groupRows, error } = await sb
    .from('assignments')
    .select(columns)
    .eq('group_id', groupId)
    .or(`due_date.is.null,due_date.gte.${today}`);

  if (error) {
    logger.warn('Failed to read group assignments for catch-up', { route, error: error.message });
    return 0;
  }

  const rows = (groupRows ?? []) as unknown as (AssignmentRow & { member_id: string })[];
  const mine = new Set(rows.filter((r) => r.member_id === memberId).map(handoutKey));

  const toCreate = new Map<string, AssignmentRow>();
  for (const row of rows) {
    if (row.member_id === memberId) continue;
    const key = handoutKey(row);
    if (mine.has(key) || toCreate.has(key)) continue;
    toCreate.set(key, row);
  }

  if (toCreate.size === 0) return 0;

  const inserts = [...toCreate.values()].map((row) => ({
    organizer_id: organizerId,
    group_id: groupId,
    member_id: memberId,
    deck_id: row.deck_id,
    title: row.title,
    note: row.note,
    due_date: row.due_date,
    available_on: row.available_on,
    required_accuracy: row.required_accuracy,
    required_mode: row.required_mode,
  }));

  const { error: insertError } = await sb.from('assignments').insert(inserts);

  if (insertError) {
    logger.warn('Failed to catch new member up on group assignments', {
      route,
      error: insertError.message,
    });
    return 0;
  }

  logger.info('Caught new member up on group assignments', {
    route,
    groupId,
    memberId,
    count: inserts.length,
  });

  return inserts.length;
}
