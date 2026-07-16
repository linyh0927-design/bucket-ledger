const CACHE_NAME = "bucket-ledger-static-defaultlife-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=20260716-defaultlife",
  "./app.js?v=20260716-defaultlife",
  "./manifest.json?v=20260716-defaultlife",
  "./icon-dollar-192-20260711.png?v=20260716-defaultlife",
  "./icon-dollar-512-20260711.png?v=20260716-defaultlife",
  "./apple-touch-icon-dollar-20260711.png",
  "./apple-touch-icon-precomposed-dollar-20260711.png",
  "./icon.svg?v=20260716-defaultlife",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html").then((cached) => cached || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fresh = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});