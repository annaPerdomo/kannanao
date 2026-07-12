import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

interface QuizRow {
  user_id: string;
  score: number;
  total: number;
  accuracy: number;
  taken_at: string;
}

/**
 * GET — per-member quiz standings for one deck (organizer-only). Returns each
 * member's best attempt (highest accuracy, then score), their latest attempt,
 * and an attempt count. Members with no attempts are still listed with nulls so
 * the teacher sees who hasn't taken it yet. The CSV export is generated
 * client-side from this same payload — there is no separate export endpoint.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const deckId = req.nextUrl.searchParams.get('deckId');
  if (!deckId) {
    return NextResponse.json({ error: 'deckId is required.' }, { status: 400 });
  }
  const groupId = req.nextUrl.searchParams.get('groupId');

  const sb = getServiceSupabase();

  // Members of this organizer (optionally scoped to one group).
  let memberQuery = sb
    .from('profiles')
    .select('id, username, display_name')
    .eq('organizer_id', orgCheck.id);
  if (groupId) memberQuery = memberQuery.eq('group_id', groupId);
  const { data: members, error: membersErr } = await memberQuery;

  if (membersErr) {
    logger.error('Failed to fetch members for quiz results', {
      route: '/api/group/quiz-results',
      error: membersErr.message,
    });
    return NextResponse.json({ error: 'Failed to load members.' }, { status: 500 });
  }

  if (!members || members.length === 0) {
    return NextResponse.json([]);
  }

  const memberIds = members.map((m) => m.id);

  // All attempts for this deck by these members, newest first so the first row
  // seen per member is their latest.
  const { data: results, error: resultsErr } = await sb
    .from('quiz_results')
    .select('user_id, score, total, accuracy, taken_at')
    .eq('deck_id', deckId)
    .in('user_id', memberIds)
    .order('taken_at', { ascending: false });

  if (resultsErr) {
    logger.error('Failed to fetch quiz results', {
      route: '/api/group/quiz-results',
      error: resultsErr.message,
    });
    return NextResponse.json({ error: 'Failed to load quiz results.' }, { status: 500 });
  }

  const byMember = new Map<string, QuizRow[]>();
  for (const r of (results ?? []) as QuizRow[]) {
    const list = byMember.get(r.user_id) ?? [];
    list.push(r);
    byMember.set(r.user_id, list);
  }

  const payload = members.map((m) => {
    const attempts = byMember.get(m.id) ?? [];
    // Rows arrive newest-first, so [0] is the latest attempt.
    const latest = attempts[0] ?? null;
    // Best = highest accuracy, then highest raw score as a tiebreaker.
    const best = attempts.reduce<QuizRow | null>((acc, r) => {
      if (!acc) return r;
      if (r.accuracy > acc.accuracy) return r;
      if (r.accuracy === acc.accuracy && r.score > acc.score) return r;
      return acc;
    }, null);

    return {
      memberId: m.id,
      name: m.display_name || m.username,
      attempts: attempts.length,
      best: best ? { score: best.score, total: best.total, accuracy: best.accuracy } : null,
      latest: latest
        ? {
            score: latest.score,
            total: latest.total,
            accuracy: latest.accuracy,
            takenAt: latest.taken_at,
          }
        : null,
    };
  });

  return NextResponse.json(payload);
}
