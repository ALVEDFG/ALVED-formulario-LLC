/* ══════════════════════════════════════════════════
   Alved Financial Group — Service Worker v1.0
   Estrategia: Cache-first para assets estáticos,
   Network-first para formularios y APIs
══════════════════════════════════════════════════ */

const CACHE_NAME = 'alved-forms-v1';

const STATIC_ASSETS = [
  '/alved-company-form.html',
  '/alved-company-formation.html',
  '/manifest.json',
  '/ALVED_LOGO-ok_Positivo.png',
  '/empresario-analizando-graficos1.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-apple.png',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap'
];

/* ── INSTALL: pre-cache assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('https://fonts')));
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: limpiar caches viejas ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: estrategia según tipo de request ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* APIs externas (Apps Script, Formspree) → siempre network */
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('formspree.io') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  /* Google Fonts CSS → network con fallback */
  if (url.hostname.includes('fonts.googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  /* Assets estáticos → cache-first */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        /* Offline fallback para navegación */
        if (event.request.mode === 'navigate') {
          return caches.match('/alved-company-form.html');
        }
      });
    })
  );
});
