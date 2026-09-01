import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';

const GOAL_FIELDS = [
  'title',
  'note',
  'due_date',
  'available_on',
  'required_accuracy',
  'required_mode',
] as const;

/**
 * Fields that make two assignment rows "the same handout". Kept in step with
 * the key groupAssignments() batches on, so a caught-up learner joins the
 * existing row on the organizer's list instead of starting a new one.
 */
const HANDOUT_FIELDS = ['deck_id', ...GOAL_FIELDS] as const;

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

/** Soonest deadline first; an open-ended handout sorts last. */
function byDueDate(a: { due_date: string | null }, b: { due_date: string | null }): number {
  if (a.due_date === b.due_date) return 0;
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return a.due_date < b.due_date ? -1 : 1;
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
 * A group set up before anyone joined has no handouts to copy — its schedule
 * lives in `planned_assignments`. Those templates are the weakest source: a
 * live handout for the same deck wins, since real work drifts from the plan.
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
    // Deck handouts only; kana rows are caught up by catchUpKana() below.
    .not('deck_id', 'is', null)
    .or(`due_date.is.null,due_date.gte.${today}`);

  if (error) {
    logger.warn('Failed to read group assignments for catch-up', { route, error: error.message });
    return 0;
  }

  const { data: plannedRows, error: plannedError } = await sb
    .from('planned_assignments')
    .select(HANDOUT_FIELDS.join(', '))
    .eq('group_id', groupId)
    .or(`due_date.is.null,due_date.gte.${today}`);

  if (plannedError) {
    // Real handouts can still be copied; only the plan-ahead schedule is lost.
    logger.warn('Failed to read planned schedule for catch-up', {
      route,
      error: plannedError.message,
    });
  }

  const rows = (groupRows ?? []) as unknown as (AssignmentRow & { member_id: string })[];
  const templates = [...((plannedRows ?? []) as unknown as AssignmentRow[])].sort(byDueDate);
  const mine = new Set(rows.filter((r) => r.member_id === memberId).map(handoutKey));
  const myDecks = new Set(rows.filter((r) => r.member_id === memberId).map((r) => r.deck_id));

  /**
   * One row per deck, because `UNIQUE(member_id, deck_id, group_id)` allows no
   * more. A group can hold two drifted handouts of the same deck — updateAssignments
   * PATCHes each member's copy separately and tolerates partial failure — and
   * inserting both fails the whole batch, leaving the joiner with nothing.
   */
  const toCreate = new Map<string, AssignmentRow>();
  for (const row of [...rows].sort(byDueDate)) {
    if (row.member_id === memberId) continue;
    if (mine.has(handoutKey(row)) || myDecks.has(row.deck_id)) continue;
    if (toCreate.has(row.deck_id)) continue;
    toCreate.set(row.deck_id, row);
  }
  for (const template of templates) {
    if (mine.has(handoutKey(template)) || myDecks.has(template.deck_id)) continue;
    if (toCreate.has(template.deck_id)) continue;
    toCreate.set(template.deck_id, template);
  }

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

  let created = 0;

  if (inserts.length > 0) {
    // Upsert, not insert: a join racing this one collides, and an insert would
    // roll back every other handout in the batch.
    const { error: insertError } = await sb
      .from('assignments')
      .upsert(inserts, { onConflict: 'member_id,deck_id,group_id', ignoreDuplicates: true });

    if (insertError) {
      logger.warn('Failed to catch new member up on group assignments', {
        route,
        error: insertError.message,
      });
    } else {
      created += inserts.length;
    }
  }

  // Its own statement: kana rows key on a partial index the deck upsert's ON
  // CONFLICT cannot name, and failing here must not cost the deck handouts.
  created += await catchUpKana(sb, { groupId, organizerId, memberId, today, route });

  if (created === 0) return 0;

  logger.info('Caught new member up on group assignments', {
    route,
    groupId,
    memberId,
    count: created,
  });

  return created;
}

interface KanaRow extends Omit<AssignmentRow, 'deck_id'> {
  member_id: string;
  kana_set: string;
}

async function catchUpKana(
  sb: SupabaseClient,
  args: { groupId: string; organizerId: string; memberId: string; today: string; route: string },
): Promise<number> {
  const { groupId, organizerId, memberId, today, route } = args;

  const { data, error } = await sb
    .from('assignments')
    .select(`member_id, kana_set, ${GOAL_FIELDS.join(', ')}`)
    .eq('group_id', groupId)
    .not('kana_set', 'is', null)
    .or(`due_date.is.null,due_date.gte.${today}`);

  if (error) {
    logger.warn('Failed to read group kana assignments for catch-up', {
      route,
      error: error.message,
    });
    return 0;
  }

  const rows = (data ?? []) as unknown as KanaRow[];
  const mine = new Set(rows.filter((r) => r.member_id === memberId).map((r) => r.kana_set));

  const toCreate = new Map<string, KanaRow>();
  for (const row of [...rows].sort(byDueDate)) {
    if (row.member_id === memberId || mine.has(row.kana_set)) continue;
    if (toCreate.has(row.kana_set)) continue;
    toCreate.set(row.kana_set, row);
  }

  if (toCreate.size === 0) return 0;

  const inserts = [...toCreate.values()].map((row) => ({
    organizer_id: organizerId,
    group_id: groupId,
    member_id: memberId,
    deck_id: null,
    kana_set: row.kana_set,
    title: row.title,
    note: row.note,
    due_date: row.due_date,
    available_on: row.available_on,
    required_accuracy: row.required_accuracy,
    required_mode: row.required_mode,
  }));

  const { error: insertError } = await sb.from('assignments').insert(inserts);

  if (insertError) {
    logger.warn('Failed to catch new member up on group kana assignments', {
      route,
      error: insertError.message,
    });
    return 0;
  }

  return inserts.length;
}
