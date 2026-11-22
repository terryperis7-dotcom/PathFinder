/* PathFinder Kenya — service worker (offline app shell).

   Strategy
   ---------
   • precache the shell + every page so the app opens with no network
   • navigations: network first, fall straight back to the cached page
   • same-origin GETs: cache first, then revalidate in the background
   • cross-origin (fonts): stale-while-revalidate, and never fatal

   Bump CACHE_VERSION whenever you ship changed assets. */

const CACHE_VERSION = "pf-v1.2.0";
const OFFLINE_PAGE = "index.html";

const PRECACHE = [
  "index.html", "signin.html", "signup.html", "legal/privacy.html", "legal/terms.html",
  "admin/dashboard.html", "admin/data.html", "admin/deployment.html", "admin/dpa.html",
  "admin/messages.html", "admin/requests.html", "admin/safety.html", "admin/sessions.html",
  "admin/users.html", "student/cluster.html", "student/dashboard.html", "student/funding.html",
  "student/institutions.html", "student/messages.html", "student/onboarding.html",
  "student/profile.html", "student/quiz.html", "student/sessions.html", "student/tracker.html",
  "student/tutors.html", "tutor/dashboard.html", "tutor/messages.html", "tutor/profile.html",
  "tutor/schedule.html", "tutor/sessions.html", "tutor/students.html", "assets/css/style.css",
  "assets/css/app.css", "assets/js/auth.js", "assets/js/avatar.js", "assets/js/charts.js",
  "assets/js/chat.js", "assets/js/cluster.js", "assets/js/core.js", "assets/js/data.js",
  "assets/js/icons.js", "assets/js/inbox.js", "assets/js/locked.js", "assets/js/motion.js",
  "assets/js/notify.js", "assets/js/recommend.js", "assets/js/safety.js", "assets/js/shell.js",
  "assets/js/stages.js", "assets/js/supabase-config.js", "assets/js/supabase.js",
  "assets/js/pages/admin.js", "assets/js/pages/cluster.js", "assets/js/pages/dashboard.js",
  "assets/js/pages/funding.js", "assets/js/pages/home.js", "assets/js/pages/institutions.js",
  "assets/js/pages/legal.js", "assets/js/pages/messages.js", "assets/js/pages/profile.js",
  "assets/js/pages/quiz.js", "assets/js/pages/sessions.js", "assets/js/pages/signin.js",
  "assets/js/pages/signup.js", "assets/js/pages/tracker.js",
  "assets/js/pages/tutor-workspace.js", "assets/js/pages/tutors.js", "assets/icons/icon.svg",
  "assets/icons/maskable.svg", "manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  /* navigations — network first, cached page as the fallback */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match(OFFLINE_PAGE)))
    );
    return;
  }

  /* same-origin assets — cache first, refresh quietly */
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then(hit => {
        const network = fetch(req)
          .then(res => {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
    return;
  }

  /* cross-origin (Google Fonts) — stale-while-revalidate, never fatal */
  event.respondWith(
    caches.match(req).then(hit => {
      const network = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
