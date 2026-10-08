import { type NextRequest, NextResponse } from 'next/server';

import { isKanaSetId } from '@/lib/kanaCurriculum';
import { LESSON_KANA_MAX, sortKanaSets } from '@/lib/lessonKana';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { linkWeekToUnit } from '../_lib/linkWeekToUnit';
import { loadLessonLibrary } from '../_lib/loadLessonLibrary';
import { requireGroupAccess } from '../_lib/requireGroupAccess';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 60 };
const CREATE_RATE_LIMIT = { windowMs: 60_000, max: 20 };
const TITLE_MAX = 200;
const ROUTE = 'POST /api/group/lessons';

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
    const library = await loadLessonLibrary(sb, organizer.id, group.id);
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

function parseKanaSets(value: unknown): string[] | { error: string } {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(isKanaSetId)) {
    return { error: 'kanaSets must be curriculum row ids.' };
  }
  if (value.length > LESSON_KANA_MAX) {
    return { error: `A lesson can hold at most ${LESSON_KANA_MAX} sound rows.` };
  }
  return sortKanaSets(value);
}

async function nextDeckPosition(
  sb: ReturnType<typeof getServiceSupabase>,
  organizerId: string,
): Promise<number> {
  const { data } = await sb
    .from('decks')
    .select('position')
    .eq('user_id', organizerId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  return ((data?.position as number | undefined) ?? -1) + 1;
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, CREATE_RATE_LIMIT);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const { groupId, title, unit, kanaSets } = body as Record<string, unknown>;
  if (typeof groupId !== 'string') {
    return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });
  }
  const trimmedTitle = typeof title === 'string' ? title.trim().slice(0, TITLE_MAX) : '';
  if (!trimmedTitle) {
    return NextResponse.json({ error: 'title is required.' }, { status: 400 });
  }
  if (!unit || typeof unit !== 'object') {
    return NextResponse.json({ error: 'unit is required.' }, { status: 400 });
  }
  const unitBody = unit as Record<string, unknown>;
  const kanaSetsParsed = parseKanaSets(kanaSets);
  if ('error' in kanaSetsParsed) {
    return NextResponse.json({ error: kanaSetsParsed.error }, { status: 400 });
  }

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;
  const { organizer, group } = access;

  const sb = getServiceSupabase();

  let planId: string;
  let createdPlan = false;
  if (typeof unitBody.planId === 'string') {
    const { data: plan } = await sb
      .from('lesson_plans')
      .select('id')
      .eq('id', unitBody.planId)
      .eq('organizer_id', organizer.id)
      .eq('group_id', group.id)
      .maybeSingle();
    if (!plan) {
      return NextResponse.json({ error: 'Lesson plan not found.' }, { status: 404 });
    }
    planId = plan.id as string;
  } else if ('title' in unitBody) {
    const unitTitle =
      typeof unitBody.title === 'string' ? unitBody.title.trim().slice(0, 80) || null : null;
    planId = crypto.randomUUID();
    const { error: planError } = await sb.from('lesson_plans').insert({
      id: planId,
      organizer_id: organizer.id,
      group_id: group.id,
      title: unitTitle,
      jlpt_level: null,
    });
    if (planError) {
      logger.error('Failed to create the unit', { route: ROUTE, error: planError.message });
      return NextResponse.json({ error: 'Could not create the lesson.' }, { status: 500 });
    }
    createdPlan = true;
  } else {
    return NextResponse.json({ error: 'unit must have planId or title.' }, { status: 400 });
  }

  const position = await nextDeckPosition(sb, organizer.id);
  const { data: deck, error: deckError } = await sb
    .from('decks')
    .insert({ name: trimmedTitle, user_id: organizer.id, position, lesson_plan_id: planId })
    .select('id')
    .single();

  if (deckError || !deck) {
    logger.error('Failed to create the lesson deck', { route: ROUTE, error: deckError?.message });
    if (createdPlan) await sb.from('lesson_plans').delete().eq('id', planId);
    return NextResponse.json({ error: 'Could not create the lesson.' }, { status: 500 });
  }

  const deckId = deck.id as string;

  const { data: existingLinks } = await sb
    .from('lesson_plan_decks')
    .select('position')
    .eq('plan_id', planId)
    .order('position', { ascending: false })
    .limit(1);
  const nextPosition = existingLinks?.[0] ? (existingLinks[0].position as number) + 1 : 0;

  const link = await linkWeekToUnit(sb, { planId, deckId, position: nextPosition });
  if (link.status !== 'ok') {
    await sb.from('decks').delete().eq('id', deckId);
    if (createdPlan) await sb.from('lesson_plans').delete().eq('id', planId);
    logger.error('Failed to link the new lesson to the unit', { route: ROUTE, planId, deckId });
    return NextResponse.json({ error: 'Could not create the lesson.' }, { status: 500 });
  }

  if (kanaSetsParsed.length > 0) {
    const { error: kanaError } = await sb
      .from('lesson_plan_decks')
      .update({ kana_sets: kanaSetsParsed })
      .eq('plan_id', planId)
      .eq('deck_id', deckId);
    if (kanaError) {
      await sb.from('lesson_plan_decks').delete().eq('plan_id', planId).eq('deck_id', deckId);
      await sb.from('decks').delete().eq('id', deckId);
      if (createdPlan) await sb.from('lesson_plans').delete().eq('id', planId);
      logger.error('Failed to save the lesson sound rows', {
        route: ROUTE,
        error: kanaError.message,
      });
      return NextResponse.json({ error: 'Could not create the lesson.' }, { status: 500 });
    }
  }

  return NextResponse.json({ planId, deckId }, { status: 201 });
}
