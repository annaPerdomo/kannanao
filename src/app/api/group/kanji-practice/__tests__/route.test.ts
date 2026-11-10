import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

const requireGroupAccessMock = vi.fn();
const groupUsesKanjiPracticeMock = vi.fn();
vi.mock('@/app/api/group/_lib/requireGroupAccess', () => ({
  requireGroupAccess: (...args: unknown[]) => requireGroupAccessMock(...args),
}));
vi.mock('@/app/api/group/_lib/groupKanjiPractice', () => ({
  groupUsesKanjiPractice: (...args: unknown[]) => groupUsesKanjiPracticeMock(...args),
}));
vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({ getServiceSupabase: () => ({}) }));

import { GET } from '@/app/api/group/kanji-practice/route';

const request = (query: string) =>
  new NextRequest(`http://localhost/api/group/kanji-practice?${query}`, { method: 'GET' });

describe('GET /api/group/kanji-practice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    requireGroupAccessMock.mockResolvedValue({ organizer: { id: 'org1' }, group: { id: 'g1' } });
    groupUsesKanjiPracticeMock.mockResolvedValue(true);
  });

  it('400s without a groupId', async () => {
    expect((await GET(request(''))).status).toBe(400);
  });

  it('passes through a refusal from requireGroupAccess', async () => {
    requireGroupAccessMock.mockResolvedValue(NextResponse.json({ error: 'no' }, { status: 403 }));
    expect((await GET(request('groupId=g1'))).status).toBe(403);
    expect(groupUsesKanjiPracticeMock).not.toHaveBeenCalled();
  });

  it("answers for the caller's own group", async () => {
    const res = await GET(request('groupId=g1'));
    expect(await res.json()).toEqual({ inUse: true });
    expect(groupUsesKanjiPracticeMock).toHaveBeenCalledWith(expect.anything(), {
      organizerId: 'org1',
      groupId: 'g1',
    });
  });
});
