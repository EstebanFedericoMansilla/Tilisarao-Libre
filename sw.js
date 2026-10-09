// ============================================================================
//  Tilisarao Libre - Service Worker (PWA)
//  Guarda la app para que se pueda instalar y abra rápido.
//  IMPORTANTE: NUNCA se cachea lo que viene de Supabase ni del CDN,
//  así los precios y productos siempre están actualizados.
// ============================================================================

const CACHE_NAME = 'tilisarao-libre-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './auth.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  './apple-touch-icon.png',
  './js/app.js',
  './js/auth.js',
  './js/supabase-client.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(function (error) {
      console.log('Cache installation failed:', error);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Supabase, CDN y todo lo externo: siempre directo, sin cachear
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navegación (páginas): primero internet, si no hay conexión la copia guardada
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
          return response;
        })
        .catch(function () {
          return caches.match(event.request).then(function (cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Imágenes y archivos: primero la copia guardada, y mientras tanto la actualiza
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const network = fetch(event.request)
        .then(function (response) {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return cached;
        });

      return cached || network;
    })
  );
});
