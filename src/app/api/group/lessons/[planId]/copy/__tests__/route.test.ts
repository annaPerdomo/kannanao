import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

const { requireOrganizerAccountMock, requireGroupAccessMock, copyUnitMock } = vi.hoisted(() => ({
  requireOrganizerAccountMock: vi.fn(),
  requireGroupAccessMock: vi.fn(),
  copyUnitMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: (...args: unknown[]) => requireOrganizerAccountMock(...args),
}));
vi.mock('@/app/api/group/_lib/requireGroupAccess', () => ({
  requireGroupAccess: (...args: unknown[]) => requireGroupAccessMock(...args),
}));
vi.mock('@/app/api/group/_lib/copyUnit', () => ({
  copyUnit: (...args: unknown[]) => copyUnitMock(...args),
}));

interface Result {
  data?: unknown;
  error?: unknown;
}

let planResult: Result = { data: null, error: null };

function makeChain() {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(planResult));
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: () => makeChain() }),
}));

import { POST } from '@/app/api/group/lessons/[planId]/copy/route';

const ORGANIZER = { id: 'org1', username: 'teacher', account_type: 'organizer' };
const ACCESS = { organizer: ORGANIZER, group: { id: 'g2' } };

function request(body: unknown) {
  return new NextRequest('http://localhost/api/group/lessons/plan1/copy', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function call(body: unknown) {
  return POST(request(body), { params: Promise.resolve({ planId: 'plan1' }) });
}

describe('POST /api/group/lessons/[planId]/copy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    requireGroupAccessMock.mockResolvedValue(ACCESS);
    planResult = {
      data: {
        id: 'plan1',
        organizer_id: 'org1',
        group_id: 'g1',
        title: 'Unit 1',
        jlpt_level: 'N5',
      },
      error: null,
    };
    copyUnitMock.mockResolvedValue({ status: 'ok', planId: 'plan2', added: 3, skipped: [] });
  });

  it("404s when the plan is not this organizer's", async () => {
    planResult = { data: null, error: null };
    const res = await call({ groupId: 'g2', firstDueDate: '2026-10-13' });
    expect(res.status).toBe(404);
    expect(copyUnitMock).not.toHaveBeenCalled();
  });

  it('400s when groupId is missing', async () => {
    const res = await call({ firstDueDate: '2026-10-13' });
    expect(res.status).toBe(400);
  });

  it('400s on a malformed firstDueDate', async () => {
    const res = await call({ groupId: 'g2', firstDueDate: '10/13/2026' });
    expect(res.status).toBe(400);
  });

  it('400s on a firstDueDate with an invalid calendar month', async () => {
    const res = await call({ groupId: 'g2', firstDueDate: '2026-13-45' });
    expect(res.status).toBe(400);
    expect(copyUnitMock).not.toHaveBeenCalled();
  });

  it('400s with same_group when the target equals the source group', async () => {
    const res = await call({ groupId: 'g1', firstDueDate: '2026-10-13' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'same_group' });
    expect(requireGroupAccessMock).not.toHaveBeenCalled();
  });

  it('passes through a non-200 from requireGroupAccess (target group not owned)', async () => {
    requireGroupAccessMock.mockResolvedValue(
      NextResponse.json({ error: 'Group not found.' }, { status: 404 }),
    );
    const res = await call({ groupId: 'g2', firstDueDate: '2026-10-13' });
    expect(res.status).toBe(404);
  });

  it('returns the added/skipped payload on success', async () => {
    copyUnitMock.mockResolvedValue({
      status: 'ok',
      planId: 'plan2',
      added: 2,
      skipped: [{ deckId: 'd3', name: 'Family' }],
    });
    const res = await call({ groupId: 'g2', firstDueDate: '2026-10-13' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      planId: 'plan2',
      added: 2,
      skipped: [{ deckId: 'd3', name: 'Family' }],
    });
    expect(copyUnitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePlan: { id: 'plan1', group_id: 'g1', title: 'Unit 1', jlpt_level: 'N5' },
        targetGroup: { id: 'g2' },
        firstDueDate: '2026-10-13',
      }),
    );
  });

  it('maps nothing_to_copy to a 409', async () => {
    copyUnitMock.mockResolvedValue({ status: 'nothing_to_copy' });
    const res = await call({ groupId: 'g2', firstDueDate: '2026-10-13' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'nothing_to_copy' });
  });

  it('maps error to a 500', async () => {
    copyUnitMock.mockResolvedValue({ status: 'error' });
    const res = await call({ groupId: 'g2', firstDueDate: '2026-10-13' });
    expect(res.status).toBe(500);
  });
});
