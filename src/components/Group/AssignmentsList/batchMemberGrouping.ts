import type { Assignment } from '@/hooks/useAssignments';

export type MemberStatus = 'done' | 'close' | 'notStarted';

export interface BatchMemberRow {
  memberId: string;
  name: string;
  status: MemberStatus;
  completedAt: string | null;
  progressAccuracy: number | null;
  lastNudgedAt: string | null;
}

const CLOSE_ACCURACY_MARGIN = 15;

/**
 * Whether a member's best-so-far accuracy is worth flagging as near the goal.
 * A batch with no accuracy goal has nothing to be far from, so it counts too.
 */
export function isNearGoal(
  progressAccuracy: number | null,
  requiredAccuracy: number | null,
): boolean {
  if (progressAccuracy == null) return false;
  if (requiredAccuracy == null) return true;
  return Math.abs(requiredAccuracy - progressAccuracy) <= CLOSE_ACCURACY_MARGIN;
}

function memberName(a: Assignment): string {
  return a.profiles?.display_name || a.profiles?.username || '';
}

/**
 * Buckets one batch's per-member copies into done / close / not-started, in
 * that order. "Close" covers every unfinished learner regardless of how far
 * from the goal they are — `isNearGoal` (caller-side) decides the goal chip.
 */
export function groupBatchMembers(members: Assignment[]): BatchMemberRow[] {
  const rows: BatchMemberRow[] = members.map((a) => ({
    memberId: a.member_id,
    name: memberName(a),
    status: a.completed_at ? 'done' : a.progress_accuracy == null ? 'notStarted' : 'close',
    completedAt: a.completed_at,
    progressAccuracy: a.progress_accuracy,
    lastNudgedAt: a.profiles?.last_nudged_at ?? null,
  }));

  const rank: Record<MemberStatus, number> = { done: 0, close: 1, notStarted: 2 };
  return rows.sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    if (a.status === 'done') return (b.completedAt ?? '').localeCompare(a.completedAt ?? '');
    if (a.status === 'close') return (b.progressAccuracy ?? 0) - (a.progressAccuracy ?? 0);
    return a.name.localeCompare(b.name);
  });
}
