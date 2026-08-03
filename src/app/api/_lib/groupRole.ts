/**
 * Two independent axes, deliberately not one enum. `account_type` is billing
 * state — what the account may create and spend. `organizer_id` / `group_id`
 * say whose group it learns in, set by redeeming an invite.
 *
 * They used to be conflated, so joining a group silently downgraded
 * entitlements. Nothing that changes membership may write `account_type`, and
 * nothing that checks entitlement may read `organizer_id`.
 */

export interface RoleFields {
  id: string;
  account_type: string | null;
  organizer_id: string | null;
}

/** Learns in someone else's group — drives assignments, leaderboard, peers. */
export function isGroupLearner(profile: Pick<RoleFields, 'organizer_id'>): boolean {
  return Boolean(profile.organizer_id);
}

/** Entitled to run groups and spend the paid APIs. Never infer this from membership. */
export function hasOrganizerEntitlement(profile: Pick<RoleFields, 'account_type'>): boolean {
  return profile.account_type !== 'member';
}
