const CACHE_NAME = 'planer-v4';
const ASSETS = [
  'index.html',
  'manifest.json',
  'icon-192.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase Live-Anfragen vom Caching komplett ausschließen
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      return cachedResponse || fetch(e.request);
    })
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Familienplaner', body: 'Neues Update!' };
  const options = {
    body: data.body,
    icon: 'icon-192.png',
    badge: 'icon-192.png'
  };
  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
