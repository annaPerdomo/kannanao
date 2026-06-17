import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/** GET — list all members with progress summary */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const sb = getServiceSupabase();

  // Optional group filter
  const groupId = req.nextUrl.searchParams.get('groupId');

  // Fetch member profiles
  let query = sb
    .from('profiles')
    .select('id, username, display_name, created_at')
    .eq('organizer_id', orgCheck.id)
    .order('created_at', { ascending: true });
  if (groupId) query = query.eq('group_id', groupId);

  const { data: members, error: membersErr } = await query;

  if (membersErr) {
    logger.error('Failed to fetch members', {
      route: '/api/group/members',
      error: membersErr.message,
    });
    return NextResponse.json({ error: 'Failed to load members.' }, { status: 500 });
  }

  if (!members || members.length === 0) {
    return NextResponse.json([]);
  }

  const memberIds = members.map((m) => m.id);

  // Fetch progress for all members. `last_study_date` (maintained on every
  // answer) gives each member's last-active day directly — far cheaper than
  // pulling their entire study_sessions history just to find the latest one.
  // The members UI only buckets activity by day (today / <3d / inactive), so
  // day granularity is sufficient.
  const { data: progressRows } = await sb
    .from('user_progress')
    .select(
      'user_id, total_xp, level, streak_days, total_cards_studied, total_correct, total_sessions, last_study_date',
    )
    .in('user_id', memberIds);

  const progressMap = new Map((progressRows ?? []).map((p) => [p.user_id, p]));

  const result = members.map((m) => {
    const prog = progressMap.get(m.id);
    return {
      id: m.id,
      username: m.username,
      displayName: m.display_name,
      createdAt: m.created_at,
      level: prog?.level ?? 1,
      totalXp: prog?.total_xp ?? 0,
      streakDays: prog?.streak_days ?? 0,
      totalCardsStudied: prog?.total_cards_studied ?? 0,
      totalCorrect: prog?.total_correct ?? 0,
      totalSessions: prog?.total_sessions ?? 0,
      lastActive: prog?.last_study_date ?? null,
    };
  });

  return NextResponse.json(result);
}
