import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { invalidateProfileCache } from '@/app/api/_lib/authCache';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
} from '../../_lib/requireAuthenticatedUser';
import { getServiceSupabase } from '../../group/_lib/serviceSupabase';
import {
  checkInvite,
  claimInviteUse,
  releaseInviteClaim,
  revokeOrganizerDeckShares,
  shareOrganizerDecks,
} from '../_lib/invite';

const RATE_LIMIT = { windowMs: 60_000, max: 5 };
const ROUTE = '/api/join/link';

const LinkSchema = z.object({ code: z.string().min(1, 'Invite code is required') });

/**
 * POST — join a group with the account that is already signed in. Deliberately
 * does not write `account_type`: redeeming an invite must never change what an
 * account has paid for (see groupRole.ts).
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;
  const user = authCheck as AuthenticatedUser;

  const body = await req.json().catch(() => null);
  const parsed = LinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const sb = getServiceSupabase();

  const checked = await checkInvite(sb, parsed.data.code);
  if (!checked.ok) {
    return NextResponse.json(
      { error: checked.reason, code: checked.code },
      { status: checked.status },
    );
  }
  const invite = checked.invite;

  if (invite.organizer_id === user.id) {
    return NextResponse.json(
      {
        error: 'This is your own invite — share it with someone else to add them to your group.',
        code: 'ownInvite',
      },
      { status: 400 },
    );
  }

  // Not off the authenticated profile: that one is a 60s cache invalidated only
  // on the instance that wrote it, so a second group change within the minute
  // can read the pre-join state and skip the revoke below. Fail closed.
  const { data: current, error: currentError } = await sb
    .from('profiles')
    .select('organizer_id, group_id')
    .eq('id', user.id)
    .single();

  if (currentError || !current) {
    logger.error('Failed to read current membership', {
      route: ROUTE,
      error: currentError?.message,
    });
    return NextResponse.json(
      { error: 'Failed to join the group.', code: 'joinFailed' },
      { status: 500 },
    );
  }

  const currentOrganizerId = current.organizer_id ?? null;
  const targetGroupId = invite.group_id ?? null;
  // Re-scanning the same code must not burn another use.
  if (currentOrganizerId === invite.organizer_id && (current.group_id ?? null) === targetGroupId) {
    return NextResponse.json({ success: true, alreadyJoined: true });
  }

  if (!(await claimInviteUse(sb, invite))) {
    return NextResponse.json(
      {
        error: 'This invite was just used by someone else. Please try again!',
        code: 'inviteTaken',
      },
      { status: 409 },
    );
  }

  const previousOrganizerId = currentOrganizerId;

  const { error: updateError } = await sb
    .from('profiles')
    .update({ organizer_id: invite.organizer_id, group_id: targetGroupId })
    .eq('id', user.id);

  if (updateError) {
    logger.error('Failed to link account to group', { route: ROUTE, error: updateError.message });
    await releaseInviteClaim(sb, invite);
    return NextResponse.json(
      { error: 'Failed to join the group.', code: 'joinFailed' },
      { status: 500 },
    );
  }

  invalidateProfileCache(user.id);

  if (previousOrganizerId && previousOrganizerId !== invite.organizer_id) {
    await revokeOrganizerDeckShares(sb, previousOrganizerId, user.id, ROUTE);
  }
  await shareOrganizerDecks(sb, invite.organizer_id, user.id, ROUTE);

  return NextResponse.json({ success: true });
}
