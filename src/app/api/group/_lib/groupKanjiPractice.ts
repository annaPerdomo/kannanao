import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';

export async function groupUsesKanjiPractice(
  sb: SupabaseClient,
  args: { organizerId: string; groupId: string },
): Promise<boolean> {
  const { data, error } = await sb
    .from('decks')
    .select('id, assignments!inner(group_id)')
    .eq('user_id', args.organizerId)
    .eq('reading_practice', true)
    .eq('assignments.group_id', args.groupId)
    .limit(1);
  if (error) {
    logger.error("Failed to read the group's kanji practice", {
      groupId: args.groupId,
      error: error.message,
    });
    return false;
  }
  return (data ?? []).length > 0;
}
