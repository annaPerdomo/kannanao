import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Authenticated as a plain user object (not a NextResponse) so the route runs.
vi.mock('@/app/api/_lib/requireAuthenticatedUser', () => ({
  requireAuthenticatedUser: vi.fn().mockResolvedValue({
    id: 'user-1',
    username: 'kid',
    account_type: 'member',
  }),
}));

const { fromMock, deleteMock, eqMock, neqMock, upsertMock } = vi.hoisted(() => {
  const neqMock = vi.fn();
  const eqMock = vi.fn(() => ({ neq: neqMock }));
  const deleteMock = vi.fn(() => ({ eq: eqMock }));
  const upsertMock = vi.fn();
  const fromMock = vi.fn(() => ({ delete: deleteMock, upsert: upsertMock }));
  return { fromMock, deleteMock, eqMock, neqMock, upsertMock };
});

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: fromMock }),
}));

import { POST } from '@/app/api/push/subscribe/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_BODY = {
  endpoint: 'https://push.example.com/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
};

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    neqMock.mockResolvedValue({ error: null });
    upsertMock.mockResolvedValue({ error: null });
  });

  it('returns 400 when endpoint or keys are missing', async () => {
    const res = await POST(makeRequest({ endpoint: 'https://x' }));
    expect(res.status).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('releases the endpoint from any other user before recording this user', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);

    // A device's endpoint may already be claimed by another account (shared
    // device). It must be released so the previous user stops getting this
    // device's pushes — otherwise the current user receives notifications for
    // messages they themselves send to that other account.
    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith('endpoint', VALID_BODY.endpoint);
    expect(neqMock).toHaveBeenCalledWith('user_id', 'user-1');

    // Then this user's subscription is upserted for the same endpoint.
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', endpoint: VALID_BODY.endpoint }),
      expect.objectContaining({ onConflict: 'user_id,endpoint' }),
    );
  });

  it('still records the subscription when releasing the old claim fails', async () => {
    neqMock.mockResolvedValue({ error: { message: 'delete blocked' } });

    const res = await POST(makeRequest(VALID_BODY));

    // The release is best-effort — a failure must not drop the current user's
    // own subscription.
    expect(res.status).toBe(201);
    expect(upsertMock).toHaveBeenCalled();
  });

  it('returns 500 when the upsert fails', async () => {
    upsertMock.mockResolvedValue({ error: { message: 'db down' } });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
