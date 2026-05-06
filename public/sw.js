const CACHE_NAME = 'dverse-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/splash.png'
];

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately without waiting for
  // existing tabs to close — required for the install prompt to fire reliably.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Take control of all open clients immediately after activation.
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => caches.match("/index.html"))
      );
    })
  );
});
