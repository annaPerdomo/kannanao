import { type NextRequest, NextResponse } from 'next/server';

import { aggregateMasteryByUser } from '@/lib/cardStrength';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { memberIdsFor } from '../_lib/membership';
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

  // Roster comes from group_members: a learner can be in more than one of this
  // organizer's groups, and the profile columns only name one of them.
  const rosterIds = await memberIdsFor({ organizerId: orgCheck.id, groupId });

  const { data: members, error: membersErr } = await sb
    .from('profiles')
    .select('id, username, display_name, avatar, created_at')
    .in('id', rosterIds)
    .order('created_at', { ascending: true });

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
  const [{ data: progressRows }, { data: cardProgressRows }] = await Promise.all([
    sb
      .from('user_progress')
      .select(
        'user_id, total_xp, level, streak_days, total_cards_studied, total_correct, total_sessions, last_study_date',
      )
      .in('user_id', memberIds),
    sb.from('card_progress').select('user_id, interval_days, ease').in('user_id', memberIds),
  ]);

  const progressMap = new Map((progressRows ?? []).map((p) => [p.user_id, p]));
  const masteryByUser = aggregateMasteryByUser(
    (cardProgressRows ?? []).map((r) => ({
      userId: r.user_id,
      intervalDays: r.interval_days,
      ease: r.ease,
    })),
  );

  const result = members.map((m) => {
    const prog = progressMap.get(m.id);
    const mastery = masteryByUser.get(m.id);
    return {
      id: m.id,
      username: m.username,
      displayName: m.display_name,
      avatar: m.avatar,
      createdAt: m.created_at,
      level: prog?.level ?? 1,
      totalXp: prog?.total_xp ?? 0,
      streakDays: prog?.streak_days ?? 0,
      totalCardsStudied: prog?.total_cards_studied ?? 0,
      totalCorrect: prog?.total_correct ?? 0,
      totalSessions: prog?.total_sessions ?? 0,
      lastActive: prog?.last_study_date ?? null,
      masteryLearning: mastery?.learning ?? 0,
      masteryStrong: mastery?.strong ?? 0,
    };
  });

  return NextResponse.json(result);
}
