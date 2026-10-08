import { type NextRequest, NextResponse } from 'next/server';

import { isGoalMode } from '@/lib/assignmentMastery';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { assignCompanionKana } from '../../_lib/assignCompanionKana';
import { generateDeckSentences } from '../../_lib/generateDeckSentences';
import {
  assignHandout,
  checkDateOrder,
  parseHandoutPatch,
  removeHandout,
  updateHandout,
} from '../../_lib/handoutWrites';
import { findLessonPlanDeck, groupPlanIds } from '../../_lib/lessonPlanDeckLookup';
import { memberIdsFor } from '../../_lib/membership';
import { requireGroupAccess } from '../../_lib/requireGroupAccess';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };
const PLAIN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const { groupId, deckId, ...rest } = body as Record<string, unknown>;
  if (typeof groupId !== 'string' || typeof deckId !== 'string') {
    return NextResponse.json({ error: 'groupId and deckId are required.' }, { status: 400 });
  }

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;
  const { organizer, group } = access;

  const parsed = parseHandoutPatch(rest);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const orderError = checkDateOrder(parsed.patch);
  if (orderError) {
    return NextResponse.json({ error: orderError.error }, { status: 400 });
  }

  const sb = getServiceSupabase();

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
  if (!templateCount && !assignmentCount) {
    return NextResponse.json({ error: 'Handout not found.' }, { status: 404 });
  }

  const { error } = await updateHandout(sb, {
    organizerId: organizer.id,
    groupId: group.id,
    deckId,
    patch: parsed.patch,
  });
  if (error) {
    logger.error('Failed to update handout', { route: 'PATCH /api/group/lessons/handout', error });
    return NextResponse.json({ error: 'Failed to update handout.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const groupId = req.nextUrl.searchParams.get('groupId');
  const deckId = req.nextUrl.searchParams.get('deckId');
  if (!groupId || !deckId) {
    return NextResponse.json({ error: 'groupId and deckId are required.' }, { status: 400 });
  }

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;
  const { organizer, group } = access;

  const sb = getServiceSupabase();
  const { error } = await removeHandout(sb, {
    organizerId: organizer.id,
    groupId: group.id,
    deckId,
  });
  if (error) {
    logger.error('Failed to remove handout', { route: 'DELETE /api/group/lessons/handout', error });
    return NextResponse.json({ error: 'Failed to remove handout.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

const HANDOUT_ROUTE = 'POST /api/group/lessons/handout';

function parseDate(value: unknown, field: string): { value: string | null } | { error: string } {
  if (value === null || value === undefined) return { value: null };
  if (typeof value !== 'string' || !PLAIN_DATE_RE.test(value)) {
    return { error: `${field} must be a plain date.` };
  }
  return { value };
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const { groupId, deckId } = b;
  if (typeof groupId !== 'string' || typeof deckId !== 'string') {
    return NextResponse.json({ error: 'groupId and deckId are required.' }, { status: 400 });
  }

  const dueDate = parseDate(b.dueDate, 'dueDate');
  if ('error' in dueDate) return NextResponse.json({ error: dueDate.error }, { status: 400 });
  const availableOn = parseDate(b.availableOn, 'availableOn');
  if ('error' in availableOn) {
    return NextResponse.json({ error: availableOn.error }, { status: 400 });
  }
  const orderError = checkDateOrder({ dueDate: dueDate.value, availableOn: availableOn.value });
  if (orderError) {
    return NextResponse.json({ error: orderError.error }, { status: 400 });
  }
  if (
    b.requiredAccuracy != null &&
    (typeof b.requiredAccuracy !== 'number' ||
      !Number.isInteger(b.requiredAccuracy) ||
      b.requiredAccuracy < 0 ||
      b.requiredAccuracy > 100)
  ) {
    return NextResponse.json(
      { error: 'requiredAccuracy must be an integer between 0 and 100.' },
      { status: 400 },
    );
  }
  if (b.requiredMode != null && !isGoalMode(b.requiredMode)) {
    return NextResponse.json({ error: 'requiredMode is not a valid goal mode.' }, { status: 400 });
  }

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;
  const { organizer, group } = access;

  const sb = getServiceSupabase();

  const { data: deck } = await sb
    .from('decks')
    .select('id, name')
    .eq('id', deckId)
    .eq('user_id', organizer.id)
    .maybeSingle();
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
  }

  const planIds = await groupPlanIds(sb, organizer.id, group.id);
  const planDeck = await findLessonPlanDeck(sb, { planIds, deckId });
  if (!planDeck) {
    return NextResponse.json({ error: 'This deck is not part of a lesson.' }, { status: 404 });
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
  if (templateCount || assignmentCount) {
    return NextResponse.json(
      { error: 'This lesson has already been handed out.' },
      { status: 409 },
    );
  }

  const { error: assignError } = await assignHandout(sb, {
    organizerId: organizer.id,
    groupId: group.id,
    deckId,
    title: deck.name as string,
    note: null,
    dueDate: dueDate.value,
    availableOn: availableOn.value,
    requiredAccuracy: (b.requiredAccuracy as number | null | undefined) ?? null,
    requiredMode: (b.requiredMode as string | null | undefined) ?? null,
  });
  if (assignError) {
    logger.error('Failed to hand out the lesson', { route: HANDOUT_ROUTE, error: assignError });
    return NextResponse.json({ error: 'Failed to hand out the lesson.' }, { status: 500 });
  }

  const memberIds = await memberIdsFor({ organizerId: organizer.id, groupId: group.id });

  const kanaSets = (planDeck.kana_sets as string[] | null) ?? [];
  const kana = await assignCompanionKana({
    sb,
    rows: kanaSets.map((setId) => ({ setId, dueDate: dueDate.value })),
    organizerId: organizer.id,
    groupId: group.id,
    memberIds,
    requiredAccuracy: (b.requiredAccuracy as number | null | undefined) ?? null,
    route: HANDOUT_ROUTE,
  });

  let sentences: 'ok' | 'failed' | undefined;
  if (b.withSentences) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('Skipping lesson sentences: no Gemini API key', { route: HANDOUT_ROUTE });
      sentences = 'failed';
    } else {
      try {
        const outcome = await generateDeckSentences({
          deckId,
          knownWords: [],
          apiKey,
          ownerId: organizer.id,
        });
        sentences = outcome.status === 'failed' ? 'failed' : 'ok';
      } catch (err) {
        logger.error('Lesson sentence generation threw', {
          route: HANDOUT_ROUTE,
          deckId,
          error: err instanceof Error ? err.message : String(err),
        });
        sentences = 'failed';
      }
    }
  }

  return NextResponse.json({
    assigned: memberIds.length,
    kanaAssigned: kana.assigned,
    kanaFailed: kana.failed,
    sentences,
  });
}
