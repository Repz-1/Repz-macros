/* BELFIT — SERVICE WORKER DE BASCULE (Phase 4)
 *
 * A DEPLOYER SOUS LE NOM sw.js LE JOUR DE LA BASCULE V1 -> V2.
 * Ne pas activer avant : il efface les caches et redirige tout
 * le monde vers /v2/.
 *
 * Pourquoi ce fichier : le SW actuel sert le HTML EN CACHE D'ABORD.
 * Supprimer main.html du serveur ne suffit donc pas — les PWA
 * installees continueraient a afficher une V1 fantome, sans aucun
 * moyen de les prevenir. Celui-ci se charge de les liberer.
 */

self.addEventListener('install', (e) => {
  // On prend la main tout de suite, sans attendre la fermeture des onglets.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 1. Effacer TOUS les caches de l'ancienne app.
    const cles = await caches.keys();
    await Promise.all(cles.map(k => caches.delete(k)));

    // 2. Prendre le controle des pages deja ouvertes.
    await self.clients.claim();

    // 3. Rediriger vers la v2, puis se retirer definitivement.
    const fenetres = await self.clients.matchAll({ type: 'window' });
    for (const f of fenetres) {
      try { await f.navigate('/v2/'); } catch (err) { /* onglet non controle */ }
    }
    await self.registration.unregister();
  })());
});

// Aucune interception : tout passe au reseau pendant la transition.
self.addEventListener('fetch', () => {});
