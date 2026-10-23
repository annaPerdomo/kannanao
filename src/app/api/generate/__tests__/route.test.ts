import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireOrganizerAccountMock } = vi.hoisted(() => ({
  requireOrganizerAccountMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: (...args: unknown[]) => requireOrganizerAccountMock(...args),
}));

vi.mock('@/app/api/_lib/rateLimit', () => ({ rateLimit: vi.fn().mockResolvedValue(null) }));

import { POST } from '../route';

function makeRequest() {
  return new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pendingWords: ['犬'] }),
  });
}

describe('POST /api/generate — demo account guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('403s a demo organizer via rejectDemo, before any Gemini call', async () => {
    requireOrganizerAccountMock.mockResolvedValue({
      id: 'org1',
      username: 'demo-teacher',
      account_type: 'organizer',
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('DEMO_ACCOUNT_BLOCKED');
  });

  it('lets a real organizer through the guard', async () => {
    requireOrganizerAccountMock.mockResolvedValue({
      id: 'org1',
      username: 'organizer1',
      account_type: 'organizer',
    });
    // The Gemini call itself isn't under test here; a missing API key 500s
    // after the guard has already run, which is all this assertion needs.
    const res = await POST(makeRequest());
    expect(res.status).not.toBe(403);
  });
});
