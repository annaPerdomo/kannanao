import { type NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '../../../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };
const PAGE_SIZE = 20;

/** GET — paginated study sessions for a member */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { id: memberId } = await params;
  const sb = getServiceSupabase();

  // Verify member belongs to organizer
  const { data: member } = await sb
    .from('profiles')
    .select('id')
    .eq('id', memberId)
    .eq('organizer_id', orgCheck.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  }

  const cursor = req.nextUrl.searchParams.get('cursor');
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || PAGE_SIZE, 50);

  let query = sb
    .from('study_sessions')
    .select(
      'id, deck_id, practice_mode, cards_studied, cards_correct, xp_earned, duration_secs, started_at, ended_at',
    )
    .eq('user_id', memberId)
    .order('started_at', { ascending: false })
    .limit(limit + 1); // fetch one extra to determine hasMore

  if (cursor) {
    query = query.lt('started_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions.' }, { status: 500 });
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const sessions = rows.slice(0, limit);

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      deckId: s.deck_id,
      practiceMode: s.practice_mode,
      cardsStudied: s.cards_studied,
      cardsCorrect: s.cards_correct,
      xpEarned: s.xp_earned,
      durationSecs: s.duration_secs,
      startedAt: s.started_at,
      endedAt: s.ended_at,
    })),
    hasMore,
    nextCursor: hasMore ? sessions[sessions.length - 1].started_at : null,
  });
}
