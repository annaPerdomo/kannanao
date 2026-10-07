import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

const {
  requireOrganizerAccountMock,
  requireGroupAccessMock,
  addDeckWeekMock,
  buildReviewWeekMock,
} = vi.hoisted(() => ({
  requireOrganizerAccountMock: vi.fn(),
  requireGroupAccessMock: vi.fn(),
  addDeckWeekMock: vi.fn(),
  buildReviewWeekMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: (...args: unknown[]) => requireOrganizerAccountMock(...args),
}));
vi.mock('@/app/api/group/_lib/requireGroupAccess', () => ({
  requireGroupAccess: (...args: unknown[]) => requireGroupAccessMock(...args),
}));
vi.mock('@/app/api/group/_lib/addDeckWeek', () => ({
  addDeckWeek: (...args: unknown[]) => addDeckWeekMock(...args),
}));
vi.mock('@/app/api/group/_lib/reviewWeek', () => ({
  buildReviewWeek: (...args: unknown[]) => buildReviewWeekMock(...args),
  clampReviewCardCount: (raw: unknown, fallback: number) =>
    typeof raw === 'number' ? raw : fallback,
}));

interface Result {
  data?: unknown;
  error?: unknown;
}

const queues: Record<string, Result[]> = {};
function queue(table: string, ...results: Result[]) {
  queues[table] = [...results];
}
function takeResult(table: string): Result {
  const q = queues[table];
  if (!q || q.length === 0) return { data: null, error: null };
  if (q.length === 1) return q[0];
  return q.shift() as Result;
}

function makeChain(table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(takeResult(table)));
  chain.maybeSingle = vi.fn(() => Promise.resolve(takeResult(table)));
  chain.then = (onf: (v: unknown) => unknown, onr?: (e: unknown) => unknown) =>
    Promise.resolve(takeResult(table)).then(onf, onr);
  return chain;
}

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: (table: string) => makeChain(table) }),
}));

import { POST } from '@/app/api/group/lessons/[planId]/weeks/route';

const ORGANIZER = { id: 'org1', username: 'teacher', account_type: 'organizer' };
const ACCESS = { organizer: ORGANIZER, group: { id: 'g1' } };

function request(body: unknown) {
  return new NextRequest('http://localhost/api/group/lessons/plan1/weeks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function params() {
  return { params: Promise.resolve({ planId: 'plan1' }) };
}

describe('POST /api/group/lessons/[planId]/weeks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    for (const key of Object.keys(queues)) delete queues[key];
    requireOrganizerAccountMock.mockResolvedValue(ORGANIZER);
    requireGroupAccessMock.mockResolvedValue(ACCESS);
    addDeckWeekMock.mockResolvedValue({ status: 'ok', deckId: 'd9' });
    buildReviewWeekMock.mockResolvedValue({ status: 'ok', deckId: 'review-deck' });
    queue('lesson_plans', {
      data: { id: 'plan1', organizer_id: 'org1', group_id: 'g1', title: 'My Unit' },
    });
    queue('lesson_plan_decks', { data: [{ deck_id: 'd1', position: 0 }] });
    queue('planned_assignments', { data: { due_date: '2026-10-13' } });
  });

  it('404s when the plan does not belong to this organizer', async () => {
    queue('lesson_plans', { data: null, error: null });
    const res = await POST(request({ kind: 'review' }), params());
    expect(res.status).toBe(404);
  });

  it('400s on an invalid kind', async () => {
    const res = await POST(request({ kind: 'nope' }), params());
    expect(res.status).toBe(400);
  });

  it('passes through a non-200 from requireGroupAccess', async () => {
    requireGroupAccessMock.mockResolvedValue(
      NextResponse.json({ error: 'Group not found.' }, { status: 404 }),
    );
    const res = await POST(request({ kind: 'review' }), params());
    expect(res.status).toBe(404);
  });

  it('400s when deckId is missing for a deck-kind request', async () => {
    const res = await POST(request({ kind: 'deck' }), params());
    expect(res.status).toBe(400);
    expect(addDeckWeekMock).not.toHaveBeenCalled();
  });

  it('dispatches a deck-kind request at the next position, with the computed dates', async () => {
    const res = await POST(request({ kind: 'deck', deckId: 'd9' }), params());
    expect(res.status).toBe(200);
    expect(addDeckWeekMock).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: 'plan1',
        deckId: 'd9',
        nextPosition: 1,
        dueDate: '2026-10-20',
        availableOn: '2026-10-13',
      }),
    );
    expect(buildReviewWeekMock).not.toHaveBeenCalled();
  });

  it('dispatches a review-kind request with the unit title and deck ids', async () => {
    const res = await POST(request({ kind: 'review' }), params());
    expect(res.status).toBe(200);
    expect(buildReviewWeekMock).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: 'plan1',
        planTitle: 'My Unit',
        unitDeckIds: ['d1'],
        nextPosition: 1,
      }),
    );
  });

  it('maps already_in_unit to a 409', async () => {
    addDeckWeekMock.mockResolvedValue({ status: 'already_in_unit' });
    const res = await POST(request({ kind: 'deck', deckId: 'd9' }), params());
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'already_in_unit' });
  });

  it('maps a link conflict to a 409 distinct from already_in_unit', async () => {
    buildReviewWeekMock.mockResolvedValue({ status: 'conflict' });
    const res = await POST(request({ kind: 'review' }), params());
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'conflict' });
  });

  it('maps not_found and no_cards and error to their statuses', async () => {
    addDeckWeekMock.mockResolvedValue({ status: 'not_found' });
    expect((await POST(request({ kind: 'deck', deckId: 'd9' }), params())).status).toBe(404);

    buildReviewWeekMock.mockResolvedValue({ status: 'no_cards' });
    expect((await POST(request({ kind: 'review' }), params())).status).toBe(400);

    buildReviewWeekMock.mockResolvedValue({ status: 'error' });
    expect((await POST(request({ kind: 'review' }), params())).status).toBe(500);
  });
});
