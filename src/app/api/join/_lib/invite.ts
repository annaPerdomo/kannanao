import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';

export interface InviteRow {
  id: string;
  organizer_id: string;
  group_id: string | null;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
}

/**
 * Stable identifier for a refusal, so the client can localise it. The English
 * `reason` rides along as a fallback for anything that predates the code.
 */
export type InviteRefusal = 'invalidCode' | 'inviteExpired' | 'inviteUsedUp';

export type InviteCheck =
  | { ok: true; invite: InviteRow }
  | { ok: false; code: InviteRefusal; reason: string; status: 404 | 410 };

/** Fetch an invite code and check it is neither expired nor used up. */
export async function checkInvite(sb: SupabaseClient, code: string): Promise<InviteCheck> {
  const { data: invite, error } = await sb
    .from('invite_codes')
    .select('id, organizer_id, group_id, max_uses, times_used, expires_at')
    .eq('code', code)
    .single();

  if (error || !invite) {
    return { ok: false, code: 'invalidCode', reason: 'Invalid invite code.', status: 404 };
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return {
      ok: false,
      code: 'inviteExpired',
      reason: 'This invite has expired. Ask for a new one!',
      status: 410,
    };
  }
  if (invite.max_uses !== null && invite.times_used >= invite.max_uses) {
    return {
      ok: false,
      code: 'inviteUsedUp',
      reason: 'This invite has been fully used. Ask for a new one!',
      status: 410,
    };
  }

  return { ok: true, invite: invite as InviteRow };
}

/**
 * Claim one use of the invite BEFORE touching the account. The WHERE clause
 * compares times_used to the value we read, so two concurrent joins can't both
 * claim the same slot and exceed max_uses (the loser sees 0 rows).
 */
export async function claimInviteUse(sb: SupabaseClient, invite: InviteRow): Promise<boolean> {
  const { data } = await sb
    .from('invite_codes')
    .update({ times_used: invite.times_used + 1 })
    .eq('id', invite.id)
    .eq('times_used', invite.times_used)
    .select('id');

  return Boolean(data && data.length > 0);
}

export async function releaseInviteClaim(sb: SupabaseClient, invite: InviteRow): Promise<void> {
  await sb
    .from('invite_codes')
    .update({ times_used: invite.times_used })
    .eq('id', invite.id)
    .eq('times_used', invite.times_used + 1);
}

/** Share every deck the organizer owns with the joiner, skipping ones already shared. */
export async function shareOrganizerDecks(
  sb: SupabaseClient,
  organizerId: string,
  memberId: string,
  route: string,
): Promise<void> {
  const { data: orgDecks } = await sb.from('decks').select('id').eq('user_id', organizerId);
  if (!orgDecks || orgDecks.length === 0) return;

  const shares = orgDecks.map((d: { id: string }) => ({
    deck_id: d.id,
    owner_id: organizerId,
    shared_with: memberId,
  }));

  const { error } = await sb
    .from('deck_shares')
    .upsert(shares, { onConflict: 'deck_id,shared_with', ignoreDuplicates: true });

  if (error) {
    logger.warn('Failed to auto-share decks', { route, error: error.message });
  }
}
