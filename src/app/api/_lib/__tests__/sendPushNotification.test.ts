import { beforeEach, describe, expect, it, vi } from 'vitest';

// VAPID env is read into module-level consts at import time, so it must be set
// before the module under test is imported — vi.hoisted runs first.
vi.hoisted(() => {
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key';
  process.env.VAPID_PRIVATE_KEY = 'test-private-key';
});

const { sendNotificationMock, setVapidDetailsMock } = vi.hoisted(() => ({
  sendNotificationMock: vi.fn(),
  setVapidDetailsMock: vi.fn(),
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: setVapidDetailsMock,
    sendNotification: sendNotificationMock,
  },
}));

// Service supabase: push_subscriptions returns the device rows; direct_messages
// returns the unread count used for the app-icon badge.
const { fromMock, setSubs, setUnread, setUnreadError } = vi.hoisted(() => {
  let subs: unknown[] = [];
  let unread = 0;
  let unreadError: unknown = null;
  const pushChain = {
    select: vi.fn(() => pushChain),
    eq: vi.fn(() => Promise.resolve({ data: subs })),
    delete: vi.fn(() => pushChain),
  };
  const dmChain = {
    select: vi.fn(() => dmChain),
    eq: vi.fn(() => dmChain),
    is: vi.fn(() => Promise.resolve({ count: unreadError ? null : unread, error: unreadError })),
  };
  const fromMock = vi.fn((table: string) => (table === 'push_subscriptions' ? pushChain : dmChain));
  return {
    fromMock,
    setSubs: (s: unknown[]) => {
      subs = s;
    },
    setUnread: (n: number) => {
      unread = n;
    },
    setUnreadError: (e: unknown) => {
      unreadError = e;
    },
  };
});

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({ from: fromMock }),
}));

import { sendPushToUser } from '@/app/api/_lib/sendPushNotification';

describe('sendPushToUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSubs([{ endpoint: 'https://push/1', p256dh: 'k', auth: 'a' }]);
    setUnread(0);
    setUnreadError(null);
    sendNotificationMock.mockResolvedValue({});
  });

  it('includes the recipient unread count as badgeCount in the payload', async () => {
    setUnread(4);

    await sendPushToUser('user-1', { title: 'Hi', body: 'there', url: '/notifications/x' });

    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(sendNotificationMock.mock.calls[0][1] as string);
    expect(payload).toMatchObject({
      title: 'Hi',
      body: 'there',
      url: '/notifications/x',
      badgeCount: 4,
    });
  });

  it('sends badgeCount 0 when the recipient has no unread messages', async () => {
    setUnread(0);

    await sendPushToUser('user-1', { title: 'Hi', body: 'there' });

    const payload = JSON.parse(sendNotificationMock.mock.calls[0][1] as string);
    expect(payload.badgeCount).toBe(0);
  });

  it('omits badgeCount when the unread-count query errors', async () => {
    // A transient count error must not send badgeCount: 0, which would wrongly
    // clear the app badge. Omitting it leaves the existing badge untouched.
    setUnreadError({ message: 'db down' });

    await sendPushToUser('user-1', { title: 'Hi', body: 'there' });

    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(sendNotificationMock.mock.calls[0][1] as string);
    expect('badgeCount' in payload).toBe(false);
  });

  it('does not query or send when the user has no subscriptions', async () => {
    setSubs([]);

    await sendPushToUser('user-1', { title: 'Hi', body: 'there' });

    expect(sendNotificationMock).not.toHaveBeenCalled();
  });
});
