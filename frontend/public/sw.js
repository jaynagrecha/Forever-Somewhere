const CACHE = 'forever-somewhere-v4';
let API_BASE = self.location.origin.includes('localhost') ? '' : '';

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CONFIG' && typeof event.data.apiBase === 'string') {
    API_BASE = event.data.apiBase;
  }
});

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/index.html', '/manifest.json'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
  checkNotifications();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html')))
  );
});

self.addEventListener('push', (e) => {
  let data = { title: 'Forever, Somewhere', body: 'Something special is waiting', route: '/dashboard' };
  try {
    data = e.data.json();
  } catch {
    /* default */
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || 'forever',
      icon: '/favicon.svg',
      data: { route: data.route || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const route = e.notification.data?.route || '/dashboard';
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(route);
          return client.focus();
        }
      }
      return self.clients.openWindow(route);
    })
  );
});

async function checkNotifications() {
  try {
    const res = await fetch(`${API_BASE}/api/notifications/feed`);
    if (!res.ok) return;
    const items = await res.json();
    for (const item of items.slice(0, 3)) {
      await self.registration.showNotification(item.title, {
        body: item.body,
        tag: item.tag,
        icon: '/favicon.svg',
        data: { route: item.route },
      });
    }
  } catch {
    /* offline */
  }
}

setInterval(checkNotifications, 12 * 60 * 60 * 1000);
