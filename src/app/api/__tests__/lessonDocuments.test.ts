import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';
import { requireOrganizerAccount } from '@/app/api/_lib/requireOrganizerAccount';
import { DOCUMENT_MAX_BYTES } from '@/components/MaterialsBuilder/constants';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

const { createSignedUploadUrlMock, listMock, removeMock } = vi.hoisted(() => ({
  createSignedUploadUrlMock: vi.fn(),
  listMock: vi.fn(),
  removeMock: vi.fn(),
}));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: createSignedUploadUrlMock,
        list: listMock,
        remove: removeMock,
      }),
    },
  }),
}));

import { POST } from '@/app/api/group/lesson-documents/route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/group/lesson-documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  listMock.mockResolvedValue({ data: [], error: null });
  removeMock.mockResolvedValue({ data: [], error: null });
  createSignedUploadUrlMock.mockResolvedValue({
    data: { signedUrl: 'https://storage.test/signed', token: 'upload-token', path: 'ignored' },
    error: null,
  });
});

describe('POST /api/group/lesson-documents', () => {
  it('refuses a member account', async () => {
    vi.mocked(requireOrganizerAccount).mockResolvedValueOnce(
      NextResponse.json(
        { error: 'This feature is not available for member accounts.' },
        {
          status: 403,
        },
      ),
    );

    const res = await POST(makeRequest({ mimeType: 'application/pdf' }));
    expect(res.status).toBe(403);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it('rejects a mime type that is not a PDF or plain text file', async () => {
    const res = await POST(makeRequest({ mimeType: 'image/png' }));
    expect(res.status).toBe(400);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it('rejects a request with no mime type', async () => {
    expect((await POST(makeRequest({}))).status).toBe(400);
  });

  it('mints an upload token under the organizer’s own prefix', async () => {
    const res = await POST(makeRequest({ mimeType: 'application/pdf' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.path).toMatch(/^org1\/[0-9a-f-]{36}\.pdf$/);
    expect(body.token).toBe('upload-token');
    expect(body.maxBytes).toBe(DOCUMENT_MAX_BYTES);
    expect(createSignedUploadUrlMock).toHaveBeenCalledWith(body.path);
  });

  it('names a plain text upload .txt', async () => {
    const res = await POST(makeRequest({ mimeType: 'text/plain' }));
    const body = await res.json();
    expect(body.path).toMatch(/\.txt$/);
  });

  it('sweeps the organizer’s day-old uploads and leaves fresh ones alone', async () => {
    listMock.mockResolvedValueOnce({
      data: [
        { name: 'old.pdf', created_at: new Date(Date.now() - 2 * DAY_MS).toISOString() },
        { name: 'fresh.pdf', created_at: new Date(Date.now() - 60_000).toISOString() },
      ],
      error: null,
    });

    const res = await POST(makeRequest({ mimeType: 'application/pdf' }));
    expect(res.status).toBe(200);
    expect(listMock).toHaveBeenCalledWith('org1');
    expect(removeMock).toHaveBeenCalledWith(['org1/old.pdf']);
  });

  it('removes nothing when every upload is still fresh', async () => {
    listMock.mockResolvedValueOnce({
      data: [{ name: 'fresh.pdf', created_at: new Date().toISOString() }],
      error: null,
    });

    expect((await POST(makeRequest({ mimeType: 'application/pdf' }))).status).toBe(200);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('still mints when the sweep fails', async () => {
    listMock.mockRejectedValueOnce(new Error('storage unreachable'));

    const res = await POST(makeRequest({ mimeType: 'application/pdf' }));
    expect(res.status).toBe(200);
    expect((await res.json()).token).toBe('upload-token');
  });

  it('reports a signing failure as 500', async () => {
    createSignedUploadUrlMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'bucket missing' },
    });

    const res = await POST(makeRequest({ mimeType: 'application/pdf' }));
    expect(res.status).toBe(500);
  });
});
