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

import { __resetPushSyncForTests, usePushNotifications } from '@/hooks/usePushNotifications';

function setNavigatorUA(ua: string, maxTouchPoints: number) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, writable: true, configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    writable: true,
    configurable: true,
  });
}

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
// iPadOS 13+ reports a desktop Safari UA; only touch support reveals the iPad
const IPAD_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    __resetPushSyncForTests();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    // Re-pin default implementations (clearAllMocks clears calls, not impls
    // set inside individual tests)
    mockPushManager.getSubscription.mockResolvedValue(null);
    mockPushManager.subscribe.mockResolvedValue(mockSubscription);
    mockSubscription.unsubscribe.mockResolvedValue(true);
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY =
      'BMzxvStvWYWHYO8PY8BzJfdsJ1f2rZUeVdmHD4owqg8dcTfH2Aik1DYMo_GKY4LTqkLX7xI1QALGfZBcF8Z0oTw';

    // Reset global mocks
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'default', requestPermission: vi.fn() },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve(mockServiceWorkerRegistration),
        controller: {},
        register: vi.fn().mockResolvedValue(mockServiceWorkerRegistration),
      },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'PushManager', {
      value: class {},
      writable: true,
      configurable: true,
    });
    // Default to a non-Apple, non-touch environment; iOS tests override
    setNavigatorUA('Mozilla/5.0 (X11; Linux x86_64) jsdom', 0);
    Object.defineProperty(window, 'matchMedia', {
      value: undefined,
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

  it('skips the mount re-upsert when the endpoint was synced within 24h', async () => {
    localStorage.setItem(
      'kannanao:push-synced',
      JSON.stringify({ endpoint: mockSubscription.endpoint, at: Date.now() }),
    );
    mockPushManager.getSubscription.mockResolvedValueOnce(mockSubscription);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));
    expect(mockFetch.mock.calls.find((c) => c[0] === '/api/push/subscribe')).toBeUndefined();
  });

  it('still re-upserts when the sync stamp is stale or for another endpoint', async () => {
    localStorage.setItem(
      'kannanao:push-synced',
      JSON.stringify({ endpoint: 'https://push.example.com/other', at: Date.now() }),
    );
    mockPushManager.getSubscription.mockResolvedValueOnce(mockSubscription);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));
    expect(mockFetch.mock.calls.find((c) => c[0] === '/api/push/subscribe')).toBeTruthy();
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
      applicationServerKey: expect.any(Uint8Array),
    });
    expect(result.current.isSubscribed).toBe(true);

    // Verify it posted to the server
    const postCall = mockFetch.mock.calls[0];
    expect(postCall[0]).toBe('/api/push/subscribe');
    expect(postCall[1].method).toBe('POST');
  });

  it('re-syncs an existing browser subscription to the server on mount', async () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'granted', requestPermission: vi.fn() },
      writable: true,
      configurable: true,
    });
    mockPushManager.getSubscription.mockResolvedValue(mockSubscription);

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));

    const postCall = mockFetch.mock.calls.find((c) => c[0] === '/api/push/subscribe');
    expect(postCall).toBeDefined();
    expect(JSON.parse(postCall![1].body).endpoint).toBe(mockSubscription.endpoint);
  });

  it('stays unsubscribed when the mount sync fails, so the prompt can reappear', async () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'granted', requestPermission: vi.fn() },
      writable: true,
      configurable: true,
    });
    mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) });

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.initializing).toBe(false));
    expect(result.current.isSubscribed).toBe(false);
    expect(localStorage.getItem('kannanao:push-subscribed')).toBeNull();
  });

  it('registers the service worker itself when none exists', async () => {
    const register = vi.fn().mockResolvedValue({
      active: {},
      pushManager: mockPushManager,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        controller: null,
        getRegistration: vi.fn().mockResolvedValue(undefined),
        register,
        ready: new Promise(() => {}),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.initializing).toBe(false));
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('subscribe() fails fast when service worker registration is rejected', async () => {
    (Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue('granted');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        controller: null,
        getRegistration: vi.fn().mockResolvedValue(undefined),
        register: vi.fn().mockRejectedValue(new TypeError('Script redirect not allowed')),
        ready: new Promise(() => {}),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    await expect(
      act(async () => {
        await result.current.subscribe();
      }),
    ).rejects.toThrow(/registration failed/i);
  });

  it('starts subscribed from cache when permission is granted', async () => {
    localStorage.setItem('kannanao:push-subscribed', '1');
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'granted', requestPermission: vi.fn() },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePushNotifications());
    // Known instantly, before any service worker check resolves
    expect(result.current.isSubscribed).toBe(true);
    await waitFor(() => expect(result.current.initializing).toBe(false));
  });

  it('ignores the subscribed cache when permission is not granted', async () => {
    localStorage.setItem('kannanao:push-subscribed', '1');

    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSubscribed).toBe(false);
    await waitFor(() => expect(result.current.initializing).toBe(false));
  });

  it('subscribe() throws when VAPID public key is missing', async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isSupported).toBe(true));

    await expect(
      act(async () => {
        await result.current.subscribe();
      }),
    ).rejects.toThrow(/VAPID/);
    expect(mockPushManager.subscribe).not.toHaveBeenCalled();
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

  // ── isIOSBrowser (install guidance for Safari tabs on iPhone/iPad) ────────

  it('flags an iPhone Safari tab as iOS browser', async () => {
    setNavigatorUA(IPHONE_UA, 5);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isIOSBrowser).toBe(true));
  });

  it('flags an iPad Safari tab (desktop-class UA) as iOS browser', async () => {
    setNavigatorUA(IPAD_DESKTOP_UA, 5);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isIOSBrowser).toBe(true));
  });

  it('does not flag the installed Home Screen app (standalone display mode)', async () => {
    setNavigatorUA(IPAD_DESKTOP_UA, 5);
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn((query: string) => ({ matches: query === '(display-mode: standalone)' })),
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.initializing).toBe(false));
    expect(result.current.isIOSBrowser).toBe(false);
  });

  it('does not flag a real Mac (no touch points)', async () => {
    setNavigatorUA(IPAD_DESKTOP_UA, 0);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.initializing).toBe(false));
    expect(result.current.isIOSBrowser).toBe(false);
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

    // Verify it posted to the server (the mount-time sync POSTs first)
    const postCall = mockFetch.mock.calls.find((c) => c[0] === '/api/push/unsubscribe');
    expect(postCall).toBeDefined();
    expect(postCall![1].method).toBe('POST');
    const body = JSON.parse(postCall![1].body);
    expect(body.endpoint).toBe('https://push.example.com/sub1');
  });
});
