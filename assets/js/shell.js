/* ============================================================
   PathFinder Kenya — App Shell (sidebar, bottom nav, PWA)
   © 2026 PathFinder Kenya. All rights reserved.
   Licensed under the PathFinder Kenya Proprietary License.
   See /LICENSE and /legal/terms.html for details.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Inline icon set ----------
     The design brief calls for drawn icons rather than emoji: emoji render at
     different sizes on different phones, some platforms substitute colour
     glyphs that clash with the palette, and a screen reader announces them as
     words ("money bag") inside what is already a labelled link. One sprite is
     injected here so every page shares the same source of truth. */
  var ICONS = {
    home:    '<path d="M3 10.6 12 3.2l9 7.4"/><path d="M5.6 9.6V20.5h12.8V9.6"/><path d="M9.8 20.5v-5.6h4.4v5.6"/>',
    cluster: '<rect x="4.2" y="2.8" width="15.6" height="18.4" rx="2.4"/><path d="M8 7.2h8"/><path d="M8.2 12h.01M12 12h.01M15.8 12h.01M8.2 16.4h.01M12 16.4h.01M15.8 16.4h.01"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2 5-5 2 2-5z"/>',
    inst:    '<path d="M3 10.2 12 4l9 6.2"/><path d="M20.5 10.2V20H3.5v-9.8"/><path d="M7.8 20v-5.2M12 20v-5.2M16.2 20v-5.2"/>',
    funding: '<circle cx="12" cy="12" r="8.6"/><path d="M12 6.6v10.8"/><path d="M14.4 9.5c-.5-.9-1.4-1.4-2.4-1.4-1.3 0-2.3.7-2.3 1.8 0 2.5 4.7 1.2 4.7 3.8 0 1.1-1 1.9-2.4 1.9-.9 0-1.8-.4-2.4-1.2"/>',
    tracker: '<path d="M4 20.2V11"/><path d="M9.3 20.2V4.6"/><path d="M14.7 20.2v-7.2"/><path d="M20 20.2V8.4"/>',
    spark:   '<path d="M12 3.2l2 5.4 5.4 2-5.4 2-2 5.4-2-5.4-5.4-2 5.4-2z"/><path d="M18.6 15.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    profile: '<circle cx="12" cy="8.2" r="3.7"/><path d="M4.6 20.2c1.2-3.7 3.9-5.5 7.4-5.5s6.2 1.8 7.4 5.5"/>',
    back:    '<path d="M20.2 12H4.6"/><path d="M10.6 5.8 4.4 12l6.2 6.2"/>',
    signout: '<path d="M14.8 4.8H7a2 2 0 0 0-2 2v10.4a2 2 0 0 0 2 2h7.8"/><path d="M12.6 12H20.8"/><path d="M18.2 9.4 20.8 12l-2.6 2.6"/>',
    grad:    '<path d="M12 4 2.6 8.9 12 13.8l9.4-4.9z"/><path d="M6.4 11.2V16c0 1.7 2.5 3 5.6 3s5.6-1.3 5.6-3v-4.8"/><path d="M21.2 9.4V15"/>',
    cal:     '<rect x="3.4" y="5" width="17.2" height="15.6" rx="2.4"/><path d="M8 3.2v3.6M16 3.2v3.6"/><path d="M3.4 10h17.2"/>',
    rocket:  '<path d="M12 3.2c3 1.6 5 5.1 5 9.1l-2.6 2.5H9.6L7 12.3c0-4 2-7.5 5-9.1z"/><circle cx="12" cy="10" r="1.7"/><path d="M9.2 17.4 7.4 20.4l3.6-1.3"/><path d="M14.8 17.4l1.8 3-3.6-1.3"/>',
    shield:  '<path d="M12 3.2l7.4 2.9v5.9c0 4.3-3.1 7.9-7.4 9.1-4.3-1.2-7.4-4.8-7.4-9.1V6.1z"/><path d="M9 12.1l2.2 2.2 4-4.2"/>'
  };

  function injectIconSprite() {
    if (document.getElementById("pfIcons")) return;
    var parts = Object.keys(ICONS).map(function (k) {
      return '<symbol id="pf-' + k + '" viewBox="0 0 24 24">' + ICONS[k] + '</symbol>';
    });
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "pfIcons");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    svg.innerHTML = parts.join("");
    document.body.insertBefore(svg, document.body.firstChild);
  }

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

  /* ---------- Icon sprite ----------
     Runs at parse time rather than on DOMContentLoaded so icons are present
     before the first paint; without this the nav flashes blank on a slow phone. */
  if (document.body) injectIconSprite();
  else document.addEventListener("DOMContentLoaded", injectIconSprite);

  /* ---------- Register service worker (offline cache, fast repeat loads) ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () { /* file:// or unsupported — app still works */ });
    });
  }
})();
