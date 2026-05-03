import { type NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '@/app/api/_lib/rateLimit';
import { logger } from '@/lib/logger';

import { requireGroupAccess } from '../../_lib/requireGroupAccess';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

/** PATCH — update group name, emoji, or pinned status */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const { id } = await params;
  const access = await requireGroupAccess(req, id);
  if (access instanceof NextResponse) return access;

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: 'Group name is required.' }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Group name must be under 100 characters.' },
        { status: 400 },
      );
    }
    updates.name = name;
  }
  if (typeof body.emoji === 'string') updates.emoji = body.emoji.trim() || null;
  if (typeof body.pinned === 'boolean') updates.pinned = body.pinned;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  const sb = getServiceSupabase();
  const { data: group, error } = await sb
    .from('groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update group', { error: error.message });
    return NextResponse.json({ error: 'Failed to update group.' }, { status: 500 });
  }

  return NextResponse.json(group);
}

/** DELETE — delete a group (members lose their group_id but keep organizer_id) */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const { id } = await params;
  const access = await requireGroupAccess(req, id);
  if (access instanceof NextResponse) return access;

  const sb = getServiceSupabase();
  const { error } = await sb.from('groups').delete().eq('id', id);

  if (error) {
    logger.error('Failed to delete group', { error: error.message });
    return NextResponse.json({ error: 'Failed to delete group.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
