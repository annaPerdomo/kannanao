import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

interface FeedItem {
  type: 'achievement' | 'perfect_score' | 'streak' | 'level';
  memberId: string;
  memberName: string;
  description: string;
  emoji: string;
  timestamp: string;
}

/** GET — recent milestone events across all group members */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const sb = getServiceSupabase();

  // Optional group filter
  const groupId = req.nextUrl.searchParams.get('groupId');

  // Get all members
  let membersQuery = sb
    .from('profiles')
    .select('id, display_name, username')
    .eq('organizer_id', orgCheck.id);
  if (groupId) membersQuery = membersQuery.eq('group_id', groupId);

  const { data: members, error: membersErr } = await membersQuery;

  if (membersErr) {
    logger.error('Failed to fetch members for feed', {
      route: '/api/group/feed',
      error: membersErr.message,
    });
    return NextResponse.json({ error: 'Failed to load feed.' }, { status: 500 });
  }

  if (!members || members.length === 0) {
    return NextResponse.json([]);
  }

  const memberIds = members.map((m) => m.id);
  const nameMap = new Map(members.map((m) => [m.id, m.display_name || m.username]));

  // Fetch recent achievements (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [achievementsRes, sessionsRes] = await Promise.all([
    sb
      .from('user_achievements')
      .select('user_id, achievement_key, unlocked_at')
      .in('user_id', memberIds)
      .gte('unlocked_at', thirtyDaysAgo)
      .order('unlocked_at', { ascending: false })
      .limit(30),
    sb
      .from('study_sessions')
      .select('user_id, cards_studied, cards_correct, xp_earned, started_at, deck_id')
      .in('user_id', memberIds)
      .gte('started_at', thirtyDaysAgo)
      .order('started_at', { ascending: false })
      .limit(50),
  ]);

  const feed: FeedItem[] = [];

  // Achievement events
  const achievementLabels: Record<string, { label: string; emoji: string }> = {
    cards_10: { label: '10 Cards Studied', emoji: '📚' },
    cards_50: { label: '50 Cards Studied', emoji: '📖' },
    cards_100: { label: '100 Cards Studied', emoji: '🎯' },
    cards_250: { label: '250 Cards Studied', emoji: '⭐' },
    cards_500: { label: '500 Cards Studied', emoji: '🌟' },
    cards_1000: { label: '1,000 Cards Studied', emoji: '💫' },
    streak_3: { label: '3-Day Streak', emoji: '🔥' },
    streak_7: { label: '7-Day Streak', emoji: '🔥' },
    streak_14: { label: '14-Day Streak', emoji: '🔥' },
    streak_30: { label: '30-Day Streak', emoji: '🔥' },
    level_5: { label: 'Level 5', emoji: '✨' },
    level_10: { label: 'Level 10', emoji: '🌸' },
    level_20: { label: 'Level 20', emoji: '🏆' },
    perfect_session: { label: 'Perfect Score', emoji: '💯' },
    sessions_10: { label: '10 Study Sessions', emoji: '📝' },
    sessions_50: { label: '50 Study Sessions', emoji: '🎓' },
    sessions_100: { label: '100 Study Sessions', emoji: '🏅' },
    xp_100: { label: '100 XP', emoji: '💎' },
    xp_500: { label: '500 XP', emoji: '💎' },
    xp_1000: { label: '1,000 XP', emoji: '💎' },
  };

  for (const ach of achievementsRes.data ?? []) {
    const info = achievementLabels[ach.achievement_key];
    const name = nameMap.get(ach.user_id) ?? 'Unknown';
    feed.push({
      type: 'achievement',
      memberId: ach.user_id,
      memberName: name,
      description: info ? `unlocked "${info.label}"!` : `earned an achievement!`,
      emoji: info?.emoji ?? '🏆',
      timestamp: ach.unlocked_at,
    });
  }

  // Perfect score events
  for (const s of sessionsRes.data ?? []) {
    if (s.cards_studied && s.cards_studied > 0 && s.cards_correct === s.cards_studied) {
      feed.push({
        type: 'perfect_score',
        memberId: s.user_id,
        memberName: nameMap.get(s.user_id) ?? 'Unknown',
        description: `got a perfect score! (${s.cards_studied}/${s.cards_studied})`,
        emoji: '💯',
        timestamp: s.started_at,
      });
    }
  }

  // Sort by timestamp descending and limit to 20
  feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json(feed.slice(0, 20));
}
