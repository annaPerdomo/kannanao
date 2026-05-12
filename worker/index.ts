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

  const path = (event.notification.data as { url?: string })?.url ?? '/';
  const absoluteUrl = new URL(path, sw.location.origin).href;

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => new URL(c.url).origin === sw.location.origin);
      if (existing) {
        // Navigate to the notification URL, then focus
        return existing.navigate(absoluteUrl).then((c) => c?.focus());
      }
      return sw.clients.openWindow(absoluteUrl);
    }),
  );
});
