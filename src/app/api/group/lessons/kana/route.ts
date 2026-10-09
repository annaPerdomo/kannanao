import { type NextRequest, NextResponse } from 'next/server';

import { isKanaSetId } from '@/lib/kanaCurriculum';
import { LESSON_KANA_MAX, sortKanaSets } from '@/lib/lessonKana';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { assignCompanionKana } from '../../_lib/assignCompanionKana';
import { findLessonPlanDeck, groupPlanIds } from '../../_lib/lessonPlanDeckLookup';
import { memberIdsFor } from '../../_lib/membership';
import { requireGroupAccess } from '../../_lib/requireGroupAccess';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };
const ROUTE = 'PATCH /api/group/lessons/kana';

export async function PATCH(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const { groupId, deckId, kanaSets } = body as Record<string, unknown>;
  if (typeof groupId !== 'string' || typeof deckId !== 'string') {
    return NextResponse.json({ error: 'groupId and deckId are required.' }, { status: 400 });
  }
  if (!Array.isArray(kanaSets) || !kanaSets.every(isKanaSetId)) {
    return NextResponse.json({ error: 'kanaSets must be curriculum row ids.' }, { status: 400 });
  }
  if (kanaSets.length > LESSON_KANA_MAX) {
    return NextResponse.json(
      { error: `A lesson can hold at most ${LESSON_KANA_MAX} sound rows.` },
      { status: 400 },
    );
  }
  const nextSets = sortKanaSets(kanaSets);

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;
  const { organizer, group } = access;

  const sb = getServiceSupabase();

  const planIds = await groupPlanIds(sb, organizer.id, group.id);
  const planDeck = await findLessonPlanDeck(sb, { planIds, deckId });
  if (!planDeck) {
    return NextResponse.json({ error: 'This deck is not part of a lesson.' }, { status: 404 });
  }

  const previousSets = (planDeck.kana_sets as string[] | null) ?? [];
  const addedSets = nextSets.filter((id) => !previousSets.includes(id));
  const removedSets = previousSets.filter((id) => !nextSets.includes(id));

  const { error: updateError } = await sb
    .from('lesson_plan_decks')
    .update({ kana_sets: nextSets })
    .eq('plan_id', planDeck.plan_id)
    .eq('deck_id', deckId);
  if (updateError) {
    logger.error('Failed to save lesson sound rows', { route: ROUTE, error: updateError.message });
    return NextResponse.json({ error: 'Failed to save sound rows.' }, { status: 500 });
  }

  const [{ count: templateCount }, { count: assignmentCount }] = await Promise.all([
    sb
      .from('planned_assignments')
      .select('deck_id', { count: 'exact', head: true })
      .eq('organizer_id', organizer.id)
      .eq('group_id', group.id)
      .eq('deck_id', deckId),
    sb
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('organizer_id', organizer.id)
      .eq('group_id', group.id)
      .eq('deck_id', deckId),
  ]);
  const handedOut = Boolean(templateCount) || Boolean(assignmentCount);

  if (!handedOut) {
    return NextResponse.json({ kanaSets: nextSets, kanaAssigned: [], kanaFailed: [], removed: 0 });
  }

  const { data: template } = await sb
    .from('planned_assignments')
    .select('due_date')
    .eq('organizer_id', organizer.id)
    .eq('group_id', group.id)
    .eq('deck_id', deckId)
    .maybeSingle();
  const dueDate = (template?.due_date as string | null | undefined) ?? null;

  const memberIds = await memberIdsFor({ organizerId: organizer.id, groupId: group.id });

  const kana =
    addedSets.length > 0
      ? await assignCompanionKana({
          sb,
          rows: addedSets.map((setId) => ({ setId, dueDate })),
          organizerId: organizer.id,
          groupId: group.id,
          memberIds,
          route: ROUTE,
        })
      : { assigned: [], failed: [] };

  let removed = 0;
  if (removedSets.length > 0) {
    // Another lesson in this group may still list a removed set — only drop
    // rows for sets no other lesson_plan_decks row in this group still wants.
    const { data: otherDecks } = await sb
      .from('lesson_plan_decks')
      .select('kana_sets')
      .in('plan_id', planIds)
      .neq('deck_id', deckId);
    const stillWanted = new Set<string>();
    for (const row of (otherDecks ?? []) as { kana_sets: string[] | null }[]) {
      for (const setId of row.kana_sets ?? []) stillWanted.add(setId);
    }
    const toDelete = removedSets.filter((setId) => !stillWanted.has(setId));

    const { data: deleted, error: deleteError } =
      toDelete.length > 0
        ? await sb
            .from('assignments')
            .delete()
            .eq('organizer_id', organizer.id)
            .eq('group_id', group.id)
            .is('completed_at', null)
            .in('kana_set', toDelete)
            .select('id')
        : { data: [], error: null };
    if (deleteError) {
      logger.error('Failed to remove lesson sound rows', {
        route: ROUTE,
        error: deleteError.message,
      });
    } else {
      removed = (deleted ?? []).length;
    }
  }

  return NextResponse.json({
    kanaSets: nextSets,
    kanaAssigned: kana.assigned,
    kanaFailed: kana.failed,
    removed,
  });
}
