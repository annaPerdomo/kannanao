import { v4 as uuidv4 } from 'uuid';

import type { OrganizerProfile } from '@/app/api/_lib/requireOrganizerAccount';
import { buildLessonLibrary, rebaseSchedule } from '@/lib/lessonUnits';
import { logger } from '@/lib/logger';
import type { LessonLibrary } from '@/types/lessonUnit';

import { allRows } from './allRows';
import { assignHandout, removeHandout } from './handoutWrites';
import { linkWeekToUnit } from './linkWeekToUnit';
import type { GroupRecord } from './requireGroupAccess';
import { type getServiceSupabase } from './serviceSupabase';

const ROUTE = 'POST /api/group/lessons/[planId]/copy';

export type CopyUnitResult =
  | { status: 'ok'; planId: string; added: number; skipped: { deckId: string; name: string }[] }
  | { status: 'nothing_to_copy' }
  | { status: 'error' };

interface SourceWeek {
  deckId: string;
  deckName: string;
  position: number;
  title: string | null;
  note: string | null;
  dueDate: string | null;
  availableOn: string | null;
  requiredAccuracy: number | null;
  requiredMode: string | null;
}

function toSourceWeeks(
  planDecks: { deck_id: string; position: number }[],
  decks: { id: string; name: string; emoji: string | null }[],
  library: LessonLibrary,
): SourceWeek[] {
  const weekByDeck = new Map(library.units[0]?.weeks.map((w) => [w.deckId, w]) ?? []);
  const deckById = new Map(decks.map((d) => [d.id, d]));

  const weeks: SourceWeek[] = [];
  for (const pd of planDecks) {
    const deck = deckById.get(pd.deck_id);
    if (!deck) continue;
    const week = weekByDeck.get(pd.deck_id);
    weeks.push({
      deckId: pd.deck_id,
      deckName: deck.name,
      position: pd.position,
      title: week?.title ?? null,
      note: week?.note ?? null,
      dueDate: week?.dueDate ?? null,
      availableOn: week?.availableOn ?? null,
      requiredAccuracy: week?.requiredAccuracy ?? null,
      requiredMode: week?.requiredMode ?? null,
    });
  }
  return weeks;
}

/** Per-week schedule/goal come from `buildLessonLibrary`'s view of the source group, so per-week edits carry over. */
async function loadSourceWeeks(
  sb: ReturnType<typeof getServiceSupabase>,
  sourcePlan: { id: string; group_id: string },
  organizerId: string,
): Promise<SourceWeek[]> {
  const planDecks = await allRows<{ deck_id: string; position: number }>((from, to) =>
    sb
      .from('lesson_plan_decks')
      .select('deck_id, position')
      .eq('plan_id', sourcePlan.id)
      .order('position')
      .range(from, to),
  );
  if (planDecks.length === 0) return [];
  const deckIds = planDecks.map((d) => d.deck_id);

  const [decks, templates, assignments] = await Promise.all([
    allRows<{ id: string; name: string; emoji: string | null }>((from, to) =>
      sb
        .from('decks')
        .select('id, name, emoji')
        .eq('user_id', organizerId)
        .in('id', deckIds)
        .range(from, to),
    ),
    allRows<{
      deck_id: string;
      title: string | null;
      note: string | null;
      due_date: string | null;
      available_on: string | null;
      required_accuracy: number | null;
      required_mode: string | null;
    }>((from, to) =>
      sb
        .from('planned_assignments')
        .select('deck_id, title, note, due_date, available_on, required_accuracy, required_mode')
        .eq('group_id', sourcePlan.group_id)
        .in('deck_id', deckIds)
        .range(from, to),
    ),
    allRows<{
      deck_id: string | null;
      title: string | null;
      note: string | null;
      due_date: string | null;
      available_on: string | null;
      required_accuracy: number | null;
      required_mode: string | null;
      completed_at: string | null;
    }>((from, to) =>
      sb
        .from('assignments')
        .select(
          'deck_id, title, note, due_date, available_on, required_accuracy, required_mode, completed_at',
        )
        .eq('group_id', sourcePlan.group_id)
        .in('deck_id', deckIds)
        .range(from, to),
    ),
  ]);

  const library = buildLessonLibrary({
    plans: [{ id: sourcePlan.id, title: null, jlpt_level: null, created_at: '1970-01-01' }],
    planDecks: planDecks.map((pd) => ({ plan_id: sourcePlan.id, ...pd })),
    decks,
    templates,
    assignments,
    today: '9999-99-99',
  });
  return toSourceWeeks(planDecks, decks, library);
}

type HandedOutCheck = 'found' | 'clear' | 'error';

/** Fails closed: a lookup error must block the copy, never silently treat the deck as free to hand out again. */
async function alreadyHandedOut(
  sb: ReturnType<typeof getServiceSupabase>,
  groupId: string,
  deckId: string,
): Promise<HandedOutCheck> {
  const { data: template, error: templateError } = await sb
    .from('planned_assignments')
    .select('deck_id')
    .eq('group_id', groupId)
    .eq('deck_id', deckId)
    .limit(1)
    .maybeSingle();
  if (templateError) return 'error';
  if (template) return 'found';

  const { data: assignment, error: assignmentError } = await sb
    .from('assignments')
    .select('deck_id')
    .eq('group_id', groupId)
    .eq('deck_id', deckId)
    .limit(1)
    .maybeSingle();
  if (assignmentError) return 'error';
  return assignment ? 'found' : 'clear';
}

