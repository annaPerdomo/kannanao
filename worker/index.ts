/// <reference lib="webworker" />

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('push', (event) => {
  if (!event.data) return;

  let data: PushPayload;
  try {
    data = event.data.json() as PushPayload;
  } catch {
    return;
  }

  event.waitUntil(
    sw.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    }),
  );
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data as { url?: string })?.url ?? '/';

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing window if one is open
      const existing = clients.find((c) => new URL(c.url).origin === sw.location.origin);
      if (existing) {
        return existing.focus();
      }
      // Otherwise open a new window
      return sw.clients.openWindow(url);
    }),
  );
});
