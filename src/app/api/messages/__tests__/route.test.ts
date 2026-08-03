import type * as NextServer from 'next/server';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/server', async (importActual) => {
  const actual = await importActual<typeof NextServer>();
  // after() normally keeps the lambda alive for a background push notification;
  // outside a real request context it has nothing to hook into, so no-op it.
  return { ...actual, after: vi.fn() };
});

const { requireAuthenticatedUserMock } = vi.hoisted(() => ({
  requireAuthenticatedUserMock: vi.fn(),
}));

vi.mock('@/app/api/_lib/requireAuthenticatedUser', () => ({
  requireAuthenticatedUser: (...args: unknown[]) => requireAuthenticatedUserMock(...args),
}));

vi.mock('@/app/api/_lib/sendPushNotification', () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

const tableData: Record<string, { data: unknown; error: unknown }> = {};
function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: null, error: null };
  const asPromise = () => Promise.resolve(result());
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'limit', 'insert'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.single = vi.fn(() => asPromise());
  chain.maybeSingle = vi.fn(() => asPromise());
  chain.then = (onful: (v: unknown) => unknown, onrej?: (e: unknown) => unknown) =>
    asPromise().then(onful, onrej);
  return chain;
}

const fromMock = vi.fn((table: string) => makeChain(table));
const listMock = vi.fn();
const removeMock = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from: fromMock,
    storage: { from: () => ({ list: listMock, remove: removeMock }) },
  }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co';

const { POST } = await import('@/app/api/messages/route');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MEMBER = { id: 'm1', username: 'kid', account_type: 'member', organizer_id: 'org1' };
const CHAT_IMAGE_URL = 'https://proj.supabase.co/storage/v1/object/public/card-images/chat/a.jpg';
const CHAT_VIDEO_URL =
  'https://proj.supabase.co/storage/v1/object/public/card-images/chat-video/a.mp4';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetStore();
    requireAuthenticatedUserMock.mockResolvedValue(MEMBER);
    // The sender learns in org1's group, which is who they are messaging.
    setTable('group_members', [{ group_id: 'g1', organizer_id: 'org1', member_id: 'm1' }]);
    setTable('direct_messages', {
      id: 'd1',
      sender_id: 'm1',
      recipient_id: 'org1',
      message: null,
      video_url: CHAT_VIDEO_URL,
    });
    // Default: storage reports the uploaded video as comfortably under the cap.
    listMock.mockResolvedValue({
      data: [{ name: 'a.mp4', metadata: { size: 1024 } }],
      error: null,
    });
  });

  it('requires at least one of message, imageUrl, or videoUrl', async () => {
    const res = await POST(makeRequest({ recipientId: 'org1' }));
    expect(res.status).toBe(400);
  });

  it('rejects a videoUrl outside the allowed chat-video prefix', async () => {
    const res = await POST(
      makeRequest({ recipientId: 'org1', videoUrl: 'https://evil.example/x.mp4' }),
    );
    expect(res.status).toBe(400);
  });

  it('accepts a valid videoUrl and stores it', async () => {
    const res = await POST(makeRequest({ recipientId: 'org1', videoUrl: CHAT_VIDEO_URL }));
    expect(res.status).toBe(201);
    const insertCall = fromMock.mock.results.find(
      (r, i) => fromMock.mock.calls[i][0] === 'direct_messages',
    );
    expect(insertCall).toBeTruthy();
    const chain = insertCall!.value as { insert: ReturnType<typeof vi.fn> };
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ video_url: CHAT_VIDEO_URL }),
    );
  });

  it('rejects an oversized video with a size-specific error and deletes the object', async () => {
    listMock.mockResolvedValue({
      data: [{ name: 'a.mp4', metadata: { size: 25 * 1024 * 1024 } }],
      error: null,
    });
    const res = await POST(makeRequest({ recipientId: 'org1', videoUrl: CHAT_VIDEO_URL }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/20 ?MB/i);
    expect(removeMock).toHaveBeenCalledWith(['chat-video/a.mp4']);
  });

  it('rejects a videoUrl whose object cannot be found in storage', async () => {
    listMock.mockResolvedValue({ data: [], error: null });
    const res = await POST(makeRequest({ recipientId: 'org1', videoUrl: CHAT_VIDEO_URL }));
    expect(res.status).toBe(400);
  });

  it('rejects an imageUrl outside the allowed chat prefix', async () => {
    const res = await POST(
      makeRequest({ recipientId: 'org1', imageUrl: 'https://evil.example/x.jpg' }),
    );
    expect(res.status).toBe(400);
  });

  it('accepts a valid imageUrl', async () => {
    const res = await POST(makeRequest({ recipientId: 'org1', imageUrl: CHAT_IMAGE_URL }));
    expect(res.status).toBe(201);
  });
});
