import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireGroupAccess } from '../_lib/requireGroupAccess';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/** A row as `group_deck_readiness` returns it. */
interface ReadinessRow {
  deck_id: string;
  deck_name: string;
  deck_emoji: string | null;
  card_count: number;
  learner_count: number;
  strong: number;
  learning: number;
  unseen: number;
  accuracy_pct: number | null;
  struggling_learner_ids: string[];
}

/**
 * GET — per-deck readiness for one group's assigned decks, weakest first.
 * Organizer-only. Struggling learners are ids, never names — the UI resolves
 * them against the members list it already has.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const groupId = req.nextUrl.searchParams.get('groupId');
  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });
  }

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;

  const { data, error } = await getServiceSupabase().rpc('group_deck_readiness', {
    p_organizer: access.organizer.id,
    p_group: groupId,
  });

  if (error) {
    logger.error('Failed to load deck readiness', {
      route: '/api/group/readiness',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to load deck readiness.' }, { status: 500 });
  }

  const decks = ((data ?? []) as ReadinessRow[]).map((row) => ({
    deckId: row.deck_id,
    deckName: row.deck_name,
    deckEmoji: row.deck_emoji,
    cardCount: Number(row.card_count),
    learnerCount: Number(row.learner_count),
    strong: Number(row.strong),
    learning: Number(row.learning),
    unseen: Number(row.unseen),
    accuracyPct: row.accuracy_pct === null ? null : Number(row.accuracy_pct),
    strugglingLearnerIds: row.struggling_learner_ids ?? [],
  }));

  return NextResponse.json({ decks });
}
