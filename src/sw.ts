import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

// Minimal service-worker scope types (project compiles with DOM lib only)
interface SWScope {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
  registration: { showNotification(title: string, options?: Record<string, unknown>): Promise<void> };
  clients: {
    matchAll(options?: Record<string, unknown>): Promise<Array<{ url: string; navigate(url: string): Promise<unknown>; focus(): Promise<unknown> }>>;
    openWindow(url: string): Promise<unknown>;
  };
  addEventListener(type: string, listener: (event: Event) => void): void;
  skipWaiting(): Promise<void>;
  location: { origin: string };
}
declare const self: SWScope;
interface PushEvent extends Event {
  data?: { json(): { title?: string; body?: string; link?: string } };
  waitUntil(promise: Promise<unknown>): void;
}
interface NotificationClickEvent extends Event {
  notification: { close(): void; data?: { url?: string } };
  waitUntil(promise: Promise<unknown>): void;
}

const sw = self;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

sw.addEventListener('push', (event) => {
  const e = event as PushEvent;
  let payload: { title?: string; body?: string; link?: string } = {};
  try { payload = e.data?.json() ?? {}; } catch { /* empty payload */ }
  e.waitUntil(sw.registration.showNotification(payload.title ?? 'Propel Works', {
    body: payload.body ?? '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    data: { url: payload.link ?? '/' },
  }));
});

sw.addEventListener('notificationclick', (event) => {
  const e = event as NotificationClickEvent;
  e.notification.close();
  const url = e.notification.data?.url ?? '/';
  e.waitUntil(sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const existing = clients.find(c => c.url.includes(self.location.origin));
    if (existing) { void existing.navigate(url); return existing.focus(); }
    return sw.clients.openWindow(url);
  }));
});
