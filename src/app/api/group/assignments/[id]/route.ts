import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../../_lib/requireOrganizerAccount';
import { handoutPatchToDbUpdates, parseHandoutPatch } from '../../_lib/handoutWrites';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/** PATCH — update assignment (edit note/start date/due date, or mark complete) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // Verify ownership
  const { data: existing } = await sb
    .from('assignments')
    .select('id, kana_set')
    .eq('id', id)
    .eq('organizer_id', orgCheck.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
  }

  const parsed = parseHandoutPatch(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (
    'requiredMode' in parsed.patch &&
    parsed.patch.requiredMode !== null &&
    existing.kana_set != null
  ) {
    return NextResponse.json(
      { error: 'requiredMode does not apply to a kana goal.' },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = handoutPatchToDbUpdates(parsed.patch);
  if ('completedAt' in body) {
    const v = body.completedAt;
    if (v !== null && (typeof v !== 'string' || Number.isNaN(Date.parse(v)))) {
      return NextResponse.json({ error: 'Invalid completedAt.' }, { status: 400 });
    }
    updates.completed_at = v;
  }

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
