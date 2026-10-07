import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../../_lib/requireOrganizerAccount';
import { requireGroupAccess } from '../../_lib/requireGroupAccess';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };
const TITLE_MAX = 80;
const MAX_SHIFT_DAYS = 60;

interface PlanDeckRow {
  deck_id: string;
  position: number;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { planId } = await params;
  const sb = getServiceSupabase();

  const { data: plan } = await sb
    .from('lesson_plans')
    .select('id, organizer_id, group_id')
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

  if ('title' in b) {
    const raw = b.title;
    if (raw !== null && typeof raw !== 'string') {
      return NextResponse.json({ error: 'Invalid title.' }, { status: 400 });
    }
    const title = typeof raw === 'string' ? raw.trim().slice(0, TITLE_MAX) || null : null;
    const { error } = await sb.from('lesson_plans').update({ title }).eq('id', planId);
    if (error) {
      logger.error('Failed to rename unit', {
        route: 'PATCH /api/group/lessons/[planId]',
        error: error.message,
      });
      return NextResponse.json({ error: 'Failed to rename unit.' }, { status: 500 });
    }
  }

  if ('shift' in b) {
    const shift = b.shift;
    if (!shift || typeof shift !== 'object') {
      return NextResponse.json({ error: 'Invalid shift.' }, { status: 400 });
    }
    const { fromDeckId, days } = shift as Record<string, unknown>;
    if (typeof fromDeckId !== 'string') {
      return NextResponse.json({ error: 'Invalid fromDeckId.' }, { status: 400 });
    }
    if (
      typeof days !== 'number' ||
      !Number.isInteger(days) ||
      days === 0 ||
      days < -MAX_SHIFT_DAYS ||
      days > MAX_SHIFT_DAYS
    ) {
      return NextResponse.json(
        {
          error: `days must be a non-zero integer between -${MAX_SHIFT_DAYS} and ${MAX_SHIFT_DAYS}.`,
        },
        { status: 400 },
      );
    }

    const { data: planDecks, error: planDecksError } = await sb
      .from('lesson_plan_decks')
      .select('deck_id, position')
      .eq('plan_id', planId)
      .order('position');
    if (planDecksError) {
      logger.error('Failed to load unit weeks', {
        route: 'PATCH /api/group/lessons/[planId]',
        error: planDecksError.message,
      });
      return NextResponse.json({ error: 'Failed to shift the schedule.' }, { status: 500 });
    }

    const rows = (planDecks ?? []) as PlanDeckRow[];
    const fromRow = rows.find((r) => r.deck_id === fromDeckId);
    if (!fromRow) {
      return NextResponse.json({ error: 'Week not found in this unit.' }, { status: 404 });
    }

    const { error: shiftError } = await sb.rpc('shift_lesson_plan', {
      p_plan_id: planId,
      p_organizer_id: organizer.id,
      p_group_id: group.id,
      p_from_position: fromRow.position,
      p_days: days,
    });
    if (shiftError) {
      logger.error('Failed to shift the schedule', {
        route: 'PATCH /api/group/lessons/[planId]',
        error: shiftError.message,
      });
      return NextResponse.json({ error: 'Failed to shift the schedule.' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
