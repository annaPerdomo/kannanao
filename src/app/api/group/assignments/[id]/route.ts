import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/** PATCH — update assignment (edit note/due date, or mark complete) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // Verify ownership
  const { data: existing } = await sb
    .from('assignments')
    .select('id')
    .eq('id', id)
    .eq('organizer_id', orgCheck.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if ('title' in body) updates.title = body.title?.trim().slice(0, 200) || null;
  if ('note' in body) updates.note = body.note?.trim().slice(0, 500) || null;
  if ('dueDate' in body) updates.due_date = body.dueDate || null;
  if ('completedAt' in body) updates.completed_at = body.completedAt;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update assignment', {
      route: `/api/group/assignments/${id}`,
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to update assignment.' }, { status: 500 });
  }

  return NextResponse.json(data);
}

/** DELETE — remove assignment */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { id } = await params;
  const sb = getServiceSupabase();

  const { error } = await sb
    .from('assignments')
    .delete()
    .eq('id', id)
    .eq('organizer_id', orgCheck.id);

  if (error) {
    logger.error('Failed to delete assignment', {
      route: `/api/group/assignments/${id}`,
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to delete assignment.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
