import type { SupabaseClient } from '@supabase/supabase-js';

import { demoUuid } from '@/lib/demo';

import { deleteWhereIn, mustSucceed, requireNonEmpty } from './shared';

const RECENT_GROUP_MS = 5 * 60_000;

/** True when a concurrent run already finished tonight's reset, in the last 5 minutes. */
export async function demoGroupIsRecent(sb: SupabaseClient, teacherId: string, now: Date) {
  const { data } = await sb
    .from('groups')
    .select('created_at')
    .eq('organizer_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.created_at) return false;
  return now.getTime() - Date.parse(data.created_at) < RECENT_GROUP_MS;
}

/** By ownership, not the one fixed deck id — a stray deck under the teacher must still go. */
async function teacherDeckIds(sb: SupabaseClient, teacherId: string): Promise<string[]> {
  const { data, error } = await sb.from('decks').select('id').eq('user_id', teacherId);
  if (error) throw new Error(`list teacher decks failed: ${error.message}`);
  const ids = (data ?? []).map((row) => row.id as string);
  return [...new Set([...ids, demoUuid('demo-days')])];
}

/** Deletes every demo-owned row, children first. Throws on the first failure
 * so no insert ever follows a half-done wipe. */
export async function wipeDemoData(
  sb: SupabaseClient,
  teacherId: string,
  learnerIds: string[],
): Promise<void> {
  const allUserIds = requireNonEmpty([teacherId, ...learnerIds], 'wipe user ids');
  const deckIds = requireNonEmpty(await teacherDeckIds(sb, teacherId), 'wipe deck ids');

  // Scoped by deck, so this can delete a non-demo member's own row about the demo deck.
  await deleteWhereIn(sb, 'deck_shares', 'deck_id', deckIds);
  await deleteWhereIn(sb, 'study_sessions', 'deck_id', deckIds);

  await deleteWhereIn(sb, 'card_progress', 'user_id', allUserIds);
  await deleteWhereIn(sb, 'study_sessions', 'user_id', allUserIds);
  await deleteWhereIn(sb, 'user_achievements', 'user_id', allUserIds);
  await deleteWhereIn(sb, 'quiz_results', 'user_id', allUserIds);
  await deleteWhereIn(sb, 'user_progress', 'user_id', allUserIds);
  await deleteWhereIn(sb, 'kana_progress', 'user_id', allUserIds);
  await deleteWhereIn(sb, 'buddy_friendship', 'user_id', allUserIds);
  await deleteWhereIn(sb, 'buddy_state', 'user_id', allUserIds);

  const dmResult = await sb
    .from('direct_messages')
    .delete()
    .or(`sender_id.in.(${allUserIds.join(',')}),recipient_id.in.(${allUserIds.join(',')})`);
  await mustSucceed('delete direct_messages', dmResult);

  await mustSucceed(
    'delete encouragements',
    await sb.from('encouragements').delete().eq('organizer_id', teacherId),
  );
  await mustSucceed(
    'delete assignments',
    await sb.from('assignments').delete().eq('organizer_id', teacherId),
  );
  await deleteWhereIn(sb, 'deck_practice_sentences', 'deck_id', deckIds);
  await deleteWhereIn(sb, 'cards', 'deck_id', deckIds);
  await deleteWhereIn(sb, 'decks', 'id', deckIds);
  await mustSucceed(
    'delete invite_codes',
    await sb.from('invite_codes').delete().eq('organizer_id', teacherId),
  );
  // Filtered to this organizer, so a non-demo learner who scanned the demo
  // invite loses only this membership row — never their own profile or data.
  await mustSucceed(
    'delete group_members',
    await sb.from('group_members').delete().eq('organizer_id', teacherId),
  );
  await mustSucceed(
    'delete groups',
    await sb.from('groups').delete().eq('organizer_id', teacherId),
  );
}