/** Best-effort: a retry must never leave half a unit behind in the target group. */
async function rollbackCopy(
  sb: ReturnType<typeof getServiceSupabase>,
  organizer: OrganizerProfile,
  targetGroup: GroupRecord,
  planId: string,
  addedDeckIds: string[],
): Promise<void> {
  for (const deckId of addedDeckIds) {
    const { error } = await removeHandout(sb, {
      organizerId: organizer.id,
      groupId: targetGroup.id,
      deckId,
    });
    if (error) {
      logger.error('Rollback: failed to remove a copied handout', { route: ROUTE, deckId, error });
    }
  }
  const { error } = await sb.from('lesson_plans').delete().eq('id', planId);
  if (error) {
    logger.error('Rollback: failed to delete the copied plan', {
      route: ROUTE,
      planId,
      error: error.message,
    });
  }
}

async function assignAndLinkWeek(
  sb: ReturnType<typeof getServiceSupabase>,
  organizer: OrganizerProfile,
  targetGroup: GroupRecord,
  planId: string,
  week: SourceWeek,
  dueDate: string,
  availableOn: string,
): Promise<boolean> {
  const assignResult = await assignHandout(sb, {
    organizerId: organizer.id,
    groupId: targetGroup.id,
    deckId: week.deckId,
    title: week.title,
    note: week.note,
    dueDate,
    availableOn,
    requiredAccuracy: week.requiredAccuracy,
    requiredMode: week.requiredMode,
  });
  if (assignResult.error) {
    logger.error('Failed to copy a handout', {
      route: ROUTE,
      deckId: week.deckId,
      error: assignResult.error,
    });
    return false;
  }

  const link = await linkWeekToUnit(sb, {
    planId,
    deckId: week.deckId,
    position: week.position,
  });
  return link.status === 'ok';
}

/** Never creates decks or cards, never calls Gemini, never touches `decks.lesson_plan_id`. */
export async function copyUnit(args: {
  sb: ReturnType<typeof getServiceSupabase>;
  organizer: OrganizerProfile;
  sourcePlan: { id: string; group_id: string; title: string | null; jlpt_level: string | null };
  targetGroup: GroupRecord;
  firstDueDate: string;
}): Promise<CopyUnitResult> {
  const { sb, organizer, sourcePlan, targetGroup, firstDueDate } = args;

  let weeks: SourceWeek[];
  try {
    weeks = await loadSourceWeeks(sb, sourcePlan, organizer.id);
  } catch (err) {
    logger.error('Failed to load the unit to copy', {
      route: ROUTE,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 'error' };
  }
  if (weeks.length === 0) return { status: 'nothing_to_copy' };

  const rebased = rebaseSchedule(
    weeks.map((w) => ({ dueDate: w.dueDate, availableOn: w.availableOn })),
    firstDueDate,
  );

  const newPlanId = uuidv4();
  const { error: planError } = await sb.from('lesson_plans').insert({
    id: newPlanId,
    group_id: targetGroup.id,
    organizer_id: organizer.id,
    title: sourcePlan.title,
    jlpt_level: sourcePlan.jlpt_level,
  });
  if (planError) {
    logger.error('Failed to create the copied unit', { route: ROUTE, error: planError.message });
    return { status: 'error' };
  }

  const added: string[] = [];
  const skipped: { deckId: string; name: string }[] = [];

  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    const { dueDate, availableOn } = rebased[i];

    const handedOut = await alreadyHandedOut(sb, targetGroup.id, week.deckId);
    if (handedOut === 'error') {
      logger.error('Failed to check whether a deck was already handed out', {
        route: ROUTE,
        deckId: week.deckId,
      });
      await rollbackCopy(sb, organizer, targetGroup, newPlanId, added);
      return { status: 'error' };
    }
    if (handedOut === 'found') {
      skipped.push({ deckId: week.deckId, name: week.deckName });
      continue;
    }

    // Marked added before the write: this week just cleared the duplicate
    // check, so removing it on a later failure is always safe.
    added.push(week.deckId);
    const ok = await assignAndLinkWeek(
      sb,
      organizer,
      targetGroup,
      newPlanId,
      week,
      dueDate,
      availableOn,
    );
    if (!ok) {
      await rollbackCopy(sb, organizer, targetGroup, newPlanId, added);
      return { status: 'error' };
    }
  }

  if (added.length === 0) {
    const { error } = await sb.from('lesson_plans').delete().eq('id', newPlanId);
    if (error) {
      logger.error('Failed to clean up an all-skipped copy', {
        route: ROUTE,
        planId: newPlanId,
        error: error.message,
      });
    }
    return { status: 'nothing_to_copy' };
  }

  return { status: 'ok', planId: newPlanId, added: added.length, skipped };
}
