import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { requireOrganizerAccountMock } = vi.hoisted(() => ({
  requireOrganizerAccountMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: (...args: unknown[]) => requireOrganizerAccountMock(...args),
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

function makeChain(table: string) {
  const asPromise = () => Promise.resolve(tableData[table] ?? { data: null, error: null });
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'in', 'gte', 'limit', 'order'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    asPromise().then(onfulfilled, onrejected);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

import { dayRange, localDay } from '@/app/api/group/_lib/activityDays';
import { GET } from '@/app/api/group/activity/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORGANIZER = { id: 'org-1', username: 'teacher', account_type: 'organizer' };
const NY = -300; // UTC-5, in minutes east of UTC

function request(query: string) {
  return new NextRequest(`http://localhost/api/group/activity?${query}`, { method: 'GET' });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('day bucketing', () => {
  // The whole point of shipping tzOffset: 9pm in New York is still "today".
  it('files a late-evening local session under the local day', () => {
    expect(localDay(new Date('2026-08-03T01:30:00Z'), NY)).toBe('2026-08-02');
  });

  it('files the same instant under the next day in UTC', () => {
    expect(localDay(new Date('2026-08-03T01:30:00Z'), 0)).toBe('2026-08-03');
  });

  it('ends the range on the local today, oldest first', () => {
    const days = dayRange(3, NY, new Date('2026-08-02T12:00:00Z'));
    expect(days).toEqual(['2026-07-31', '2026-08-01', '2026-08-02']);
  });
});

describe('GET /api/group/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const key of Object.keys(tableData)) delete tableData[key];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refuses a member account', async () => {
    requireOrganizerAccountMock.mockResolvedValue(
      NextResponse.json({ error: 'Organizer only.' }, { status: 403 }),
    );
    const res = await GET(request('groupId=g1'));
    expect(res.status).toBe(403);
  });

  it('returns a zeroed window when the group has no members', async () => {
    setTable('profiles', []);
    const res = await GET(request('groupId=g1&days=3&tzOffset=0'));
    const body = await res.json();
    expect(body.days).toEqual(['2026-07-31', '2026-08-01', '2026-08-02']);
    expect(body.totals.cards).toEqual([0, 0, 0]);
    expect(body.members).toEqual([]);
  });

  // A fractional count would walk the buckets off the day boundary, so the
  // window would stop short of today and lose the sessions that just happened.
  it('floors a fractional day count so the window still ends on today', async () => {
    setTable('profiles', []);
    const res = await GET(request('groupId=g1&days=3.7&tzOffset=0'));
    const body = await res.json();
    expect(body.days).toEqual(['2026-07-31', '2026-08-01', '2026-08-02']);
  });

  it('sums cards and XP per day and per member', async () => {
    setTable('profiles', [
      { id: 'm1', username: 'naomi', display_name: 'Naomi' },
      { id: 'm2', username: 'taro', display_name: null },
    ]);
    setTable('study_sessions', [
      { user_id: 'm1', cards_studied: 10, xp_earned: 30, started_at: '2026-08-01T09:00:00Z' },
      { user_id: 'm1', cards_studied: 5, xp_earned: 15, started_at: '2026-08-01T18:00:00Z' },
      { user_id: 'm2', cards_studied: 7, xp_earned: 20, started_at: '2026-08-02T08:00:00Z' },
    ]);

    const res = await GET(request('groupId=g1&days=3&tzOffset=0'));
    const body = await res.json();

    expect(body.totals.cards).toEqual([0, 15, 7]);
    expect(body.totals.xp).toEqual([0, 45, 20]);
    expect(body.members).toEqual([
      { id: 'm1', name: 'Naomi', daily: [0, 15, 0] },
      { id: 'm2', name: 'taro', daily: [0, 0, 7] },
    ]);
  });

  it('drops sessions that fall outside the window', async () => {
    setTable('profiles', [{ id: 'm1', username: 'naomi', display_name: 'Naomi' }]);
    setTable('study_sessions', [
      { user_id: 'm1', cards_studied: 99, xp_earned: 99, started_at: '2026-07-20T09:00:00Z' },
    ]);

    const res = await GET(request('groupId=g1&days=3&tzOffset=0'));
    const body = await res.json();
    expect(body.totals.cards).toEqual([0, 0, 0]);
    expect(body.members[0].daily).toEqual([0, 0, 0]);
  });

  it('tallies sessions by practice mode, cards-studied descending', async () => {
    setTable('profiles', [{ id: 'm1', username: 'naomi', display_name: 'Naomi' }]);
    setTable('study_sessions', [
      {
        user_id: 'm1',
        cards_studied: 10,
        cards_correct: 8,
        xp_earned: 30,
        practice_mode: 'quiz',
        started_at: '2026-08-01T09:00:00Z',
      },
      {
        user_id: 'm1',
        cards_studied: 20,
        cards_correct: 20,
        xp_earned: 40,
        practice_mode: null,
        started_at: '2026-08-01T18:00:00Z',
      },
    ]);

    const res = await GET(request('groupId=g1&days=3&tzOffset=0'));
    const body = await res.json();

    expect(body.modeBreakdown).toEqual([
      { mode: 'study', sessions: 1, cardsStudied: 20, cardsCorrect: 20, accuracy: 100 },
      { mode: 'quiz', sessions: 1, cardsStudied: 10, cardsCorrect: 8, accuracy: 80 },
    ]);
  });
});
