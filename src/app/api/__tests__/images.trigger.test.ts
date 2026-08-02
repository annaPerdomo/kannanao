import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import { requireOrganizerAccount } from '@/app/api/_lib/requireOrganizerAccount';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash-key';
  vi.mocked(requireOrganizerAccount).mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  } as Awaited<ReturnType<typeof requireOrganizerAccount>>);
  mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
});

import { POST } from '@/app/api/images/trigger/route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/images/trigger', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/images/trigger', () => {
  it('pings a real Unsplash download location', async () => {
    const res = await POST(
      makeRequest({ downloadLocation: 'https://api.unsplash.com/photos/abc/download?ixid=1' }),
    );

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.unsplash.com/photos/abc/download?ixid=1',
      expect.objectContaining({
        headers: { Authorization: 'Client-ID test-unsplash-key' },
      }),
    );
  });

  // The ping carries our access key, so a location the caller made up would
  // hand that key to whatever host it named.
  it.each([
    'https://attacker.example/collect',
    'http://api.unsplash.com/photos/abc/download',
    'http://169.254.169.254/latest/meta-data/',
    'not a url',
  ])('refuses %s', async (downloadLocation) => {
    const res = await POST(makeRequest({ downloadLocation }));

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects a member account', async () => {
    vi.mocked(requireOrganizerAccount).mockResolvedValue(
      NextResponse.json({ error: 'Organizer account required' }, { status: 403 }),
    );

    const res = await POST(
      makeRequest({ downloadLocation: 'https://api.unsplash.com/photos/abc/download' }),
    );

    expect(res.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('requires a download location', async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
  });
});
