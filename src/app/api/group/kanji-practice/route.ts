import { type NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '../../_lib/rateLimit';
import { groupUsesKanjiPractice } from '../_lib/groupKanjiPractice';
import { requireGroupAccess } from '../_lib/requireGroupAccess';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 60 };

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const groupId = req.nextUrl.searchParams.get('groupId');
  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });
  }

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;

  const inUse = await groupUsesKanjiPractice(getServiceSupabase(), {
    organizerId: access.organizer.id,
    groupId: access.group.id,
  });
  return NextResponse.json({ inUse });
}
