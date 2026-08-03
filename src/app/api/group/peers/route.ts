import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
} from '../../_lib/requireAuthenticatedUser';
import { memberIdsFor, membershipsOf } from '../_lib/membership';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/** GET — list group peers that the current user can message */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const authCheck = await requireAuthenticatedUser(req);
  if (authCheck instanceof NextResponse) return authCheck;
  const user = authCheck as AuthenticatedUser;

  const sb = getServiceSupabase();

  // Both sides run for everyone: an account can run its own groups AND learn in
  // other people's, and should be able to message people on both sides. A
  // learner in two groups gets the classmates and the organizer of each.
  const memberships = await membershipsOf(user.id);
  const organizerIds = [...new Set(memberships.map((m) => m.organizer_id))];

  const classmateIds = new Set<string>();
  for (const membership of memberships) {
    for (const id of await memberIdsFor({
      organizerId: membership.organizer_id,
      groupId: membership.group_id,
    })) {
      if (id !== user.id) classmateIds.add(id);
    }
  }

  const [ownMembersRes, peersRes, organizersRes] = await Promise.all([
    sb
      .from('profiles')
      .select('id, username, display_name, avatar')
      .in('id', await memberIdsFor({ organizerId: user.id }))
      .order('username'),
    classmateIds.size
      ? sb
          .from('profiles')
          .select('id, username, display_name, avatar')
          .in('id', [...classmateIds])
          .order('username')
      : Promise.resolve({ data: [], error: null }),
    organizerIds.length
      ? sb
          .from('profiles')
          .select('id, username, display_name, avatar')
          .in('id', organizerIds)
          .order('username')
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const res of [ownMembersRes, peersRes, organizersRes]) {
    if (res.error) {
      logger.error('Failed to fetch peers', {
        route: '/api/group/peers',
        error: res.error.message,
      });
    }
  }

  // Own organizers first, then everyone else. Deduped because an account that
  // joined a group whose organizer is also one of its own members would
  // otherwise appear twice.
  const byId = new Map<string, { role: string; [k: string]: unknown }>();
  for (const o of organizersRes.data ?? []) byId.set(o.id, { ...o, role: 'organizer' });
  for (const p of [...(peersRes.data ?? []), ...(ownMembersRes.data ?? [])]) {
    if (!byId.has(p.id)) byId.set(p.id, { ...p, role: 'member' });
  }

  return NextResponse.json([...byId.values()]);
}
