/* BELFIT service worker — installabilité + hors-ligne de base */
const CACHE = 'belfit-v68';
const CORE = ['./index.html','./main.html','./i18n.js','./i18n-strings.js','./app.html','./manifest.json','./icon-192-v7.png','./icon-512-v7.png','./belfit-logo-header.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // ne pas intercepter Firebase/CDN

  // HTML : réseau d'abord (pas de cache périmé), cache en secours (hors-ligne)
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./app.html')))
    );
    return;
  }

  // Assets (images, manifest) : cache d'abord
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
