import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

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
  const result = () => tableData[table] ?? { data: null, error: null };
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'update'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.single = vi.fn(() => Promise.resolve(result()));
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    Promise.resolve(result()).then(onfulfilled, onrejected);
  return chain;
}

const fromMock = vi.fn((table: string) => makeChain(table));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: fromMock }),
}));

import { PATCH } from '@/app/api/group/assignments/[id]/route';

const ORGANIZER = { id: 'org-1', username: 'teacher', account_type: 'organizer' };

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/group/assignments/a1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: 'Bearer tok' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/group/assignments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const k of Object.keys(tableData)) delete tableData[k];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
  });

  it('returns 403 when the requester is not an organizer', async () => {
    requireOrganizerAccountMock.mockResolvedValue(
      NextResponse.json({ error: 'Organizers only.' }, { status: 403 }),
    );
    const res = await PATCH(makeRequest({ baselineAccuracy: 90 }), {
      params: Promise.resolve({ id: 'a1' }),
    });
    expect(res.status).toBe(403);
  });

  it('rejects baselineAccuracy on a kana assignment', async () => {
    setTable('assignments', { id: 'a1', kana_set: 'hira-ka' });
    const res = await PATCH(makeRequest({ baselineAccuracy: 90 }), {
      params: Promise.resolve({ id: 'a1' }),
    });
    expect(res.status).toBe(400);
  });

  it('writes baseline_accuracy on a deck assignment', async () => {
    setTable('assignments', { id: 'a1', kana_set: null });
    const res = await PATCH(makeRequest({ baselineAccuracy: 90 }), {
      params: Promise.resolve({ id: 'a1' }),
    });
    expect(res.status).toBe(200);
  });
});
