/* PathFinder Kenya — Service Worker
   © 2026 PathFinder Kenya. All rights reserved. See /LICENSE

   Strategy
   - Only SAME-ORIGIN GET requests are handled. Supabase API calls and CDN scripts are never
     cached here, so private student data can't be stored in (or served stale from) this cache.
   - Pages (navigations): network-first, falling back to the cached copy, then to the homepage.
   - Static assets (css/js/images/icons): stale-while-revalidate.
   Bump CACHE when you change the precache list. */
const CACHE = "pathfinder-v8";
const CORE = [
  "/admin/dashboard.html",
  "/admin/deployment.html",
  "/admin/dpa.html",
  "/index.html",
  "/legal/privacy.html",
  "/legal/terms.html",
  "/signin.html",
  "/signup.html",
  "/student/cluster.html",
  "/student/dashboard.html",
  "/student/funding.html",
  "/student/institutions.html",
  "/student/onboarding.html",
  "/student/profile.html",
  "/student/quiz.html",
  "/student/tracker.html",
  "/tutor/dashboard.html",
  "/tutor/profile.html",
  "/tutor/schedule.html",
  "/tutor/students.html",
  "/assets/css/style.css",
  "/assets/icons/apple-touch-icon.png",
  "/assets/icons/favicon-32.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/icon-maskable-512.png",
  "/assets/js/app.js",
  "/assets/js/avatar.js",
  "/assets/js/cluster.js",
  "/assets/js/data.js",
  "/assets/js/shell.js",
  "/assets/js/supabase-config.js",
  "/assets/js/supabase.js",
  "/assets/js/tutor.js"
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
