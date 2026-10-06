import { type NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '../../../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../../../_lib/requireOrganizerAccount';
import { copyUnit, type CopyUnitResult } from '../../../_lib/copyUnit';
import { requireGroupAccess } from '../../../_lib/requireGroupAccess';
import { getServiceSupabase } from '../../../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 10 };
const PLAIN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function respond(result: CopyUnitResult) {
  switch (result.status) {
    case 'ok':
      return NextResponse.json({
        planId: result.planId,
        added: result.added,
        skipped: result.skipped,
      });
    case 'nothing_to_copy':
      return NextResponse.json({ error: 'nothing_to_copy' }, { status: 409 });
    default:
      return NextResponse.json({ error: 'Failed to copy the unit.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { planId } = await params;
  const sb = getServiceSupabase();

  const { data: plan } = await sb
    .from('lesson_plans')
    .select('id, organizer_id, group_id, title, jlpt_level')
    .eq('id', planId)
    .eq('organizer_id', orgCheck.id)
    .single();
  if (!plan) {
    return NextResponse.json({ error: 'Lesson plan not found.' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  if (typeof b.groupId !== 'string' || !b.groupId) {
    return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });
  }
  if (
    typeof b.firstDueDate !== 'string' ||
    !PLAIN_DATE_RE.test(b.firstDueDate) ||
    Number.isNaN(Date.parse(b.firstDueDate))
  ) {
    return NextResponse.json(
      { error: 'firstDueDate must be a valid YYYY-MM-DD date.' },
      { status: 400 },
    );
  }
  if (b.groupId === plan.group_id) {
    return NextResponse.json({ error: 'same_group' }, { status: 400 });
  }

  const access = await requireGroupAccess(req, b.groupId);
  if (access instanceof NextResponse) return access;
  const { organizer, group } = access;

  const result = await copyUnit({
    sb,
    organizer,
    sourcePlan: {
      id: plan.id as string,
      group_id: plan.group_id as string,
      title: (plan.title as string | null) ?? null,
      jlpt_level: (plan.jlpt_level as string | null) ?? null,
    },
    targetGroup: group,
    firstDueDate: b.firstDueDate,
  });

  return respond(result);
}
