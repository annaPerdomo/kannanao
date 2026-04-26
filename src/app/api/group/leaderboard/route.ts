import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { getServiceSupabase } from '../_lib/serviceSupabase';

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

  const userClient = createClient(url, anonKey);
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser(authHeader.slice(7));

  if (authErr || !user) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  const sb = getServiceSupabase();

  // Get the user's profile to determine group membership
  const { data: profile } = await sb
    .from('profiles')
    .select('id, account_type, organizer_id, display_name, show_leaderboard')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  // Determine the organizer ID (group root)
  const organizerId =
    profile.account_type === 'organizer' ? profile.id : profile.organizer_id;

  if (!organizerId) {
    return NextResponse.json({ error: 'Not part of a group.' }, { status: 400 });
  }

  // Check if the organizer has enabled the leaderboard
  if (profile.account_type === 'organizer') {
    if (profile.show_leaderboard === false) {
      return NextResponse.json([]);
    }
  } else {
    // Member — check the organizer's setting
    const { data: organizer } = await sb
      .from('profiles')
      .select('show_leaderboard')
      .eq('id', organizerId)
      .single();
    if (organizer?.show_leaderboard === false) {
      return NextResponse.json([]);
    }
  }

  // Get all group members + organizer
  const { data: members } = await sb
    .from('profiles')
    .select('id, username, display_name')
    .or(`id.eq.${organizerId},organizer_id.eq.${organizerId}`);

  if (!members || members.length === 0) {
    return NextResponse.json([]);
  }

  const memberIds = members.map((m) => m.id);

  // Get study sessions from this week (Monday start)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const { data: sessions, error: sessErr } = await sb
    .from('study_sessions')
    .select('user_id, xp_earned, cards_studied')
    .in('user_id', memberIds)
    .gte('started_at', weekStart.toISOString());

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

  const progressMap = new Map(
    (progressRows ?? []).map((p) => [p.user_id, p]),
  );

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
        weeklyXp: weekly.xp,
        weeklyCards: weekly.cards,
        streakDays: prog?.streak_days ?? 0,
        level: prog?.level ?? 1,
      };
    })
    .sort((a, b) => b.weeklyXp - a.weeklyXp);

  return NextResponse.json(leaderboard);
}
