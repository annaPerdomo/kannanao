import { describe, expect, it } from 'vitest';

import { hasOrganizerEntitlement, isGroupLearner } from '../groupRole';

const FREE_MEMBER = { id: 'u1', account_type: 'member', organizer_id: 'org1' };
const FREE_SOLO = { id: 'u2', account_type: 'member', organizer_id: null };
const PAID_SOLO = { id: 'u3', account_type: 'organizer', organizer_id: null };
const PAID_LEARNER = { id: 'u4', account_type: 'organizer', organizer_id: 'org1' };

describe('isGroupLearner', () => {
  it('counts anyone with an organizer, whatever they pay for', () => {
    expect(isGroupLearner(FREE_MEMBER)).toBe(true);
    // The case the old account_type check missed: pays for organizer, still
    // studies in someone else's group.
    expect(isGroupLearner(PAID_LEARNER)).toBe(true);
  });

  it('excludes accounts that are in no group', () => {
    expect(isGroupLearner(FREE_SOLO)).toBe(false);
    expect(isGroupLearner(PAID_SOLO)).toBe(false);
  });
});

describe('hasOrganizerEntitlement', () => {
  it('reads the tier and ignores group membership entirely', () => {
    expect(hasOrganizerEntitlement(PAID_LEARNER)).toBe(true);
    expect(hasOrganizerEntitlement(PAID_SOLO)).toBe(true);
    expect(hasOrganizerEntitlement(FREE_MEMBER)).toBe(false);
    expect(hasOrganizerEntitlement(FREE_SOLO)).toBe(false);
  });

  it('treats a missing tier as organizer, matching the profile default', () => {
    expect(hasOrganizerEntitlement({ account_type: null })).toBe(true);
  });
});
