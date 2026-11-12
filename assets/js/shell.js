/* ============================================================
   PathFinder Kenya — App Shell (sidebar, bottom nav, PWA)
   © 2026 PathFinder Kenya. All rights reserved.
   Licensed under the PathFinder Kenya Proprietary License.
   See /LICENSE and /legal/terms.html for details.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Sidebar open / close (desktop collapse + mobile drawer) ---------- */
  function getSidebar() { return document.getElementById("sidebar"); }
  function getOverlay() { return document.getElementById("sideOverlay"); }

  function ensureOverlay() {
    if (getOverlay()) return getOverlay();
    var o = document.createElement("div");
    o.id = "sideOverlay";
    o.className = "side-overlay";
    o.setAttribute("aria-hidden", "true");
    o.addEventListener("click", closeSidebar);
    document.body.appendChild(o);
    return o;
  }

  function openSidebar() {
    var sb = getSidebar(); if (!sb) return;
    sb.classList.add("open");
    sb.classList.remove("collapsed");
    ensureOverlay().classList.add("show");
    document.body.classList.add("sidebar-open");
    try { localStorage.setItem("pf_sidebar", "open"); } catch (e) {}
    var btn = document.querySelector(".hamb");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    var sb = getSidebar(); if (!sb) return;
    sb.classList.remove("open");
    var ov = getOverlay(); if (ov) ov.classList.remove("show");
    document.body.classList.remove("sidebar-open");
    try { localStorage.setItem("pf_sidebar", "closed"); } catch (e) {}
    var btn = document.querySelector(".hamb");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function toggleSidebar() {
    var sb = getSidebar(); if (!sb) return;
    var isMobile = window.matchMedia("(max-width: 1024px)").matches;
    if (isMobile) {
      sb.classList.contains("open") ? closeSidebar() : openSidebar();
    } else {
      // Desktop: collapse to icon rail
      var collapsed = sb.classList.toggle("collapsed");
      try { localStorage.setItem("pf_sidebar", collapsed ? "collapsed" : "open"); } catch (e) {}
      var btn = document.querySelector(".hamb");
      if (btn) btn.setAttribute("aria-expanded", String(!collapsed));
    }
  }

  // Expose for inline onclick handlers
  window.toggleSidebar = toggleSidebar;
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;

  // Restore desktop preference
  try {
    var pref = localStorage.getItem("pf_sidebar");
    if (pref === "collapsed" && !window.matchMedia("(max-width: 1024px)").matches) {
      var sb = getSidebar(); if (sb) sb.classList.add("collapsed");
    }
  } catch (e) {}

  // ESC closes mobile drawer; clicking a nav link closes it
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSidebar();
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".snav a");
    if (a && window.matchMedia("(max-width: 1024px)").matches) closeSidebar();
  });

  /* ---------- Bottom navigation (phone app feel) ---------- */
  function markBottomNav() {
    var path = location.pathname.split("/").pop() || "dashboard.html";
    document.querySelectorAll(".bottom-nav a").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      a.classList.toggle("on", href === path);
    });
  }
  markBottomNav();

  /* ---------- Offline / online indicator ---------- */
  function updateOnline() {
    var el = document.getElementById("netStatus");
    if (!el) return;
    if (navigator.onLine) { el.textContent = ""; el.style.display = "none"; }
    else { el.textContent = "⚠ You're offline — showing saved data."; el.style.display = "block"; }
  }
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();

  /* ---------- PWA install prompt ---------- */
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    var btn = document.getElementById("installBtn");
    if (btn) btn.style.display = "inline-flex";
  });
  window.installApp = function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
  };

  /* ---------- Register service worker (offline cache, fast repeat loads) ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () { /* file:// or unsupported — app still works */ });
    });
  }

  /* ---------- Security: block right-click on sensitive? No — keep accessible.
     Instead: warn on paste into password fields is annoying; we do the opposite:
     allow paste (good UX), rely on hashing + Supabase Auth in production. ---------- */

  /* ---------- Prevent horizontal scroll bounce on iOS ---------- */
  document.addEventListener("touchmove", function () {}, { passive: true });
})();
