import { type NextRequest, NextResponse } from 'next/server';

import { isKanaSetId } from '@/lib/kanaCurriculum';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../../_lib/rateLimit';
import { assignCompanionKana } from '../../_lib/assignCompanionKana';
import { memberIdsFor } from '../../_lib/membership';
import { requireGroupAccess } from '../../_lib/requireGroupAccess';
import { getServiceSupabase } from '../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 10 };
/** Each row costs a select plus a roster-sized insert: a whole chart would time the function out. */
const MAX_WEEKS = 16;
const MAX_ROWS = 24;

/** YYYY-MM-DD, the shape a <input type="date"> and a Postgres `date` agree on. */
function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

interface ApplyKanaCourseWeek {
  dueDate: string;
  setIds: string[];
}

function isWeek(value: unknown): value is ApplyKanaCourseWeek {
  if (!value || typeof value !== 'object') return false;
  const week = value as Record<string, unknown>;
  return (
    isDateOnly(week.dueDate) &&
    Array.isArray(week.setIds) &&
    week.setIds.length > 0 &&
    week.setIds.every(isKanaSetId)
  );
}

/**
 * POST — hand out a planned kana course to every member of the group. One row
 * per week's due date, deduplicated so a row that appears in more than one
 * week keeps its earliest date. Late joiners get the rows via catchUpKana on
 * their own join, not from anything written here.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const { groupId, weeks, requiredAccuracy } = (body ?? {}) as {
    groupId?: string;
    weeks?: unknown;
    requiredAccuracy?: number | null;
  };

  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });
  }

  const access = await requireGroupAccess(req, groupId);
  if (access instanceof NextResponse) return access;

  if (!Array.isArray(weeks) || weeks.length === 0 || !weeks.every(isWeek)) {
    return NextResponse.json(
      { error: 'weeks must be a non-empty array of { dueDate, setIds }.' },
      { status: 400 },
    );
  }
  if (
    requiredAccuracy != null &&
    (!Number.isInteger(requiredAccuracy) || requiredAccuracy < 0 || requiredAccuracy > 100)
  ) {
    return NextResponse.json(
      { error: 'requiredAccuracy must be an integer between 0 and 100.' },
      { status: 400 },
    );
  }

  if (weeks.length > MAX_WEEKS) {
    return NextResponse.json(
      { error: `A course can hold at most ${MAX_WEEKS} weeks.` },
      { status: 400 },
    );
  }

  const rowDueDates = new Map<string, string>();
  for (const week of weeks as ApplyKanaCourseWeek[]) {
    for (const setId of week.setIds) {
      const current = rowDueDates.get(setId);
      if (!current || week.dueDate < current) rowDueDates.set(setId, week.dueDate);
    }
  }
  if (rowDueDates.size > MAX_ROWS) {
    return NextResponse.json(
      { error: `A course can hold at most ${MAX_ROWS} rows.` },
      { status: 400 },
    );
  }

  const memberIds = await memberIdsFor({ organizerId: access.organizer.id, groupId });
  // Nothing is written for an empty roster and catchUpKana copies from existing
  // members' rows, so a course applied before anyone joins would vanish.
  if (memberIds.length === 0) {
    return NextResponse.json(
      { error: 'This group has no members yet.', memberCount: 0 },
      { status: 409 },
    );
  }

  const result = await assignCompanionKana({
    sb: getServiceSupabase(),
    rows: [...rowDueDates.entries()].map(([setId, dueDate]) => ({ setId, dueDate })),
    organizerId: access.organizer.id,
    groupId,
    memberIds,
    requiredAccuracy: requiredAccuracy ?? null,
    route: 'POST /api/group/kana-course/apply',
  });

  logger.info('Kana course applied', {
    route: 'POST /api/group/kana-course/apply',
    organizerId: access.organizer.id,
    groupId,
    memberCount: memberIds.length,
    assigned: result.assigned.length,
    failed: result.failed.length,
  });

  return NextResponse.json({
    assigned: result.assigned,
    failed: result.failed,
    memberCount: memberIds.length,
  });
}
