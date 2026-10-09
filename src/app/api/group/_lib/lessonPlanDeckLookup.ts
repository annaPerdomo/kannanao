import { type getServiceSupabase } from './serviceSupabase';

export interface LessonPlanDeckRow {
  plan_id: string;
  kana_sets: string[] | null;
}

/** A deck copied into another group has its own link row there, so scope any `lesson_plan_decks` lookup to this list or `maybeSingle` errors on >1 match. */
export async function groupPlanIds(
  sb: ReturnType<typeof getServiceSupabase>,
  organizerId: string,
  groupId: string,
): Promise<string[]> {
  const { data } = await sb
    .from('lesson_plans')
    .select('id')
    .eq('organizer_id', organizerId)
    .eq('group_id', groupId);
  return ((data ?? []) as { id: string }[]).map((p) => p.id);
}

export async function findLessonPlanDeck(
  sb: ReturnType<typeof getServiceSupabase>,
  args: { planIds: string[]; deckId: string },
): Promise<LessonPlanDeckRow | null> {
  if (args.planIds.length === 0) return null;
  const { data } = await sb
    .from('lesson_plan_decks')
    .select('plan_id, kana_sets')
    .eq('deck_id', args.deckId)
    .in('plan_id', args.planIds)
    .maybeSingle();
  return (data as LessonPlanDeckRow | null) ?? null;
}
