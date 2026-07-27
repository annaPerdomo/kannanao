import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi
    .fn()
    .mockResolvedValue({ id: 'org1', username: 'organizer', account_type: 'organizer' }),
}));

// "Today" for the active count. The route asks reviewReminder for the reference
// calendar day, so pinning that pins the boundary the test is about.
vi.mock('@/lib/reviewReminder', () => ({
  dateStringInTimeZone: () => '2026-07-26',
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

/** Thenable query chain: every builder method returns itself, awaiting resolves. */
function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: [], error: null };
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'order', 'in', 'gte', 'insert'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.single = vi.fn(() => Promise.resolve(result()));
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

const { GET } = await import('@/app/api/group/groups/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest() {
  return new NextRequest('http://localhost/api/group/groups', {
    headers: { authorization: 'Bearer token', 'x-forwarded-for': '10.0.0.1' },
  });
}

const GROUPS = [
  { id: 'g1', organizer_id: 'org1', name: 'Level 2', pinned: true },
  { id: 'g2', organizer_id: 'org1', name: 'Sakura Squad', pinned: false },
];

beforeEach(() => {
  _resetStore();
  for (const key of Object.keys(tableData)) delete tableData[key];
  setTable('groups', GROUPS);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/group/groups', () => {
  it('rolls members, cards, weekly XP and today’s activity up per group', async () => {
    setTable('profiles', [
      { id: 'm1', group_id: 'g1', username: 'daisy', display_name: 'Daisy' },
      { id: 'm2', group_id: 'g1', username: 'naomi', display_name: null },
      { id: 'm3', group_id: 'g2', username: 'sora', display_name: 'Sora' },
    ]);
    setTable('user_progress', [
      { user_id: 'm1', total_cards_studied: 500, last_study_date: '2026-07-26' },
      { user_id: 'm2', total_cards_studied: 313, last_study_date: '2026-07-20' },
      { user_id: 'm3', total_cards_studied: 96, last_study_date: '2026-07-26' },
    ]);
    setTable('study_sessions', [
      { user_id: 'm1', xp_earned: 1200 },
      { user_id: 'm1', xp_earned: 640 },
      { user_id: 'm2', xp_earned: 300 },
      { user_id: 'm3', xp_earned: 980 },
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body[0]).toMatchObject({
      id: 'g1',
      memberCount: 2,
      cardsStudied: 813,
      weeklyXp: 2140,
      activeCount: 1,
      faces: [
        { id: 'm1', name: 'Daisy' },
        // display_name is null, so the username stands in
        { id: 'm2', name: 'naomi' },
      ],
    });
    expect(body[1]).toMatchObject({
      id: 'g2',
      memberCount: 1,
      cardsStudied: 96,
      weeklyXp: 980,
      activeCount: 1,
    });
  });

  it('zeroes every stat for a group with no members', async () => {
    setTable('profiles', [{ id: 'm1', group_id: 'g1', username: 'daisy', display_name: 'Daisy' }]);
    setTable('user_progress', []);
    setTable('study_sessions', []);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body[1]).toMatchObject({
      id: 'g2',
      memberCount: 0,
      cardsStudied: 0,
      weeklyXp: 0,
      activeCount: 0,
      faces: [],
    });
  });

  // A member the organizer has not put in a group yet must not inflate any
  // group's counts — group_id is the only thing that assigns them.
  it('ignores members who are not in a group', async () => {
    setTable('profiles', [
      { id: 'm1', group_id: null, username: 'unassigned', display_name: null },
      { id: 'm2', group_id: 'g1', username: 'daisy', display_name: 'Daisy' },
    ]);
    setTable('user_progress', [
      { user_id: 'm1', total_cards_studied: 999, last_study_date: '2026-07-26' },
      { user_id: 'm2', total_cards_studied: 10, last_study_date: null },
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body[0]).toMatchObject({ id: 'g1', memberCount: 1, cardsStudied: 10, activeCount: 0 });
  });

  it('caps the avatar stack at four faces', async () => {
    setTable(
      'profiles',
      Array.from({ length: 6 }, (_, i) => ({
        id: `m${i}`,
        group_id: 'g1',
        username: `member${i}`,
        display_name: null,
      })),
    );

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body[0].memberCount).toBe(6);
    expect(body[0].faces).toHaveLength(4);
  });

  it('500s when the groups query fails', async () => {
    setTable('groups', null, { message: 'boom' });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
