// ============================================================
// SERVICE WORKER v2
// Deux strategies, selon la nature du fichier :
//  - Documents HTML : RESEAU d'abord (cache en secours hors-ligne).
//    Le HTML pointe vers les fichiers de code : s'il est perime,
//    toute l'app reste bloquee sur une ancienne version.
//  - Assets /assets/* : CACHE d'abord. Leur nom contient un hash
//    unique par version, ils sont donc immuables : aucun risque
//    de servir du perime, et l'ouverture reste instantanee.
// ============================================================
const CACHE = 'belfit-v2-2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(c => c !== CACHE).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.pathname.startsWith('/v2/')) return; // ne touche pas au site actuel

  const estDocument = req.mode === 'navigate' || req.destination === 'document';

  if (estDocument) {
    // Reseau d'abord : toujours la derniere version de l'app
    e.respondWith(
      fetch(req)
        .then(rep => {
          const copie = rep.clone();
          caches.open(CACHE).then(c => c.put(req, copie));
          return rep;
        })
        .catch(() => caches.match(req)) // hors-ligne : version en cache
    );
    return;
  }

  // Assets immuables (nom hashe) : cache d'abord, telechargement sinon
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const enCache = await cache.match(req);
      if (enCache) return enCache;
      const rep = await fetch(req);
      if (rep && rep.status === 200) cache.put(req, rep.clone());
      return rep;
    })
  );
});
