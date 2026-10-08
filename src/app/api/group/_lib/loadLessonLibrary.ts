import { todayIso } from '@/components/Group/dueDate';
import { buildLessonLibrary } from '@/lib/lessonUnits';
import type { LessonLibrary } from '@/types/lessonUnit';

import { allRows } from './allRows';
import { type getServiceSupabase } from './serviceSupabase';

const ASSIGNMENT_COLUMNS =
  'deck_id, title, note, due_date, available_on, required_accuracy, required_mode, completed_at';

interface PlanRow {
  id: string;
  title: string | null;
  jlpt_level: string | null;
  created_at: string;
}
interface PlanDeckRow {
  plan_id: string;
  deck_id: string;
  position: number;
  kana_sets: string[] | null;
}
interface TemplateRow {
  deck_id: string;
  title: string | null;
  note: string | null;
  due_date: string | null;
  available_on: string | null;
  required_accuracy: number | null;
  required_mode: string | null;
}
interface AssignmentRow extends Omit<TemplateRow, 'deck_id'> {
  deck_id: string | null;
  completed_at: string | null;
}

export async function loadLessonLibrary(
  sb: ReturnType<typeof getServiceSupabase>,
  organizerId: string,
  groupId: string,
): Promise<LessonLibrary> {
  const plans = await allRows<PlanRow>((from, to) =>
    sb
      .from('lesson_plans')
      .select('id, title, jlpt_level, created_at')
      .eq('organizer_id', organizerId)
      .eq('group_id', groupId)
      .order('id')
      .range(from, to),
  );
  const planIds = plans.map((p) => p.id);

  const [planDecks, templates, assignments] = await Promise.all([
    planIds.length
      ? allRows<PlanDeckRow>((from, to) =>
          sb
            .from('lesson_plan_decks')
            .select('plan_id, deck_id, position, kana_sets')
            .in('plan_id', planIds)
            .order('plan_id')
            .order('deck_id')
            .range(from, to),
        )
      : Promise.resolve([]),
    allRows<TemplateRow>((from, to) =>
      sb
        .from('planned_assignments')
        .select('deck_id, title, note, due_date, available_on, required_accuracy, required_mode')
        .eq('group_id', groupId)
        .order('deck_id')
        .range(from, to),
    ),
    allRows<AssignmentRow>((from, to) =>
      sb
        .from('assignments')
        .select(ASSIGNMENT_COLUMNS)
        .eq('group_id', groupId)
        .order('member_id')
        .order('deck_id')
        .range(from, to),
    ),
  ]);

  // Loose handouts (single decks, Quizlet imports) have a template or
  // assignment but no plan_decks row, so the deck lookup must cover them too.
  const deckIds = [
    ...new Set([
      ...planDecks.map((pd) => pd.deck_id),
      ...templates.map((t) => t.deck_id),
      ...assignments.filter((a) => a.deck_id).map((a) => a.deck_id as string),
    ]),
  ];

  const decks = deckIds.length
    ? await allRows((from, to) =>
        sb
          .from('decks')
          .select('id, name, emoji')
          .eq('user_id', organizerId)
          .in('id', deckIds)
          .order('id')
          .range(from, to),
      )
    : [];

  const ownedIds = (decks as { id: string }[]).map((d) => d.id);

  const cardRows = ownedIds.length
    ? await allRows<{ deck_id: string }>((from, to) =>
        sb.from('cards').select('deck_id').in('deck_id', ownedIds).order('id').range(from, to),
      )
    : [];
  const cardCounts: Record<string, number> = {};
  for (const row of cardRows) {
    cardCounts[row.deck_id] = (cardCounts[row.deck_id] ?? 0) + 1;
  }

  return buildLessonLibrary({
    plans,
    planDecks,
    decks: decks as { id: string; name: string; emoji: string | null }[],
    cardCounts,
    templates,
    assignments,
    today: todayIso(),
  });
}
