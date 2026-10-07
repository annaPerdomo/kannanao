import type { OrganizerProfile } from '@/app/api/_lib/requireOrganizerAccount';
import { logger } from '@/lib/logger';

import { assignHandout, updateHandout } from './handoutWrites';
import { linkWeekToUnit } from './linkWeekToUnit';
import type { GroupRecord } from './requireGroupAccess';
import { type getServiceSupabase } from './serviceSupabase';

const DECK_NAME_MAX = 200;

export type AddDeckWeekResult =
  | { status: 'ok'; deckId: string }
  | { status: 'not_found' | 'already_in_unit' | 'conflict' | 'error' };

async function isAlreadyInGroupUnit(
  sb: ReturnType<typeof getServiceSupabase>,
  groupId: string,
  deckId: string,
): Promise<boolean> {
  const { data: groupPlans } = await sb.from('lesson_plans').select('id').eq('group_id', groupId);
  const groupPlanIds = ((groupPlans ?? []) as { id: string }[]).map((p) => p.id);
  if (groupPlanIds.length === 0) return false;

  const { data: existingLinks } = await sb
    .from('lesson_plan_decks')
    .select('deck_id')
    .eq('deck_id', deckId)
    .in('plan_id', groupPlanIds)
    .limit(1);
  return (existingLinks ?? []).length > 0;
}

/** A deck with assignments but no template (predates this table, or a missed upsert) gets the template backfilled from one assignment row first. */
async function scheduleExistingDeck(args: {
  sb: ReturnType<typeof getServiceSupabase>;
  organizer: OrganizerProfile;
  group: GroupRecord;
  deckId: string;
  deckName: string;
  dueDate: string | null;
  availableOn: string | null;
}): Promise<{ error: string | null }> {
  const { sb, organizer, group, deckId, deckName, dueDate, availableOn } = args;

  const { count: templateCount } = await sb
    .from('planned_assignments')
    .select('deck_id', { count: 'exact', head: true })
    .eq('organizer_id', organizer.id)
    .eq('group_id', group.id)
    .eq('deck_id', deckId);

  const { data: anyAssignment } = await sb
    .from('assignments')
    .select('title, note, required_accuracy, required_mode')
    .eq('organizer_id', organizer.id)
    .eq('group_id', group.id)
    .eq('deck_id', deckId)
    .limit(1)
    .maybeSingle();

  if (!templateCount && !anyAssignment) {
    return assignHandout(sb, {
      organizerId: organizer.id,
      groupId: group.id,
      deckId,
      title: deckName,
      note: null,
      dueDate,
      availableOn,
      requiredAccuracy: null,
      requiredMode: null,
    });
  }

  if (!templateCount && anyAssignment) {
    const { error: backfillError } = await sb.from('planned_assignments').upsert(
      {
        organizer_id: organizer.id,
        group_id: group.id,
        deck_id: deckId,
        title: anyAssignment.title,
        note: anyAssignment.note,
        due_date: dueDate,
        available_on: availableOn,
        required_accuracy: anyAssignment.required_accuracy,
        required_mode: anyAssignment.required_mode,
      },
      { onConflict: 'group_id,deck_id' },
    );
    if (backfillError) return { error: backfillError.message };
  }

  return updateHandout(sb, {
    organizerId: organizer.id,
    groupId: group.id,
    deckId,
    patch: { dueDate, availableOn },
  });
}

/** Nothing is created here, so a failed link insert needs no rollback — it's safely retryable as-is. */
export async function addDeckWeek(args: {
  sb: ReturnType<typeof getServiceSupabase>;
  organizer: OrganizerProfile;
  group: GroupRecord;
  planId: string;
  deckId: string;
  nextPosition: number;
  dueDate: string | null;
  availableOn: string | null;
}): Promise<AddDeckWeekResult> {
  const { sb, organizer, group, planId, deckId, nextPosition, dueDate, availableOn } = args;

  const { data: deck, error: deckError } = await sb
    .from('decks')
    .select('id, name')
    .eq('id', deckId)
    .eq('user_id', organizer.id)
    .single();
  if (deckError || !deck) return { status: 'not_found' };

  if (await isAlreadyInGroupUnit(sb, group.id, deckId)) {
    return { status: 'already_in_unit' };
  }

  const { error: writeError } = await scheduleExistingDeck({
    sb,
    organizer,
    group,
    deckId,
    deckName: (deck.name as string).slice(0, DECK_NAME_MAX),
    dueDate,
    availableOn,
  });
  if (writeError) {
    logger.error('Failed to schedule the new week', {
      route: 'POST /api/group/lessons/[planId]/weeks',
      error: writeError,
    });
    return { status: 'error' };
  }

  const link = await linkWeekToUnit(sb, { planId, deckId, position: nextPosition });
  if (link.status !== 'ok') return { status: link.status };

  return { status: 'ok', deckId };
}
