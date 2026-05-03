import { type NextRequest, NextResponse } from 'next/server';

import {
  type OrganizerProfile,
  requireOrganizerAccount,
} from '@/app/api/_lib/requireOrganizerAccount';

import { getServiceSupabase } from './serviceSupabase';

export interface GroupRecord {
  id: string;
  organizer_id: string;
  name: string;
  emoji: string;
  pinned: boolean;
  created_at: string;
}

export interface GroupAccess {
  organizer: OrganizerProfile;
  group: GroupRecord;
}

/**
 * Verifies the authenticated user is an organizer AND owns the given group.
 * Returns 404 if the group doesn't exist or doesn't belong to the organizer.
 */
export async function requireGroupAccess(
  req: NextRequest,
  groupId: string,
): Promise<GroupAccess | NextResponse> {
  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const sb = getServiceSupabase();
  const { data: group, error } = await sb
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .eq('organizer_id', orgCheck.id)
    .single();

  if (error || !group) {
    return NextResponse.json({ error: 'Group not found.' }, { status: 404 });
  }

  return { organizer: orgCheck, group: group as GroupRecord };
}
