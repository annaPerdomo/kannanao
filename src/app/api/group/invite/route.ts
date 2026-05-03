import crypto from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 10 };

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex'); // 8 hex chars
}

/** POST — create a new invite code */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const body = await req.json().catch(() => null);
  const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 100) : null;
  const maxUses =
    body?.maxUses === null ? null : Math.min(Math.max(Number(body?.maxUses) || 1, 1), 999);

  let expiresAt: string | null = null;
  if (body?.expiresIn === '24h') {
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else if (body?.expiresIn === '7d') {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (body?.expiresIn === '30d') {
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  // 'never' or missing → null

  const sb = getServiceSupabase();
  const code = generateCode();

  // Resolve group: use provided groupId or fall back to organizer's first group
  let groupId = body?.groupId;
  if (groupId) {
    const { data: group } = await sb
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .eq('organizer_id', orgCheck.id)
      .single();
    if (!group) {
      return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
    }
  } else {
    // Fall back to organizer's first group
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
    groupId = firstGroup.id;
  }

  const { data, error } = await sb
    .from('invite_codes')
    .insert({
      code,
      organizer_id: orgCheck.id,
      group_id: groupId,
      label: label || null,
      max_uses: maxUses,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create invite code', {
      route: '/api/group/invite',
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to create invite.' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/** GET — list invite codes for the authenticated organizer */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const sb = getServiceSupabase();

  // Optional group filter
  const groupId = req.nextUrl.searchParams.get('groupId');

  let query = sb
    .from('invite_codes')
    .select('*')
    .eq('organizer_id', orgCheck.id)
    .order('created_at', { ascending: false });
  if (groupId) query = query.eq('group_id', groupId);

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to list invites', { route: '/api/group/invite', error: error.message });
    return NextResponse.json({ error: 'Failed to load invites.' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
