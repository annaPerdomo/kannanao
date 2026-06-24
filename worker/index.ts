/// <reference lib="webworker" />

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  /** Total unread count for the recipient — used to set the app-icon badge. */
  badgeCount?: number;
}

const sw = self as unknown as ServiceWorkerGlobalScope;

// The Badging API lives on navigator in both window and worker scopes, but the
// TS worker lib doesn't declare it. Narrow to the methods we use.
type BadgeNavigator = {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** Mirror the server's unread count onto the app icon. This is the only way an
 * iOS home-screen web app updates its badge (Android badges from the
 * notification automatically), and the push handler is the only code that runs
 * when the app is closed — so the badge must be set here, not just in the page. */
async function syncAppBadge(count: number | undefined): Promise<void> {
  if (typeof count !== 'number') return;
  const nav = sw.navigator as unknown as BadgeNavigator;
  try {
    if (count > 0) await nav.setAppBadge?.(count);
    else await nav.clearAppBadge?.();
  } catch {
    // Badging unsupported (older iOS / not installed) or denied — ignore.
  }
}

sw.addEventListener('push', (event) => {
  if (!event.data) return;

  let data: PushPayload;
  try {
    data = event.data.json() as PushPayload;
  } catch {
    return;
  }

  event.waitUntil(
    (async () => {
      // Always sync the badge from the server's count, even if we suppress the
      // notification below — the icon should reflect unread state regardless.
      await syncAppBadge(data.badgeCount);

      // Don't interrupt someone who's already in the app. A visible same-origin
      // window means the user is actively using the site/PWA, and the in-app
      // realtime handler already surfaces the message (chime + unread badge), so
      // an OS notification would be redundant. Only alert when no window is
      // visible — the app is backgrounded or closed. (Browsers only let us skip
      // showNotification when a client is visible, so this stays within the
      // userVisibleOnly contract.)
      const clients = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const appIsVisible = clients.some(
        (c) => c.visibilityState === 'visible' && new URL(c.url).origin === sw.location.origin,
      );
      if (appIsVisible) return;

      await sw.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: data.url ?? '/' },
        silent: false,
      });
    })(),
  );
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const path = (event.notification.data as { url?: string })?.url ?? '/';
  const absoluteUrl = new URL(path, sw.location.origin).href;

  event.waitUntil(
    (async () => {
      const clients = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clients.find((c) => new URL(c.url).origin === sw.location.origin);
      if (existing) {
        // Focus first — iOS can reject navigate() on uncontrolled clients, in
        // which case the focused app at least comes to the foreground.
        try {
          await existing.focus();
          const navigated = await existing.navigate(absoluteUrl);
          if (navigated) return;
        } catch {
          // fall through to openWindow
        }
      }
      await sw.clients.openWindow(absoluteUrl);
    })(),
  );
});
