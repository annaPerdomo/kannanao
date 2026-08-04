import { type NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '@/app/api/_lib/rateLimit';
import { requireOrganizerAccount } from '@/app/api/_lib/requireOrganizerAccount';
import { logger } from '@/lib/logger';
// `last_study_date` is a client-local calendar date; reuse the reminder job's
// reference timezone so "active today" here can't disagree with "studied today" there.
import { dateStringInTimeZone } from '@/lib/reviewReminder';

import { getServiceSupabase } from '../_lib/serviceSupabase';
import { weekStart } from '../_lib/weekStart';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

/** Members shown as initial avatars on a group row; the rest collapse to "+N". */
const MAX_FACES = 4;

interface GroupMemberFace {
  id: string;
  name: string;
  avatar: string | null;
}

/** Per-group rollup returned alongside each group. */
interface GroupStats {
  memberCount: number;
  /** Members whose last study day is today, in REMINDER_TIMEZONE. */
  activeCount: number;
  /** Lifetime cards studied, summed across the group's members. */
  cardsStudied: number;
  /** XP earned since Monday, summed across the group's members. */
  weeklyXp: number;
  /** First MAX_FACES members, for the avatar stack. */
  faces: GroupMemberFace[];
}

function emptyStats(): GroupStats {
  return { memberCount: 0, activeCount: 0, cardsStudied: 0, weeklyXp: 0, faces: [] };
}

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

  // Three fixed-size queries (memberships, progress, sessions) instead of one
  // per group, so an organizer with a dozen groups isn't a dozen round trips.
  // Keyed on organizer_id alone: account_type is the entitlement tier, and a
  // learner who pays for their own organizer plan is still in this group.
  const { data: membershipRows } = await sb
    .from('group_members')
    .select('group_id, member_id, profiles:member_id (username, display_name, avatar)')
    .eq('organizer_id', orgCheck.id)
    .order('joined_at', { ascending: true });

  // One row per (group, learner): someone in two of this organizer's groups is
  // counted in each, which is what a per-group rollup should say.
  const members = (membershipRows ?? []).map((r) => {
    const profile = r.profiles as unknown as {
      username: string;
      display_name: string | null;
      avatar: string | null;
    } | null;
    return {
      id: r.member_id as string,
      group_id: r.group_id as string,
      username: profile?.username ?? '',
      display_name: profile?.display_name ?? null,
      avatar: profile?.avatar ?? null,
    };
  });
  const memberIds = [...new Set(members.map((m) => m.id))];

  const [progressRes, sessionRes] = memberIds.length
    ? await Promise.all([
        sb
          .from('user_progress')
          .select('user_id, total_cards_studied, last_study_date')
          .in('user_id', memberIds),
        sb
          .from('study_sessions')
          .select('user_id, xp_earned')
          .in('user_id', memberIds)
          .gte('started_at', weekStart().toISOString()),
      ])
    : [{ data: [] }, { data: [] }];

  const progressMap = new Map((progressRes.data ?? []).map((p) => [p.user_id, p]));

  const weeklyXpByUser = new Map<string, number>();
  for (const s of sessionRes.data ?? []) {
    weeklyXpByUser.set(s.user_id, (weeklyXpByUser.get(s.user_id) ?? 0) + (s.xp_earned ?? 0));
  }

  const today = dateStringInTimeZone(new Date());
  const statsByGroup = new Map<string, GroupStats>();

  for (const m of members) {
    if (!m.group_id) continue;
    const stats = statsByGroup.get(m.group_id) ?? emptyStats();
    const prog = progressMap.get(m.id);

    stats.memberCount += 1;
    stats.cardsStudied += prog?.total_cards_studied ?? 0;
    stats.weeklyXp += weeklyXpByUser.get(m.id) ?? 0;
    if (prog?.last_study_date === today) stats.activeCount += 1;
    if (stats.faces.length < MAX_FACES) {
      stats.faces.push({ id: m.id, name: m.display_name || m.username, avatar: m.avatar });
    }

    statsByGroup.set(m.group_id, stats);
  }

  const result = (groups ?? []).map((g) => ({
    ...g,
    ...(statsByGroup.get(g.id) ?? emptyStats()),
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

  // Zeroed rollup so a freshly created group matches the shape GET returns.
  return NextResponse.json({ ...group, ...emptyStats() }, { status: 201 });
}
