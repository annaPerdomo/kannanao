import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { getUserFromTokenResult } from '../../../../_lib/authCache';
import { backendUnavailable } from '../../../../_lib/backendUnavailable';
import { rateLimit } from '../../../../_lib/rateLimit';
import { getServiceSupabase } from '../../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

/** PATCH — mark an encouragement as read */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const auth = await getUserFromTokenResult(authHeader.slice(7));
  if (auth.error) return backendUnavailable(auth.error, 'group/encouragements-read.user');
  const user = auth.value;
  if (!user) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });
  }

  const { id } = await params;
  const sb = getServiceSupabase();

  const { error } = await sb
    .from('encouragements')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('member_id', user.id)
    .is('read_at', null);

  if (error) {
    logger.error('Failed to mark encouragement as read', {
      route: `/api/group/encouragements/${id}/read`,
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
