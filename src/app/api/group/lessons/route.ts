import { type NextRequest, NextResponse } from 'next/server';

import { todayIso } from '@/components/Group/dueDate';
import { buildLessonLibrary } from '@/lib/lessonUnits';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { allRows } from '../_lib/allRows';
import { requireGroupAccess } from '../_lib/requireGroupAccess';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 60 };

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

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const groupId = req.nextUrl.searchParams.get('groupId');
  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });
  }

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;
  const { organizer, group } = access;

  const sb = getServiceSupabase();

  try {
    const plans = await allRows<PlanRow>((from, to) =>
      sb
        .from('lesson_plans')
        .select('id, title, jlpt_level, created_at')
        .eq('organizer_id', organizer.id)
        .eq('group_id', group.id)
        .order('id')
        .range(from, to),
    );
    const planIds = plans.map((p) => p.id);

    const [planDecks, templates, assignments] = await Promise.all([
      planIds.length
        ? allRows<PlanDeckRow>((from, to) =>
            sb
              .from('lesson_plan_decks')
              .select('plan_id, deck_id, position')
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
          .eq('group_id', group.id)
          .order('deck_id')
          .range(from, to),
      ),
      allRows<AssignmentRow>((from, to) =>
        sb
          .from('assignments')
          .select(ASSIGNMENT_COLUMNS)
          .eq('group_id', group.id)
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
            .eq('user_id', organizer.id)
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

    const library = buildLessonLibrary({
      plans,
      planDecks,
      decks: decks as { id: string; name: string; emoji: string | null }[],
      cardCounts,
      templates,
      assignments,
      today: todayIso(),
    });

    return NextResponse.json(library);
  } catch (err) {
    logger.error('Failed to load lesson library', {
      route: 'GET /api/group/lessons',
      groupId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Could not load your lessons.' }, { status: 500 });
  }
}
