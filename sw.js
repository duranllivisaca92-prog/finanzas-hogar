/* Service worker de Finanzas del hogar.
   Guarda la app para que abra sin conexión. Los datos NO pasan por aquí:
   las llamadas a la base de datos van directo a la red y la app guarda su propia copia. */
const VERSION = 'fh-v1';
const SHELL = [
  './', 'index.html', 'config.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tipografías: se guardan al usarse por primera vez.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSION).then(cache =>
        cache.match(req).then(hit => {
          const net = fetch(req).then(res => { cache.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // Todo lo demás de la propia app: primero la red (así llegan las mejoras), si no hay red, la copia guardada.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
    );
  }
  // Otros orígenes (la base de datos): no se interceptan.
});
