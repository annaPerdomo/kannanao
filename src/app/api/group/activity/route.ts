import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { dayRange, localDay } from '../_lib/activityDays';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

const DEFAULT_DAYS = 14;
const MAX_DAYS = 31;
/** A class's fortnight of sessions; far above any real group, below a runaway scan. */
const MAX_SESSIONS = 5000;

interface SessionRow {
  user_id: string;
  cards_studied: number | null;
  xp_earned: number | null;
  started_at: string;
}

/**
 * GET — daily study activity for one group, for the dashboard's charts.
 * Days are cut in the viewer's timezone (see activityDays). Organizer-only.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const params = req.nextUrl.searchParams;
  const groupId = params.get('groupId');
  const days = Math.min(MAX_DAYS, Math.max(1, Number(params.get('days')) || DEFAULT_DAYS));
  const rawOffset = Number(params.get('tzOffset'));
  const tzOffset = Number.isFinite(rawOffset) ? Math.max(-840, Math.min(840, rawOffset)) : 0;

  const sb = getServiceSupabase();

  let membersQuery = sb
    .from('profiles')
    .select('id, username, display_name')
    .eq('organizer_id', orgCheck.id);
  if (groupId) membersQuery = membersQuery.eq('group_id', groupId);

  const { data: members, error: membersErr } = await membersQuery;

  if (membersErr) {
    logger.error('Failed to fetch members for activity', {
      route: '/api/group/activity',
      error: membersErr.message,
    });
    return NextResponse.json({ error: 'Failed to load activity.' }, { status: 500 });
  }

  const dayList = dayRange(days, tzOffset);

  if (!members || members.length === 0) {
    return NextResponse.json({
      days: dayList,
      totals: { cards: dayList.map(() => 0), xp: dayList.map(() => 0) },
      members: [],
    });
  }

  // One extra day of slack on the lower bound: the window's first local day
  // starts before its UTC counterpart for viewers east of UTC.
  const since = new Date(Date.now() - days * 86_400_000);
  const { data: sessions, error: sessErr } = await sb
    .from('study_sessions')
    .select('user_id, cards_studied, xp_earned, started_at')
    .in(
      'user_id',
      members.map((m) => m.id),
    )
    .gte('started_at', since.toISOString())
    // Newest-first so hitting the cap only ever drops the oldest days —
    // unordered truncation would punch random holes in the charts.
    .order('started_at', { ascending: false })
    .limit(MAX_SESSIONS);

  if (sessions && sessions.length >= MAX_SESSIONS) {
    logger.warn('Activity session cap hit; oldest days may be undercounted', {
      route: '/api/group/activity',
      cap: MAX_SESSIONS,
      members: members.length,
    });
  }

  if (sessErr) {
    logger.error('Failed to fetch activity sessions', {
      route: '/api/group/activity',
      error: sessErr.message,
    });
    return NextResponse.json({ error: 'Failed to load activity.' }, { status: 500 });
  }

  const dayIndex = new Map(dayList.map((d, i) => [d, i]));
  const zeros = () => dayList.map(() => 0);
  const perMember = new Map(members.map((m) => [m.id, zeros()]));
  const totalCards = zeros();
  const totalXp = zeros();

  for (const s of (sessions ?? []) as SessionRow[]) {
    const i = dayIndex.get(localDay(new Date(s.started_at), tzOffset));
    if (i === undefined) continue;
    const cards = s.cards_studied ?? 0;
    totalCards[i] += cards;
    totalXp[i] += s.xp_earned ?? 0;
    const row = perMember.get(s.user_id);
    if (row) row[i] += cards;
  }

  return NextResponse.json({
    days: dayList,
    totals: { cards: totalCards, xp: totalXp },
    members: members.map((m) => ({
      id: m.id,
      name: m.display_name || m.username,
      daily: perMember.get(m.id) ?? zeros(),
    })),
  });
}
