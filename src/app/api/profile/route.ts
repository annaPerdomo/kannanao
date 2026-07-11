import { NextResponse } from 'next/server';

import { authenticateUser, handleProfileAction } from '../_lib/profile-actions';

// Actions a user may perform on their OWN profile. Privilege-bearing actions
// (changeAccountType, changeGroup) are intentionally excluded — they are
// admin-only and reachable solely through /api/admin. Allowing them here would
// let any member self-promote to organizer (unlocking paid API access) or move
// themselves into any group by id.
const SELF_SERVICE_ACTIONS = new Set(['changePassword', 'changeUsername', 'changeDisplayName']);

export async function PATCH(req: Request) {
  const auth = await authenticateUser(req);
  if ('error' in auth) return auth.error;

  const body = (await req.json()) as Record<string, unknown>;
  if (typeof body.action !== 'string' || !SELF_SERVICE_ACTIONS.has(body.action)) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
  return handleProfileAction(auth.serviceClient, auth.user.id, body);
}
