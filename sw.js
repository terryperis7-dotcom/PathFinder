/* PathFinder Kenya — Service Worker (offline cache, fast repeat loads)
   © 2026 PathFinder Kenya. All rights reserved. See /LICENSE */
const CACHE = "pathfinder-v5";
const CORE = [
  "/index.html", "/signin.html", "/signup.html",
  "/assets/css/style.css",
  "/assets/js/app.js", "/assets/js/data.js",
  "/assets/js/supabase.js", "/assets/js/supabase-config.js", "/assets/js/shell.js",
  "/manifest.json"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Network-first for HTML (always fresh), cache-first for assets (fast)
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then((r) => r || caches.match("/index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
