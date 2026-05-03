import { type NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '@/app/api/_lib/rateLimit';
import { requireOrganizerAccount } from '@/app/api/_lib/requireOrganizerAccount';
import { logger } from '@/lib/logger';

import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

/** GET — list all groups for the authenticated organizer */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const sb = getServiceSupabase();

  // Fetch groups with member count
  const { data: groups, error } = await sb
    .from('groups')
    .select('*')
    .eq('organizer_id', orgCheck.id)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to list groups', { error: error.message });
    return NextResponse.json({ error: 'Failed to load groups.' }, { status: 500 });
  }

  // Get member counts per group
  const { data: memberCounts } = await sb
    .from('profiles')
    .select('group_id')
    .eq('organizer_id', orgCheck.id)
    .eq('account_type', 'member');

  const countMap: Record<string, number> = {};
  for (const row of memberCounts ?? []) {
    if (row.group_id) {
      countMap[row.group_id] = (countMap[row.group_id] ?? 0) + 1;
    }
  }

  const result = (groups ?? []).map((g) => ({
    ...g,
    memberCount: countMap[g.id] ?? 0,
  }));

  return NextResponse.json(result);
}

/** POST — create a new group */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const body = await req.json();
  const name = (body.name ?? '').trim();
  const emoji = typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : null;

  if (!name) {
    return NextResponse.json({ error: 'Group name is required.' }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json(
      { error: 'Group name must be under 100 characters.' },
      { status: 400 },
    );
  }

  const sb = getServiceSupabase();

  const { data: group, error } = await sb
    .from('groups')
    .insert({
      organizer_id: orgCheck.id,
      name,
      emoji,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create group', { error: error.message });
    return NextResponse.json({ error: 'Failed to create group.' }, { status: 500 });
  }

  return NextResponse.json({ ...group, memberCount: 0 }, { status: 201 });
}
