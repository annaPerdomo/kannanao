import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

const getGroupKanaCourseNeeds = vi.fn();
vi.mock('@/app/api/group/_lib/groupKanaCourseSource', () => ({
  getGroupKanaCourseNeeds: (...args: unknown[]) => getGroupKanaCourseNeeds(...args),
}));

type QueryResult = { data?: unknown; error?: { message: string } | null };
let groupRead: QueryResult = { data: null, error: null };

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from() {
      const chain = {
        select: () => chain,
        eq: () => chain,
        single: () => Promise.resolve(groupRead),
      };
      return chain;
    },
  }),
}));

import { GET } from '@/app/api/group/kana-course/source/route';

const request = (query: string) =>
  new NextRequest(`http://localhost/api/group/kana-course/source${query}`);

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  groupRead = { data: { id: 'g1', organizer_id: 'org1' }, error: null };
  getGroupKanaCourseNeeds.mockResolvedValue({ needs: [], deckCount: 0 });
});

describe('GET /api/group/kana-course/source', () => {
  it('rejects a request with no groupId', async () => {
    const res = await GET(request(''));
    expect(res.status).toBe(400);
    expect(getGroupKanaCourseNeeds).not.toHaveBeenCalled();
  });

  it('refuses a group the caller does not own', async () => {
    groupRead = { data: null, error: null };
    const res = await GET(request('?groupId=g9'));
    expect(res.status).toBe(404);
    expect(getGroupKanaCourseNeeds).not.toHaveBeenCalled();
  });

  it('returns the rows the group decks need', async () => {
    getGroupKanaCourseNeeds.mockResolvedValue({
      needs: [{ setId: 'hira-a', firstDueDate: '2026-09-14' }],
      deckCount: 2,
    });
    const res = await GET(request('?groupId=g1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      needs: [{ setId: 'hira-a', firstDueDate: '2026-09-14' }],
      deckCount: 2,
    });
  });

  it('answers with an error, never a half-built course, when the read fails', async () => {
    getGroupKanaCourseNeeds.mockRejectedValue(new Error('boom'));
    const res = await GET(request('?groupId=g1'));
    expect(res.status).toBe(500);
  });
});
