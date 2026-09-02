import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { getGroupKanaCoverage } from '../_lib/groupKanaCoverage';
import { requireGroupAccess } from '../_lib/requireGroupAccess';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

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
    return NextResponse.json(await getGroupKanaCoverage(groupId, access.organizer.id));
  } catch (error) {
    logger.error('Failed to load kana coverage', {
      route: '/api/group/kana-coverage',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to load kana coverage.' }, { status: 500 });
  }
}
