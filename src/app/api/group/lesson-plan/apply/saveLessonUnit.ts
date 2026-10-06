import { logger } from '@/lib/logger';
import type { ApplyDeckResult } from '@/types/lessonPlan';

import { getServiceSupabase } from '../../_lib/serviceSupabase';

const ROUTE = 'POST /api/group/lesson-plan/apply';

/** ignoreDuplicates: a resumed apply must never overwrite a title the teacher already edited. */
export async function saveLessonPlanRow(args: {
  planId: string;
  organizerId: string;
  groupId: string;
  title?: string;
  level?: string | null;
}): Promise<boolean> {
  const title = (args.title ?? '').trim().slice(0, 80) || null;
  const sb = getServiceSupabase();
  const { error } = await sb.from('lesson_plans').upsert(
    {
      id: args.planId,
      organizer_id: args.organizerId,
      group_id: args.groupId,
      title,
      jlpt_level: args.level ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  if (error) {
    logger.error('Failed to save lesson plan', {
      route: ROUTE,
      planId: args.planId,
      error: error.message,
    });
    return false;
  }

  const { data: row, error: selectError } = await sb
    .from('lesson_plans')
    .select('organizer_id, group_id')
    .eq('id', args.planId)
    .maybeSingle();

  if (selectError || !row) {
    logger.error('Failed to verify lesson plan ownership', {
      route: ROUTE,
      planId: args.planId,
      error: selectError?.message,
    });
    return false;
  }

  if (row.organizer_id !== args.organizerId || row.group_id !== args.groupId) {
    logger.warn('Lesson plan id collided with a row owned by a different organizer or group', {
      route: ROUTE,
      planId: args.planId,
    });
    return false;
  }

  return true;
}

export async function saveLessonPlanDecks(args: {
  planId: string;
  results: ApplyDeckResult[];
}): Promise<void> {
  const rows = args.results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => result.deckId)
    .map(({ result, index }) => ({
      plan_id: args.planId,
      deck_id: result.deckId as string,
      position: index,
    }));

  if (rows.length === 0) return;

  const { error } = await getServiceSupabase()
    .from('lesson_plan_decks')
    .upsert(rows, { onConflict: 'plan_id,deck_id' });

  if (error) {
    logger.error('Failed to save lesson plan decks', {
      route: ROUTE,
      planId: args.planId,
      error: error.message,
    });
  }
}
