import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  sb: {
    auth: { getSession: () => mockGetSession() },
  },
  isConfigured: vi.fn(() => true),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockSubscription = {
  endpoint: 'https://push.example.com/sub1',
  toJSON: () => ({
    endpoint: 'https://push.example.com/sub1',
    keys: { p256dh: 'pk', auth: 'ak' },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

const mockPushManager = {
  getSubscription: vi.fn().mockResolvedValue(null),
  subscribe: vi.fn().mockResolvedValue(mockSubscription),
};

const mockServiceWorkerRegistration = {
  pushManager: mockPushManager,
};

import { usePushNotifications } from '@/hooks/usePushNotifications';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    // Reset global mocks
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'default', requestPermission: vi.fn() },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve(mockServiceWorkerRegistration),
      },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'PushManager', {
      value: class {},
      writable: true,
      configurable: true,
    });
  });

  it('detects push support', async () => {
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSupported).toBe(true));
    expect(result.current.permission).toBe('default');
    expect(result.current.isSubscribed).toBe(false);
  });

  it('reports isSubscribed=true when existing subscription found', async () => {
    mockPushManager.getSubscription.mockResolvedValueOnce(mockSubscription);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));
  });

  it('subscribe() requests permission and registers', async () => {
    (Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue('granted');

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(Notification.requestPermission).toHaveBeenCalled();
    expect(mockPushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
    expect(result.current.isSubscribed).toBe(true);

    // Verify it posted to the server
    const postCall = mockFetch.mock.calls[0];
    expect(postCall[0]).toBe('/api/push/subscribe');
    expect(postCall[1].method).toBe('POST');
  });

  it('does not subscribe when permission denied', async () => {
    (Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue('denied');

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.permission).toBe('denied');
    expect(result.current.isSubscribed).toBe(false);
    expect(mockPushManager.subscribe).not.toHaveBeenCalled();
  });

  it('unsubscribe() removes subscription', async () => {
    mockPushManager.getSubscription.mockResolvedValue(mockSubscription);

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    expect(result.current.isSubscribed).toBe(false);

    // Verify it posted to the server
    const postCall = mockFetch.mock.calls[0];
    expect(postCall[0]).toBe('/api/push/unsubscribe');
    expect(postCall[1].method).toBe('POST');
    const body = JSON.parse(postCall[1].body);
    expect(body.endpoint).toBe('https://push.example.com/sub1');
  });
});
