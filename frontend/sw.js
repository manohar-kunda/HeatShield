const CACHE_NAME = 'heatshield-v9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=9',
  './app.js?v=9',
  './i18n/hi.json?v=9',
  './i18n/en.json?v=9',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For API calls: Network-first with offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return new Response(
            JSON.stringify({
              error: 'Offline mode active',
              dataSource: 'CLIENT_OFFLINE_CACHE'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        });
      })
    );
    return;
  }

  // For HTML and JS: Network-first, fallback to cache
  if (url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // For other static assets (css, icons, manifest): Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
