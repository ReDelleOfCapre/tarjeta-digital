const CACHE = 'vynk-v6';

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
  // Ignorar peticiones no-HTTP/HTTPS (extensiones de navegador chrome-extension://, moz-extension://)
  if (!e.request.url.startsWith('http://') && !e.request.url.startsWith('https://')) return;

  const url = new URL(e.request.url);

  // Network-first para garantizar diseño y funciones VYNK en tiempo real con fallback seguro
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response && response.status === 200 && e.request.method === 'GET' && !url.pathname.startsWith('/api/')) {
          const resClone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, resClone)).catch(function(){});
        }
        return response;
      })
      .catch(function(err) {
        return caches.match(e.request).then(function(cached) {
          if (cached) return cached;
          return new Response('Red no disponible', { status: 503, statusText: 'Offline' });
        }).catch(function() {
          return new Response('Red no disponible', { status: 503 });
        });
      })
  );
});
