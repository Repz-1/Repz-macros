/* BELFIT service worker — toujours a jour + hors-ligne
 *
 * Strategie HTML : RESEAU D'ABORD, cache en secours.
 * En ligne, l'utilisateur voit toujours la derniere version des le
 * premier lancement. Hors ligne (salle de sport, metro), la copie
 * locale prend le relais : l'app reste utilisable comme avant.
 *
 * L'ancienne strategie (cache d'abord) affichait systematiquement la
 * version PRECEDENTE, la nouvelle n'arrivant qu'au lancement suivant.
 * Un correctif deploye ne se voyait donc jamais du premier coup.
 *
 * Les assets (images, polices, JS) restent en cache d'abord : ils
 * sont versionnes par le nom de cache, donc jamais perimes.
 */
const CACHE = 'belfit-v165';
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

  // La v2 a son propre service worker et ses propres regles de cache.
  // L'intercepter ici lui servait un HTML fige, qui pointait vers
  // d'anciens fichiers : les mises a jour n'arrivaient jamais.
  if (url.pathname.startsWith('/v2/')) return;

  // HTML : reseau d'abord, cache en secours si hors ligne.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          // On garde une copie fraiche pour le mode hors ligne.
          const copie = res.clone();
          caches.open(CACHE).then(c => c.put(req, copie));
        }
        return res;
      } catch (err) {
        // Pas de reseau : on sert la derniere copie connue.
        const enCache = await caches.match(req);
        return enCache || (await caches.match('./app.html'));
      }
    })());
    return;
  }

  // Assets : cache d'abord, avec mise en cache au premier passage
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
