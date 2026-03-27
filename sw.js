/**
 * Service Worker — PhantomPower Estimator
 * Cache-first strategy for all app assets; network fallback.
 */
const CACHE = "phantom-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/data.js",
  "/js/chart.js",
  "/js/app.js",
  "/manifest.json",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  // Only handle GET requests for same-origin or CDN assets
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
