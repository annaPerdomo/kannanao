import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { getGroupKanaCourseNeeds } from '../../_lib/groupKanaCourseSource';
import { requireGroupAccess } from '../../_lib/requireGroupAccess';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/** GET — the sounds the group's already-assigned decks need, for a kana course generated from them. */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const groupId = req.nextUrl.searchParams.get('groupId');
  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });
  }

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;

  try {
    const result = await getGroupKanaCourseNeeds(groupId, access.organizer.id);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to load kana course source', {
      route: '/api/group/kana-course/source',
      groupId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to load the kana course source.' }, { status: 500 });
  }
}
