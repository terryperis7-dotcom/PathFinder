/* PathFinder Kenya — Service Worker
   © 2026 PathFinder Kenya. All rights reserved. See /LICENSE

   Strategy
   - Only SAME-ORIGIN GET requests are handled. Supabase API calls and CDN scripts are never
     cached here, so private student data can't be stored in (or served stale from) this cache.
   - Pages (navigations): network-first, falling back to the cached copy, then to the homepage.
   - Static assets (css/js/images/icons): stale-while-revalidate.
   Bump CACHE when you change the precache list. */
const CACHE = "pathfinder-v6";
const CORE = [
  "/index.html", "/signin.html", "/signup.html",
  "/assets/css/style.css",
  "/assets/js/app.js", "/assets/js/data.js",
  "/assets/js/supabase.js", "/assets/js/supabase-config.js", "/assets/js/shell.js",
  "/assets/icons/icon-192.png", "/assets/icons/icon-512.png",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // never touch cross-origin (Supabase, CDN, fonts)

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
