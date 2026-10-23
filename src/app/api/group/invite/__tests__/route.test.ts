import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireOrganizerAccountMock } = vi.hoisted(() => ({
  requireOrganizerAccountMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: (...args: unknown[]) => requireOrganizerAccountMock(...args),
}));

vi.mock('@/app/api/_lib/rateLimit', () => ({ rateLimit: vi.fn().mockResolvedValue(null) }));

vi.mock('../../_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
  }),
}));

import { POST } from '../route';

function makeRequest() {
  return new NextRequest('http://localhost/api/group/invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
}

describe('POST /api/group/invite — demo organizer guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('403s a demo organizer with DEMO_NO_INVITES, keeping real people out of the demo group', async () => {
    requireOrganizerAccountMock.mockResolvedValue({
      id: 'org1',
      username: 'demo-teacher',
      isDemo: true,
      account_type: 'organizer',
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('DEMO_NO_INVITES');
  });
});
