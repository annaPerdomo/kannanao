import { beforeEach, describe, expect, it, vi } from 'vitest';

let rows: Record<string, unknown>[];
const filters: [string, unknown][] = [];
const orderCalls: unknown[][] = [];

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from: () => {
      const matching = () =>
        rows.filter((row) => filters.every(([col, value]) => row[col] === value));
      const chain: Record<string, unknown> = {};
      ['select', 'limit'].forEach((m) => {
        chain[m] = vi.fn(() => chain);
      });
      chain.eq = vi.fn((col: string, value: unknown) => {
        filters.push([col, value]);
        return chain;
      });
      chain.order = vi.fn((...args: unknown[]) => {
        orderCalls.push(args);
        return chain;
      });
      chain.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: matching()[0] ?? null, error: null }),
      );
      chain.then = (ok: (v: unknown) => unknown) =>
        Promise.resolve({ data: matching(), error: null }).then(ok);
      return chain;
    },
  }),
}));

import {
  isMemberOfGroup,
  isMemberOfOrganizer,
  latestGroupOf,
  memberIdsFor,
  membershipsOf,
} from '@/app/api/group/_lib/membership';

const ADVANCED = { group_id: 'advanced', organizer_id: 'org1', member_id: 'kenji' };
const BUSINESS = { group_id: 'business', organizer_id: 'org2', member_id: 'kenji' };

beforeEach(() => {
  rows = [ADVANCED, BUSINESS];
  filters.length = 0;
  orderCalls.length = 0;
});

describe('membershipsOf', () => {
  it('returns every group the learner is in, not just one', async () => {
    // An advanced conversation group and a business Japanese group at once is
    // the case the profile columns could not express.
    await expect(membershipsOf('kenji')).resolves.toEqual([ADVANCED, BUSINESS]);
  });

  it('is empty for someone in no group', async () => {
    await expect(membershipsOf('solo')).resolves.toEqual([]);
  });
});

describe('isMemberOfOrganizer', () => {
  it('is true for any of that organizer’s groups', async () => {
    await expect(isMemberOfOrganizer('kenji', 'org2')).resolves.toBe(true);
  });

  it('is false for an organizer they left', async () => {
    await expect(isMemberOfOrganizer('kenji', 'org3')).resolves.toBe(false);
  });
});

describe('isMemberOfGroup', () => {
  it('distinguishes two groups run by different organizers', async () => {
    await expect(isMemberOfGroup('kenji', 'business')).resolves.toBe(true);
  });

  it('is false for a group id the learner merely knows', async () => {
    await expect(isMemberOfGroup('kenji', 'someone-elses')).resolves.toBe(false);
  });
});

describe('latestGroupOf', () => {
  it('returns the member’s most recently joined group for that organizer', async () => {
    rows = [
      { group_id: 'older', organizer_id: 'org1', member_id: 'kenji', joined_at: '2026-01-01' },
    ];
    await expect(latestGroupOf('kenji', 'org1')).resolves.toBe('older');
  });

  it('filters by member and organizer, ordered by joined_at descending', async () => {
    await latestGroupOf('kenji', 'org1');
    expect(filters).toEqual([
      ['member_id', 'kenji'],
      ['organizer_id', 'org1'],
    ]);
    expect(orderCalls).toEqual([['joined_at', { ascending: false }]]);
  });

  it('is null when the learner is in none of this organizer’s groups', async () => {
    await expect(latestGroupOf('kenji', 'org-nope')).resolves.toBeNull();
  });
});

describe('memberIdsFor', () => {
  it('lists a group’s roster', async () => {
    rows = [ADVANCED, { ...ADVANCED, member_id: 'aya' }, BUSINESS];

    await expect(memberIdsFor({ organizerId: 'org1', groupId: 'advanced' })).resolves.toEqual([
      'kenji',
      'aya',
    ]);
  });

  it('counts a learner in two of the same organizer’s groups once', async () => {
    rows = [ADVANCED, { ...ADVANCED, group_id: 'beginner' }];

    await expect(memberIdsFor({ organizerId: 'org1' })).resolves.toEqual(['kenji']);
  });
});
