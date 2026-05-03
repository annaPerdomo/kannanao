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

  // Fetch progress for all members
  const { data: progressRows } = await sb
    .from('user_progress')
    .select(
      'user_id, total_xp, level, streak_days, total_cards_studied, total_correct, total_sessions',
    )
    .in('user_id', memberIds);

  // Fetch last session per member
  const { data: recentSessions } = await sb
    .from('study_sessions')
    .select('user_id, started_at')
    .in('user_id', memberIds)
    .order('started_at', { ascending: false });

  const progressMap = new Map((progressRows ?? []).map((p) => [p.user_id, p]));

  // Get most recent session per member
  const lastActiveMap = new Map<string, string>();
  for (const s of recentSessions ?? []) {
    if (!lastActiveMap.has(s.user_id)) {
      lastActiveMap.set(s.user_id, s.started_at);
    }
  }

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
      lastActive: lastActiveMap.get(m.id) ?? null,
    };
  });

  return NextResponse.json(result);
}
