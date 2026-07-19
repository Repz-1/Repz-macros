/* BELFIT service worker — demarrage instantane + hors-ligne
 *
 * Strategie HTML : CACHE D'ABORD, mise a jour en arriere-plan.
 * L'app s'ouvre a la vitesse du disque, comme une app native ; la
 * version fraiche est telechargee pendant l'usage et servie au
 * lancement suivant. La coherence entre versions est garantie par
 * le bump du nom de cache a chaque deploiement : l'installation du
 * nouveau SW retelecharge tout le noyau d'un bloc.
 */
const CACHE = 'belfit-v138';
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

  // HTML : cache d'abord (affichage immediat), revalidation en arriere-plan
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      caches.match(req).then(enCache => {
        const maj = fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => null);
        return enCache || maj.then(r => r || caches.match('./app.html'));
      })
    );
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
