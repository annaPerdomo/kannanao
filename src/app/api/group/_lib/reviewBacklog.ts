import { logger } from '@/lib/logger';

import { getServiceSupabase } from './serviceSupabase';

export interface ReviewBacklog {
  /** Cards whose next review date has passed; `null` when the count is unknown. */
  reviewsWaiting: number | null;
  /** The subset of those due more than three days ago — not a separate bucket. */
  reviewsOverdue3d: number | null;
}

const NONE: ReviewBacklog = { reviewsWaiting: 0, reviewsOverdue3d: 0 };
const UNKNOWN: ReviewBacklog = { reviewsWaiting: null, reviewsOverdue3d: null };

interface BacklogRow {
  user_id: string;
  due_count: number;
  overdue_3d_count: number;
}

/**
 * Backlog counts keyed by user id, or `null` if the query failed. Learners with
 * nothing due are absent from the map — read through `backlogOf`, which keeps
 * "nothing due" (0) and "we don't know" (null) apart. Never collapse a failure
 * to 0: an all-clear dashboard is the one thing a review surface must not claim
 * falsely (same call as `getDueCards` in lib/supabase).
 */
export async function reviewBacklogFor(
  userIds: string[],
  route: string,
): Promise<Map<string, ReviewBacklog> | null> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await getServiceSupabase().rpc('group_review_backlog', {
    p_user_ids: userIds,
  });

  if (error) {
    logger.error('Failed to load review backlog', { route, error: error.message });
    return null;
  }

  return new Map(
    ((data ?? []) as BacklogRow[]).map((row) => [
      row.user_id,
      {
        reviewsWaiting: Number(row.due_count),
        reviewsOverdue3d: Number(row.overdue_3d_count),
      },
    ]),
  );
}

export function backlogOf(map: Map<string, ReviewBacklog> | null, userId: string): ReviewBacklog {
  if (!map) return UNKNOWN;
  return map.get(userId) ?? NONE;
}
