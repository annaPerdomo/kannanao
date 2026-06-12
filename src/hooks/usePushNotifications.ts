'use client';
import { useCallback, useEffect, useState } from 'react';

import { sb } from '@/lib/supabase';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Convert a base64url VAPID public key to the Uint8Array that PushManager.subscribe() requires */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Get the service worker registration, falling back to getRegistration() if no controller is active yet. */
async function getServiceWorkerRegistration(
  timeoutMs = 30_000,
): Promise<ServiceWorkerRegistration> {
  // If a controller already exists, .ready resolves immediately
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.ready;
  }
  // On first visit the SW may be installed but not yet controlling — use getRegistration(),
  // but only if it has an active worker (pushManager.subscribe requires an active SW).
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;
  // No usable registration. iOS home-screen web apps sometimes launch without
  // next-pwa's auto-registration ever running, and waiting on .ready alone
  // hangs forever in that state — so register the worker ourselves. A throw
  // here is deterministic (redirected /sw.js, MIME mismatch) — fail fast
  // instead of burning the full timeout.
  if (!existing) {
    const reg = await navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
      throw new Error(
        `Service worker registration failed on ${window.location.host}: ${String(err)}`,
      );
    });
    if (reg.active) return reg;
  }
  // Wait for the registered worker to activate
  const ready = navigator.serviceWorker.ready;
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `Service worker not ready on ${window.location.host}. Registration never completed. Please try again.`,
          ),
        ),
      timeoutMs,
    ),
  );
  return Promise.race([ready, timeout]);
}

/** Save a subscription to the server. Returns true when the server accepted it. */
async function saveSubscription(sub: PushSubscription): Promise<boolean> {
  const json = sub.toJSON();
  // The server requires both encryption keys — don't POST a payload it will 400
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
  const headers = await authHeaders();
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  return res.ok;
}

// Result of this page load's server sync (null = not attempted yet). The hook
// mounts in several places and the route is rate limited, so the sync runs
// once and later mounts reuse the outcome — including failures, so a failed
// save doesn't masquerade as subscribed.
let syncResultThisLoad: boolean | null = null;

/** Test-only: clears module-level sync state that would leak between tests. */
export function __resetPushSyncForTests(): void {
  syncResultThisLoad = null;
}

/** iOS/iPadOS running in a browser tab rather than the installed Home Screen
 * app. Apple only delivers web push to home-screen web apps, so this state is
 * unfixable from device Settings — the user has to open (or install) the app.
 * The UI shows install guidance here instead of a dead-end enable button. */
function detectIOSBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ masquerades as desktop Safari ("Macintosh") — touch support
  // is what distinguishes an iPad from an actual Mac
  const isAppleTouchDevice =
    /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  if (!isAppleTouchDevice) return false;
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return !standalone;
}

// Last verified subscription state. Lets the UI decide instantly whether to
// show the enable prompt — checking the real state needs an active service
// worker, which can take a minute to install on a device's first visit.
const SUBSCRIBED_CACHE_KEY = 'kannanao:push-subscribed';

function readCachedSubscribed(): boolean {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
  try {
    // Only trust the cache while permission is still granted
    return (
      localStorage.getItem(SUBSCRIBED_CACHE_KEY) === '1' && Notification.permission === 'granted'
    );
  } catch {
    return false;
  }
}

function cacheSubscribed(value: boolean): void {
  try {
    if (value) localStorage.setItem(SUBSCRIBED_CACHE_KEY, '1');
    else localStorage.removeItem(SUBSCRIBED_CACHE_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribedState] = useState(readCachedSubscribed);
  const [isSupported, setIsSupported] = useState(false);
  const [isIOSBrowser, setIsIOSBrowser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const setIsSubscribed = useCallback((value: boolean) => {
    setIsSubscribedState(value);
    cacheSubscribed(value);
  }, []);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);
    // Detected in an effect (not render) so server and client HTML agree
    setIsIOSBrowser(detectIOSBrowser());
    if (!supported) {
      setInitializing(false);
      return;
    }

    setPermission(Notification.permission);

    // Check existing subscription via the shared helper (handles iOS PWA where
    // controller may be null on fresh launch from home screen)
    const checkSubscription = async () => {
      try {
        const reg = await getServiceWorkerRegistration();

        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Don't trust that the server still has this subscription — the
          // browser keeps it even when the original save failed or the row
          // was lost. Re-upsert it (idempotent) so the server can push again.
          if (syncResultThisLoad === null) {
            syncResultThisLoad = await saveSubscription(sub);
          }
          setIsSubscribed(syncResultThisLoad);
          return;
        }

        // Permission granted but subscription lost (iOS drops subscriptions when PWA is killed).
        // Auto-resubscribe so push keeps working across app launches.
        if (Notification.permission === 'granted') {
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!vapidKey) return;

          const newSub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
          });

          syncResultThisLoad = await saveSubscription(newSub);
          setIsSubscribed(syncResultThisLoad);
        }
      } catch {
        // Silently fail — user can manually subscribe via the prompt
      } finally {
        setInitializing(false);
      }
    };

    void checkSubscription();
  }, [setIsSubscribed]);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error('Push is not configured (missing VAPID public key).');
      }

      // Start the SW registration in parallel while we wait for permission
      const regPromise = getServiceWorkerRegistration();

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const reg = await regPromise;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      // Save to the server before reporting success — a failed save means
      // pushes can't be delivered, and callers surface thrown errors to the
      // user, whereas a background failure would be silent.
      const saved = await saveSubscription(sub);
      syncResultThisLoad = saved;
      setIsSubscribed(saved);
      if (!saved) {
        throw new Error('Could not save the subscription to the server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [setIsSubscribed]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        const res = await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({ endpoint }),
        });
        if (res.ok) setIsSubscribed(false);
      }
    } finally {
      setLoading(false);
    }
  }, [setIsSubscribed]);

  return {
    permission,
    isSubscribed,
    isSupported,
    isIOSBrowser,
    loading,
    initializing,
    subscribe,
    unsubscribe,
  };
}
