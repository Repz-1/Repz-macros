// ============================================================
// SERVICE WORKER v2 — strategie "stale-while-revalidate" pour le shell.
// L'app s'ouvre INSTANTANEMENT depuis le cache, et se met a jour en
// arriere-plan pour la prochaine ouverture. C'est ce qui supprime
// l'attente reseau au demarrage (le plafond de perf de l'app actuelle).
// ============================================================
const CACHE = 'belfit-v2-1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(cles => Promise.all(
      cles.filter(c => c !== CACHE).map(c => caches.delete(c))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Ne jamais mettre en cache Firebase / API : ces reponses doivent etre fraiches
  if (!url.pathname.startsWith('/v2/')) return;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const enCache = await cache.match(e.request);
      const reseau = fetch(e.request).then(rep => {
        if (rep && rep.status === 200) cache.put(e.request, rep.clone());
        return rep;
      }).catch(() => enCache);
      // Cache d'abord (instantane), mise a jour en arriere-plan
      return enCache || reseau;
    })
  );
});
