import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { requireAuthenticatedUserMock } = vi.hoisted(() => ({
  requireAuthenticatedUserMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireAuthenticatedUser', () => ({
  requireAuthenticatedUser: (...args: unknown[]) => requireAuthenticatedUserMock(...args),
}));

const { createSignedUploadUrlMock, getPublicUrlMock } = vi.hoisted(() => ({
  createSignedUploadUrlMock: vi.fn(),
  getPublicUrlMock: vi.fn(),
}));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: createSignedUploadUrlMock,
        getPublicUrl: getPublicUrlMock,
      }),
    },
  }),
}));

import { POST } from '@/app/api/messages/upload-video/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MEMBER = { id: 'm1', username: 'kid', account_type: 'member' };

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/messages/upload-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/messages/upload-video', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    requireAuthenticatedUserMock.mockResolvedValue(MEMBER);
    createSignedUploadUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://storage.example/signed', token: 'tok-abc' },
      error: null,
    });
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'https://storage.example/public/video.mp4' },
    });
  });

  it('returns 401 when unauthenticated', async () => {
    requireAuthenticatedUserMock.mockResolvedValue(
      NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
    );
    const res = await POST(makeRequest({ mimeType: 'video/mp4' }));
    expect(res.status).toBe(401);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it('rejects a disallowed mime type', async () => {
    const res = await POST(makeRequest({ mimeType: 'application/zip' }));
    expect(res.status).toBe(400);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it('returns a signed upload URL and public URL for an allowed video type', async () => {
    const res = await POST(makeRequest({ mimeType: 'video/mp4' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      signedUrl: 'https://storage.example/signed',
      token: 'tok-abc',
      publicUrl: 'https://storage.example/public/video.mp4',
    });
    expect(body.path).toMatch(/^chat-video\/.+\.mp4$/);
  });

  it('returns 500 when Storage fails to mint a signed URL', async () => {
    createSignedUploadUrlMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await POST(makeRequest({ mimeType: 'video/mp4' }));
    expect(res.status).toBe(500);
  });
});
