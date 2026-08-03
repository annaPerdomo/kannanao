import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import {
  type AuthenticatedUser,
  requireAuthenticatedUser,
} from '../../_lib/requireAuthenticatedUser';
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

  // Both queries run for everyone: an account can run its own group AND learn
  // in someone else's, and should be able to message people on both sides.
  const [ownMembersRes, groupPeersRes, organizerRes] = await Promise.all([
    sb
      .from('profiles')
      .select('id, username, display_name, avatar')
      .eq('organizer_id', user.id)
      .order('username'),
    user.organizer_id
      ? sb
          .from('profiles')
          .select('id, username, display_name, avatar')
          .eq('organizer_id', user.organizer_id)
          .neq('id', user.id)
          .order('username')
      : Promise.resolve({ data: [], error: null }),
    user.organizer_id
      ? sb
          .from('profiles')
          .select('id, username, display_name, avatar')
          .eq('id', user.organizer_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  for (const res of [ownMembersRes, groupPeersRes]) {
    if (res.error) {
      logger.error('Failed to fetch peers', {
        route: '/api/group/peers',
        error: res.error.message,
      });
    }
  }

  // Own organizer first, then everyone else. Deduped because an account that
  // joined a group whose organizer is also one of its own members would
  // otherwise appear twice.
  const byId = new Map<string, { role: string; [k: string]: unknown }>();
  if (organizerRes.data)
    byId.set(organizerRes.data.id, { ...organizerRes.data, role: 'organizer' });
  for (const p of [...(groupPeersRes.data ?? []), ...(ownMembersRes.data ?? [])]) {
    if (!byId.has(p.id)) byId.set(p.id, { ...p, role: 'member' });
  }

  return NextResponse.json([...byId.values()]);
}
