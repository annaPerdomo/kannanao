import { type NextRequest, NextResponse } from 'next/server';

import { availableNowFilter } from '@/lib/assignmentAvailability';
import { isGoalMode } from '@/lib/assignmentMastery';
import { logger } from '@/lib/logger';

import { getProfileForUser, getUserFromToken } from '../../_lib/authCache';
import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { type DeckHandout, dropOrphanedTemplates } from '../_lib/dropOrphanedTemplates';
import { memberIdsFor, membershipsOf } from '../_lib/membership';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/** A handout is one row per learner, so this is really a cap on group size. */
const MAX_DELETE_IDS = 500;

/** YYYY-MM-DD, the shape a <input type="date"> and a Postgres `date` agree on. */
function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** POST — create assignment(s) for one or more members */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const {
    memberIds,
    deckId,
    title,
    note,
    dueDate,
    availableOn,
    groupId,
    requiredAccuracy,
    requiredMode,
  } = body as {
    memberIds: string[];
    deckId: string;
    title?: string;
    note?: string;
    dueDate?: string;
    availableOn?: string;
    groupId?: string;
    requiredAccuracy?: number | null;
    requiredMode?: string | null;
  };

  if (!Array.isArray(memberIds) || memberIds.length === 0 || !deckId) {
    return NextResponse.json(
      { error: 'memberIds (array) and deckId are required.' },
      { status: 400 },
    );
  }

  // Optional mastery goal
  if (
    requiredAccuracy != null &&
    (typeof requiredAccuracy !== 'number' ||
      !Number.isInteger(requiredAccuracy) ||
      requiredAccuracy < 0 ||
      requiredAccuracy > 100)
  ) {
    return NextResponse.json(
      { error: 'requiredAccuracy must be an integer between 0 and 100.' },
      { status: 400 },
    );
  }
  if (requiredMode != null && !isGoalMode(requiredMode)) {
    return NextResponse.json({ error: 'requiredMode is not a valid goal mode.' }, { status: 400 });
  }
  if (availableOn != null && !isDateOnly(availableOn)) {
    return NextResponse.json({ error: 'availableOn must be a YYYY-MM-DD date.' }, { status: 400 });
  }
  const sb = getServiceSupabase();

  // Resolve group: use provided groupId or fall back to first group
  let resolvedGroupId = groupId;
  if (resolvedGroupId) {
    const { data: group } = await sb
      .from('groups')
      .select('id')
      .eq('id', resolvedGroupId)
      .eq('organizer_id', orgCheck.id)
      .single();
    if (!group) {
      return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
    }
  } else {
    const { data: firstGroup } = await sb
      .from('groups')
      .select('id')
      .eq('organizer_id', orgCheck.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    if (!firstGroup) {
      return NextResponse.json(
        { error: 'No groups found. Create a group first.' },
        { status: 400 },
      );
    }
    resolvedGroupId = firstGroup.id;
  }

  // Members must be in the group the assignment names, not merely somewhere on
  // this organizer's roster: group_id is what the row cascades on.
  const validIds = new Set(
    await memberIdsFor({ organizerId: orgCheck.id, groupId: resolvedGroupId }),
  );
  const rows = memberIds
    .filter((id) => validIds.has(id))
    .map((memberId) => ({
      organizer_id: orgCheck.id,
      group_id: resolvedGroupId,
      member_id: memberId,
      deck_id: deckId,
      title: title?.trim().slice(0, 200) || null,
      note: note?.trim().slice(0, 500) || null,
      due_date: dueDate || null,
      available_on: availableOn || null,
      required_accuracy: requiredAccuracy ?? null,
      required_mode: requiredMode ?? null,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid members found.' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('assignments')
    // Group-scoped: the same deck assigned in another of this organizer's
    // groups is a separate row. Keyed on member+deck alone, the second group's
    // assignment silently repurposes the first group's.
    .upsert(rows, { onConflict: 'member_id,deck_id,group_id' })
    .select();

  if (error) {
    logger.error('Failed to create assignments', {
      route: '/api/group/assignments',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to create assignments.' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/**
 * DELETE — remove assignments by id. Batch rather than per-id so the template
 * cleanup below can't race sibling deletes.
 */
export async function DELETE(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const body = await req.json().catch(() => null);
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'ids must be a non-empty array.' }, { status: 400 });
  }
  if (ids.length > MAX_DELETE_IDS) {
    return NextResponse.json(
      { error: `At most ${MAX_DELETE_IDS} assignments can be removed at once.` },
      { status: 400 },
    );
  }

  const sb = getServiceSupabase();

  const { data: deleted, error } = await sb
    .from('assignments')
    .delete()
    .in('id', ids)
    .eq('organizer_id', orgCheck.id)
    .select('group_id, deck_id');

  if (error) {
    logger.error('Failed to delete assignments', {
      route: '/api/group/assignments',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to delete assignments.' }, { status: 500 });
  }

  const handouts = new Map<string, DeckHandout>();
  for (const row of deleted ?? []) {
    if (row.group_id && row.deck_id) {
      handouts.set(`${row.group_id}:${row.deck_id}`, {
        groupId: row.group_id,
        deckId: row.deck_id,
      });
    }
  }
  await dropOrphanedTemplates(sb, {
    organizerId: orgCheck.id,
    handouts: [...handouts.values()],
    route: '/api/group/assignments',
  });

  return NextResponse.json({ success: true, deleted: deleted?.length ?? 0 });
}

/** GET — list assignments. Organizers see all their assignments; members see their own. */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  // Authenticate
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const token = authHeader.slice(7);
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });
  }

  const sb = getServiceSupabase();

  // Check account type (cached per user)
  const profile = await getProfileForUser(user.id, token);

  // Optional group filter
  const groupId = req.nextUrl.searchParams.get('groupId');

  /**
   * The caller says which list it wants rather than us guessing from
   * account_type: an account that runs a group and also learns in another has
   * both, and they must never be mixed. No scope keeps the old role-based guess
   * so existing callers are unaffected.
   */
  const requestedScope = req.nextUrl.searchParams.get('scope');
  const scope =
    requestedScope === 'mine' || requestedScope === 'given'
      ? requestedScope
      : profile?.account_type === 'member'
        ? 'mine'
        : 'given';

  let query;
  if (scope === 'mine') {
    // Scoped to the organizers the learner currently learns under: once they
    // leave a group nobody can withdraw the old assignments — the former
    // organizer no longer sees them, the learner can't dismiss them — so
    // unscoped they linger forever.
    query = sb
      .from('assignments')
      .select('*, decks(id, name, emoji)')
      .eq('member_id', user.id)
      // Scheduled for later: the organizer sees it now, the learner sees it on
      // the day. Without this a term planned in advance lands as one pile.
      .or(availableNowFilter())
      // Soonest deadline first — what to do next, not what was created last.
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    // Every group the learner is in, not just the primary one: someone taking
    // an advanced group and a business Japanese group has homework from both.
    const organizerIds = [...new Set((await membershipsOf(user.id)).map((m) => m.organizer_id))];
    if (organizerIds.length > 0) query = query.in('organizer_id', organizerIds);
  } else {
    query = sb
      .from('assignments')
      .select(
        '*, decks(id, name, emoji), profiles!assignments_member_id_fkey(display_name, username, last_nudged_at)',
      )
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false });
    if (groupId) query = query.eq('group_id', groupId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to list assignments', {
      route: '/api/group/assignments',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to load assignments.' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
