import { type NextRequest, NextResponse } from 'next/server';

import { todayIso } from '@/components/Group/dueDate';
import { nextWeekDates } from '@/lib/lessonUnits';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../../../_lib/requireOrganizerAccount';
import { addDeckWeek, type AddDeckWeekResult } from '../../../_lib/addDeckWeek';
import { requireGroupAccess } from '../../../_lib/requireGroupAccess';
import {
  buildReviewWeek,
  type BuildReviewWeekResult,
  clampReviewCardCount,
} from '../../../_lib/reviewWeek';
import { getServiceSupabase } from '../../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 10 };
const REVIEW_CARDS_DEFAULT = 30;

interface PlanDeckRow {
  deck_id: string;
  position: number;
}

function respond(result: AddDeckWeekResult | BuildReviewWeekResult) {
  switch (result.status) {
    case 'ok':
      return NextResponse.json({ deckId: result.deckId });
    case 'not_found':
      return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
    case 'already_in_unit':
      return NextResponse.json({ error: 'already_in_unit' }, { status: 409 });
    case 'conflict':
      return NextResponse.json({ error: 'conflict' }, { status: 409 });
    case 'no_cards':
      return NextResponse.json({ error: 'This unit has no cards to review yet.' }, { status: 400 });
    default:
      return NextResponse.json({ error: 'Failed to add the week.' }, { status: 500 });
  }
}

async function loadPlanDecks(
  sb: ReturnType<typeof getServiceSupabase>,
  planId: string,
): Promise<PlanDeckRow[] | null> {
  const { data, error } = await sb
    .from('lesson_plan_decks')
    .select('deck_id, position')
    .eq('plan_id', planId)
    .order('position');
  if (error) {
    logger.error('Failed to load unit weeks', {
      route: 'POST /api/group/lessons/[planId]/weeks',
      error: error.message,
    });
    return null;
  }
  return (data ?? []) as PlanDeckRow[];
}

async function lastWeekDueDate(
  sb: ReturnType<typeof getServiceSupabase>,
  groupId: string,
  planDecks: PlanDeckRow[],
): Promise<string | null> {
  const lastDeck = planDecks[planDecks.length - 1];
  if (!lastDeck) return null;
  const { data: template } = await sb
    .from('planned_assignments')
    .select('due_date')
    .eq('group_id', groupId)
    .eq('deck_id', lastDeck.deck_id)
    .maybeSingle();
  return (template?.due_date as string | undefined) ?? null;
}

/**
 * POST — add a week to the end of a unit, either an existing deck (adopted as
 * a handout, or linked in place if already one) or a freshly built review deck
 * weighted toward this group's tricky words. Never calls Gemini.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { planId } = await params;
  const sb = getServiceSupabase();

  const { data: plan } = await sb
    .from('lesson_plans')
    .select('id, organizer_id, group_id, title')
    .eq('id', planId)
    .eq('organizer_id', orgCheck.id)
    .single();
  if (!plan) {
    return NextResponse.json({ error: 'Lesson plan not found.' }, { status: 404 });
  }

  const access = await requireGroupAccess(req, plan.group_id);
  if (access instanceof NextResponse) return access;
  const { organizer, group } = access;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  if (b.kind !== 'deck' && b.kind !== 'review') {
    return NextResponse.json({ error: 'kind must be "deck" or "review".' }, { status: 400 });
  }

  const planDecks = await loadPlanDecks(sb, planId);
  if (planDecks === null) {
    return NextResponse.json({ error: 'Failed to add the week.' }, { status: 500 });
  }
  const nextPosition = planDecks.length > 0 ? Math.max(...planDecks.map((r) => r.position)) + 1 : 0;
  const lastDueDate = await lastWeekDueDate(sb, group.id, planDecks);
  const { dueDate, availableOn } = nextWeekDates(lastDueDate, todayIso());

  if (b.kind === 'deck') {
    const deckId = b.deckId;
    if (typeof deckId !== 'string' || !deckId) {
      return NextResponse.json({ error: 'deckId is required.' }, { status: 400 });
    }
    const result = await addDeckWeek({
      sb,
      organizer,
      group,
      planId,
      deckId,
      nextPosition,
      dueDate,
      availableOn,
    });
    return respond(result);
  }

  const result = await buildReviewWeek({
    sb,
    organizer,
    group,
    planId,
    planTitle: (plan.title as string | null) ?? null,
    unitDeckIds: planDecks.map((r) => r.deck_id),
    nextPosition,
    dueDate,
    availableOn,
    maxCards: clampReviewCardCount(b.maxCards, REVIEW_CARDS_DEFAULT),
  });
  return respond(result);
}
