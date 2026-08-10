import { logger } from '@/lib/logger';

import { type getServiceSupabase } from './serviceSupabase';

/** One handout: the same deck given to every learner in a group. */
export interface DeckHandout {
  groupId: string;
  deckId: string;
}

/**
 * Retires the plan-ahead template of any handout with no live assignment left —
 * otherwise a handout the organizer fully deleted keeps reappearing for later
 * joiners via catchUpGroupAssignments, with no UI to stop it.
 *
 * Callers must have deleted every copy in ONE statement: this counts what
 * remains, and deletes still in flight elsewhere still show up in that count.
 * Best-effort — never fails the delete the caller asked for.
 */
export async function dropOrphanedTemplates(
  sb: ReturnType<typeof getServiceSupabase>,
  args: { organizerId: string; handouts: DeckHandout[]; route: string },
) {
  const { organizerId, handouts, route } = args;

  for (const { groupId, deckId } of handouts) {
    const { count, error } = await sb
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('deck_id', deckId);

    if (error || count === null || count > 0) {
      if (error)
        logger.warn('Could not check for remaining assignments', { route, error: error.message });
      continue;
    }

    const { error: deleteError } = await sb
      .from('planned_assignments')
      .delete()
      .eq('organizer_id', organizerId)
      .eq('group_id', groupId)
      .eq('deck_id', deckId);

    if (deleteError) {
      logger.warn('Failed to remove planned assignment template', {
        route,
        error: deleteError.message,
      });
    }
  }
}
