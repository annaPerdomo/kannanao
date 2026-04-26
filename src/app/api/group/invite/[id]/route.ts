import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 10 };

/** DELETE — revoke an invite code (only if owned by the authenticated organizer) */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { id } = await params;
  const sb = getServiceSupabase();

  const { error } = await sb
    .from('invite_codes')
    .delete()
    .eq('id', id)
    .eq('organizer_id', orgCheck.id);

  if (error) {
    logger.error('Failed to revoke invite', { route: `/api/group/invite/${id}`, error: error.message });
    return NextResponse.json({ error: 'Failed to revoke invite.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
