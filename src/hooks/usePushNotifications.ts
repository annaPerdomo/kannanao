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
  timeoutMs = 10_000,
): Promise<ServiceWorkerRegistration> {
  // If a controller already exists, .ready resolves immediately
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.ready;
  }
  // On first visit the SW may be installed but not yet controlling — use getRegistration()
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  // Last resort: wait for next-pwa to finish registration
  const ready = navigator.serviceWorker.ready;
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Service worker did not become ready in time. Please try again.')),
      timeoutMs,
    ),
  );
  return Promise.race([ready, timeout]);
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);
    if (!supported) return;

    setPermission(Notification.permission);

    // Check existing subscription via the shared helper (handles iOS PWA where
    // controller may be null on fresh launch from home screen)
    const checkSubscription = async () => {
      try {
        const reg = await getServiceWorkerRegistration();

        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setIsSubscribed(true);
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

          const json = newSub.toJSON();
          const headers = await authHeaders();
          const res = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
          });

          setIsSubscribed(res.ok);
        }
      } catch {
        // Silently fail — user can manually subscribe via the prompt
      }
    };

    void checkSubscription();
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      // Start fetching auth headers and SW registration in parallel while we wait for permission
      const headersPromise = authHeaders();
      const regPromise = getServiceWorkerRegistration();

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const reg = await regPromise;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      // Mark as subscribed immediately so the modal can close
      setIsSubscribed(true);

      // Save to server in the background
      const json = sub.toJSON();
      const headers = await headersPromise;
      fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      })
        .then((res) => {
          if (!res.ok) setIsSubscribed(false);
        })
        .catch(() => {
          // If server save fails, revert so the user can retry
          setIsSubscribed(false);
        });
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, []);

  return { permission, isSubscribed, isSupported, loading, subscribe, unsubscribe };
}
