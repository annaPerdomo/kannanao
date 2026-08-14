import {
  type FriendshipDates,
  type FriendshipSource,
  reachableToday,
  type TodayOpportunity,
} from '@/lib/friendship';
import { type MilestoneKind, nextPromisedMilestone } from '@/lib/friendshipMilestones';

const NEAR_HEARTS = 3;

export interface NearMilestoneHook {
  kind: MilestoneKind;
  heartsAway: number;
}

function datesFromGoals(goals: TodayOpportunity[], today: string): FriendshipDates {
  const done = (source: FriendshipSource) =>
    goals.some((goal) => goal.source === source && goal.done);
  return {
    adventure: done('adventure') ? today : null,
    session: done('session') ? today : null,
    pet: done('pet') ? today : null,
  };
}

/**
 * nextPromisedMilestone, not heartsToNext: that counts fact slots this buddy has
 * no fact written for, and the card would promise something that never arrives.
 */
export function nearMilestoneHook(
  copy: unknown,
  points: number,
  todayGoals: TodayOpportunity[],
  today: string,
): NearMilestoneHook | null {
  const promised = nextPromisedMilestone(copy, points);
  // Its unauthored fallback is a bare level crossing — the dialog opens with no
  // story to reveal, so the six buddies without friendship copy get no promise.
  if (!promised || !promised.authored) return null;

  const { heartsAway } = promised;
  const reachable = reachableToday(heartsAway, datesFromGoals(todayGoals, today), today);
  if (heartsAway > NEAR_HEARTS && !reachable) return null;

  return { kind: promised.milestone.kind, heartsAway };
}
