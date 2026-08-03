import { type NextRequest, NextResponse } from 'next/server';

import { isGoalMode } from '@/lib/assignmentMastery';
import { logger } from '@/lib/logger';

import { getProfileForUser, getUserFromToken } from '../../_lib/authCache';
import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

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

  const { memberIds, deckId, title, note, dueDate, groupId, requiredAccuracy, requiredMode } =
    body as {
      memberIds: string[];
      deckId: string;
      title?: string;
      note?: string;
      dueDate?: string;
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

  // Verify all members belong to this organizer
  const { data: validMembers } = await sb
    .from('profiles')
    .select('id')
    .in('id', memberIds)
    .eq('organizer_id', orgCheck.id);

  const validIds = new Set((validMembers ?? []).map((m) => m.id));
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
      required_accuracy: requiredAccuracy ?? null,
      required_mode: requiredMode ?? null,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid members found.' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('assignments')
    .upsert(rows, { onConflict: 'member_id,deck_id' })
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
    // Scoped to the current organizer: once a learner moves groups nobody can
    // withdraw the old assignments — the former organizer no longer sees them,
    // the learner can't dismiss them — so unscoped they linger forever.
    query = sb
      .from('assignments')
      .select('*, decks(id, name, emoji)')
      .eq('member_id', user.id)
      .order('created_at', { ascending: false });
    if (profile?.organizer_id) query = query.eq('organizer_id', profile.organizer_id);
  } else {
    query = sb
      .from('assignments')
      .select(
        '*, decks(id, name, emoji), profiles!assignments_member_id_fkey(display_name, username)',
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
