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
  const peers: { id: string; username: string; display_name: string | null; role: string }[] = [];

  if (user.account_type === 'member' && !user.organizer_id) {
    return NextResponse.json([], { status: 200 });
  }

  if (user.account_type === 'member' && user.organizer_id) {
    // Members see other members in same group + their organizer
    const [membersResult, organizerResult] = await Promise.all([
      sb
        .from('profiles')
        .select('id, username, display_name')
        .eq('organizer_id', user.organizer_id)
        .neq('id', user.id)
        .order('username'),
      sb.from('profiles').select('id, username, display_name').eq('id', user.organizer_id).single(),
    ]);

    if (membersResult.error) {
      logger.error('Failed to fetch peers', {
        route: '/api/group/peers',
        error: membersResult.error.message,
      });
    }
    if (organizerResult.data) {
      peers.push({ ...organizerResult.data, role: 'organizer' });
    }
    if (membersResult.data) {
      peers.push(...membersResult.data.map((m) => ({ ...m, role: 'member' })));
    }
  } else {
    // Organizers see all their members
    const { data, error } = await sb
      .from('profiles')
      .select('id, username, display_name')
      .eq('organizer_id', user.id)
      .order('username');

    if (error) {
      logger.error('Failed to fetch peers', {
        route: '/api/group/peers',
        error: error.message,
      });
    }
    if (data) {
      peers.push(...data.map((m) => ({ ...m, role: 'member' })));
    }
  }

  return NextResponse.json(peers);
}
