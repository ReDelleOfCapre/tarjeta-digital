const CACHE = 'vynk-v2';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Network-first for everything to ensure latest VYNK design & features
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response.status === 200 && e.request.method === 'GET' && !url.pathname.startsWith('/api/')) {
          const resClone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
