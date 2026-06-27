const CACHE = 'forever-somewhere-v7';
let API_BASE = 'https://forever-somewhere-api.onrender.com';

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CONFIG' && typeof event.data.apiBase === 'string') {
    API_BASE = event.data.apiBase || API_BASE;
  }
});

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/manifest.json', '/favicon.svg']).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const { pathname } = new URL(e.request.url);
  if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('text/html')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => {
          if (cached) return cached;
          return caches.match('/index.html');
        })
      )
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
