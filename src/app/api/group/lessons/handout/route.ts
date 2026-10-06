import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import {
  checkDateOrder,
  parseHandoutPatch,
  removeHandout,
  updateHandout,
} from '../../_lib/handoutWrites';
import { requireGroupAccess } from '../../_lib/requireGroupAccess';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

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
