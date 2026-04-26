import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

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

  const { memberIds, deckId, title, note, dueDate } = body as {
    memberIds: string[];
    deckId: string;
    title?: string;
    note?: string;
    dueDate?: string;
  };

  if (!Array.isArray(memberIds) || memberIds.length === 0 || !deckId) {
    return NextResponse.json(
      { error: 'memberIds (array) and deckId are required.' },
      { status: 400 },
    );
  }

  const sb = getServiceSupabase();

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
      member_id: memberId,
      deck_id: deckId,
      title: title?.trim().slice(0, 200) || null,
      note: note?.trim().slice(0, 500) || null,
      due_date: dueDate || null,
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

  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const userClient = createClient(url, anonKey);
  const {
    data: { user },
  } = await userClient.auth.getUser(authHeader.slice(7));
  if (!user) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });
  }

  const sb = getServiceSupabase();

  // Check account type
  const { data: profile } = await sb
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .single();

  let query;
  if (profile?.account_type === 'member') {
    // Members see their own assignments
    query = sb
      .from('assignments')
      .select('*, decks(id, name, emoji)')
      .eq('member_id', user.id)
      .order('created_at', { ascending: false });
  } else {
    // Organizers see all assignments they created
    query = sb
      .from('assignments')
      .select('*, decks(id, name, emoji), profiles!assignments_member_id_fkey(display_name, username)')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false });
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
