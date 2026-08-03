import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { invalidateProfileCache } from '@/app/api/_lib/authCache';
import { availabilityToday } from '@/lib/assignmentAvailability';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
} from '../../_lib/requireAuthenticatedUser';
import { addMembership, isMemberOfGroup } from '../../group/_lib/membership';
import { getServiceSupabase } from '../../group/_lib/serviceSupabase';
import { catchUpGroupAssignments } from '../_lib/catchUpAssignments';
import {
  checkInvite,
  claimInviteUse,
  releaseInviteClaim,
  shareOrganizerDecks,
} from '../_lib/invite';

const RATE_LIMIT = { windowMs: 60_000, max: 10, keyBy: 'user' as const };
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

  const targetGroupId = invite.group_id ?? null;
  if (!targetGroupId) {
    logger.error('Invite has no group', { route: ROUTE, inviteId: invite.id });
    return NextResponse.json(
      { error: 'Failed to join the group.', code: 'joinFailed' },
      { status: 500 },
    );
  }

  // Re-scanning a code you have already redeemed must not burn another use.
  if (await isMemberOfGroup(user.id, targetGroupId)) {
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

  // Joining adds a group, it never replaces one: the same learner can be taking
  // an advanced conversation group and a business Japanese group in the same
  // term, and redeeming the second code must not evict them from the first.
  const { error: membershipError } = await addMembership(sb, {
    memberId: user.id,
    groupId: targetGroupId,
    organizerId: invite.organizer_id,
  });

  if (membershipError) {
    logger.error('Failed to link account to group', { route: ROUTE, error: membershipError });
    await releaseInviteClaim(sb, invite);
    return NextResponse.json(
      { error: 'Failed to join the group.', code: 'joinFailed' },
      { status: 500 },
    );
  }

  // The profile columns are the primary-group pointer — what the UI names when
  // it can only name one — so the newest group wins. Membership itself is the
  // group_members row above; a failure here costs a label, not access.
  const { error: updateError } = await sb
    .from('profiles')
    .update({ organizer_id: invite.organizer_id, group_id: targetGroupId })
    .eq('id', user.id);

  if (updateError) {
    logger.warn('Failed to update primary group pointer', {
      route: ROUTE,
      error: updateError.message,
    });
  }

  invalidateProfileCache(user.id);

  await shareOrganizerDecks(sb, invite.organizer_id, user.id, ROUTE);
  const caughtUp = await catchUpGroupAssignments(sb, {
    groupId: targetGroupId,
    organizerId: invite.organizer_id,
    memberId: user.id,
    today: availabilityToday(),
    route: ROUTE,
  });

  return NextResponse.json({ success: true, assignmentsAdded: caughtUp });
}
