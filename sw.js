/**
 * Service Worker minimal pour REPZ
 * Permet à l'app d'être installable ("Ajouter à l'écran d'accueil")
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
