import type { SupabaseClient } from '@supabase/supabase-js';

import { getServiceSupabase } from './serviceSupabase';

/**
 * Membership lives in `group_members`, not on the profile. A learner can be in
 * an advanced conversation group and a business Japanese group at once, so
 * "which group is this person in?" has no single answer — every roster and
 * every access check asks this table.
 *
 * `profiles.organizer_id` / `profiles.group_id` survive as a pointer to the
 * primary (most recently joined) group, for first paint and for UI that has to
 * name one group. Never read them to decide access.
 */
export interface Membership {
  group_id: string;
  organizer_id: string;
}

/** Every group this learner is in. */
export async function membershipsOf(memberId: string): Promise<Membership[]> {
  const { data } = await getServiceSupabase()
    .from('group_members')
    .select('group_id, organizer_id')
    .eq('member_id', memberId);

  return (data ?? []) as Membership[];
}

/** True when the learner is in at least one of this organizer's groups. */
export async function isMemberOfOrganizer(memberId: string, organizerId: string): Promise<boolean> {
  const { data } = await getServiceSupabase()
    .from('group_members')
    .select('group_id')
    .eq('member_id', memberId)
    .eq('organizer_id', organizerId)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/** True when the learner is in this specific group. */
export async function isMemberOfGroup(memberId: string, groupId: string): Promise<boolean> {
  const { data } = await getServiceSupabase()
    .from('group_members')
    .select('member_id')
    .eq('member_id', memberId)
    .eq('group_id', groupId)
    .maybeSingle();

  return !!data;
}

/**
 * Learner ids on an organizer's roster, narrowed to one group when asked. The
 * replacement for the old `profiles.eq(organizer_id).eq(group_id)` pattern —
 * callers follow it with a `profiles ... .in('id', ids)` when they need names.
 */
export async function memberIdsFor(args: {
  organizerId: string;
  groupId?: string | null;
}): Promise<string[]> {
  let query = getServiceSupabase()
    .from('group_members')
    .select('member_id')
    .eq('organizer_id', args.organizerId)
    .order('joined_at', { ascending: true });

  if (args.groupId) query = query.eq('group_id', args.groupId);

  const { data } = await query;

  // A learner in two of the same organizer's groups appears twice.
  return [...new Set((data ?? []).map((r) => r.member_id as string))];
}

/**
 * Records a join. Idempotent, so re-scanning a code can't create a duplicate,
 * and so a retried join is harmless.
 */
export async function addMembership(
  sb: SupabaseClient,
  args: { memberId: string; groupId: string; organizerId: string },
): Promise<{ error: string | null }> {
  const { error } = await sb.from('group_members').upsert(
    {
      group_id: args.groupId,
      member_id: args.memberId,
      organizer_id: args.organizerId,
    },
    { onConflict: 'group_id,member_id', ignoreDuplicates: true },
  );

  return { error: error?.message ?? null };
}

/** Removes a learner from one group, leaving their other groups alone. */
export async function removeMembership(
  sb: SupabaseClient,
  args: { memberId: string; groupId: string },
): Promise<void> {
  await sb
    .from('group_members')
    .delete()
    .eq('member_id', args.memberId)
    .eq('group_id', args.groupId);
}
