import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { getProfileForUser, getUserFromToken } from '../../_lib/authCache';
import { rateLimit } from '../../_lib/rateLimit';
import { getServiceSupabase } from '../_lib/serviceSupabase';
import { weekStart } from '../_lib/weekStart';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/**
 * GET — weekly group leaderboard.
 * Accessible by both organizers and members of the same group.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  // Authenticate the user (organizer or member)
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const token = authHeader.slice(7);
  const user = await getUserFromToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const sb = getServiceSupabase();

  // Get the user's profile to determine group membership (cached per user)
  const profile = await getProfileForUser(user.id, token);

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  // Determine the organizer ID (group root)
  const organizerId = profile.account_type === 'organizer' ? profile.id : profile.organizer_id;

  if (!organizerId) {
    return NextResponse.json({ error: 'Not part of a group.' }, { status: 400 });
  }

  // Optional groupId from query (organizers), or derive from member profile
  const groupId = req.nextUrl.searchParams.get('groupId') ?? profile.group_id ?? null;

  // Check if the group has the leaderboard enabled
  if (groupId) {
    const { data: group } = await sb
      .from('groups')
      .select('show_leaderboard')
      .eq('id', groupId)
      .single();
    if (group?.show_leaderboard === false) {
      return NextResponse.json([]);
    }
  }

  // Get all group members + organizer
  let membersQuery = sb
    .from('profiles')
    .select('id, username, display_name, avatar')
    .or(`id.eq.${organizerId},organizer_id.eq.${organizerId}`);
  if (groupId) membersQuery = membersQuery.or(`group_id.eq.${groupId},id.eq.${organizerId}`);

  const { data: members } = await membersQuery;

  if (!members || members.length === 0) {
    return NextResponse.json([]);
  }

  const memberIds = members.map((m) => m.id);

  // Monday-start week, shared with the per-group weekly XP on home (see weekStart)
  const { data: sessions, error: sessErr } = await sb
    .from('study_sessions')
    .select('user_id, xp_earned, cards_studied')
    .in('user_id', memberIds)
    .gte('started_at', weekStart().toISOString());

  if (sessErr) {
    logger.error('Failed to fetch leaderboard sessions', {
      route: '/api/group/leaderboard',
      error: sessErr.message,
    });
  }

  // Get streaks
  const { data: progressRows } = await sb
    .from('user_progress')
    .select('user_id, streak_days, level')
    .in('user_id', memberIds);

  const progressMap = new Map((progressRows ?? []).map((p) => [p.user_id, p]));

  // Aggregate weekly XP and cards per user
  const weeklyStats = new Map<string, { xp: number; cards: number }>();
  for (const s of sessions ?? []) {
    const existing = weeklyStats.get(s.user_id) ?? { xp: 0, cards: 0 };
    existing.xp += s.xp_earned ?? 0;
    existing.cards += s.cards_studied ?? 0;
    weeklyStats.set(s.user_id, existing);
  }

  const leaderboard = members
    .map((m) => {
      const weekly = weeklyStats.get(m.id) ?? { xp: 0, cards: 0 };
      const prog = progressMap.get(m.id);
      return {
        id: m.id,
        username: m.username,
        displayName: m.display_name,
        avatar: m.avatar,
        weeklyXp: weekly.xp,
        weeklyCards: weekly.cards,
        streakDays: prog?.streak_days ?? 0,
        level: prog?.level ?? 1,
      };
    })
    .sort((a, b) => b.weeklyXp - a.weeklyXp);

  return NextResponse.json(leaderboard);
}
