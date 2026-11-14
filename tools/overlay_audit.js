#!/usr/bin/env node
/* Audits the parts of the UI that only exist while something is OPEN:
   the off-canvas nav drawer and modal dialogs. The page-level audit skips
   these (a closed drawer is meant to sit off-screen), so they get their own
   pass — an overlay that does not fit or cannot be scrolled is invisible to
   every other check.

   Note: a control inside a scrollable panel is reported as ok, not as a fault.
   Only controls still outside the viewport after scrolling to them are faults.

   Usage: node tools/overlay_audit.js [width] [height]

   Needs `npm i --no-save playwright-core`; exits 0 with a message if absent. */
const fs = require("fs");
let chromium;
try { chromium = require("playwright-core").chromium; }
catch (e) { console.log("overlay-audit: playwright-core not installed — skipped"); process.exit(0); }

const BASE = process.env.PF_BASE || "http://localhost:8000";
const W = Number(process.argv[2]) || 360;
const H = Number(process.argv[3]) || 640;
const MIN_TAP = 44;

const SESSION = {
  student: { email: "student@test.ke", name: "Test Student", role: "student", roleLabel: "KCSE Candidate" },
  tutor: { email: "tutor@test.ke", name: "Test Tutor", role: "tutor", roleLabel: "TSC Tutor" },
  superadmin: { email: "admin@test.ke", name: "SuperAdmin", role: "superadmin", roleLabel: "SuperAdmin" }
};
const DATA = {
  onboarded: true, stage: "KCSE Candidate",
  subjects: [
    { code: "ENG", name: "English", score: 72 }, { code: "KIS", name: "Kiswahili", score: 68 },
    { code: "MAT", name: "Mathematics", score: 80 }, { code: "BIO", name: "Biology", score: 70 },
    { code: "CHE", name: "Chemistry", score: 66 }, { code: "PHY", name: "Physics", score: 61 },
    { code: "GEO", name: "Geography", score: 64 }
  ],
  quiz: Array.from({ length: 12 }, (_, i) => i % 4),
  results: [
    { subject: "English", score: 72 }, { subject: "Kiswahili", score: 68 },
    { subject: "Mathematics", score: 80 }, { subject: "Biology", score: 70 },
    { subject: "Chemistry", score: 66 }, { subject: "Physics", score: 61 },
    { subject: "Geography", score: 64 }
  ]
};

/* Pages with a drawer, and the modals worth opening. */
const DRAWER_PAGES = [
  "student/dashboard.html", "student/cluster.html", "student/quiz.html",
  "student/institutions.html", "student/funding.html", "student/tracker.html",
  "student/profile.html", "tutor/dashboard.html", "tutor/students.html",
  "tutor/schedule.html", "tutor/profile.html",
  "admin/dashboard.html", "admin/dpa.html", "admin/deployment.html"
];
/* Pages that contain at least one .modal-bg. Every dialog on the page is
   opened and measured, rather than trying to drive each trigger. */
const MODAL_PAGES = ["student/institutions.html", "student/tracker.html"];

function roleFor(page) {
  if (page.startsWith("tutor/")) return "tutor";
  if (page.startsWith("admin/")) return "superadmin";
  if (page.startsWith("student/")) return "student";
  return null;
}

/* Measures an open overlay: does it fit, can it scroll, are its controls tappable? */
function measureOverlay(cfg) {
  const MIN_TAP = cfg.MIN_TAP;
  const el = document.querySelector(cfg.sel);
  if (!el) return { missing: true };
  const vw = innerWidth, vh = innerHeight;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const out = {
    width: Math.round(r.width), height: Math.round(r.height),
    fitsWidth: r.width <= vw + 1,
    fitsHeight: r.height <= vh + 1,
    overflowsBottom: Math.round(Math.max(0, r.bottom - vh)),
    overflowsRight: Math.round(Math.max(0, r.right - vw)),
    /* If it is taller than the screen it MUST be scrollable, or the bottom
       of it is simply unreachable. */
    scrollable: el.scrollHeight <= el.clientHeight + 1 ||
      cs.overflowY === "auto" || cs.overflowY === "scroll",
    contentHeight: el.scrollHeight, boxHeight: el.clientHeight,
    smallTargets: [], clippedControls: []
  };
  el.querySelectorAll("a,button,input,select,textarea").forEach(c => {
    const ccs = getComputedStyle(c);
    if (ccs.display === "none" || ccs.visibility === "hidden") return;
    const cr = c.getBoundingClientRect();
    if (cr.width === 0 || cr.height === 0) return;
    if (cr.width < MIN_TAP || cr.height < MIN_TAP) {
      out.smallTargets.push({
        sel: c.tagName.toLowerCase() + (c.id ? "#" + c.id : "") +
          " “" + (c.textContent || "").trim().replace(/\s+/g, " ").slice(0, 24) + "”",
        w: Math.round(cr.width), h: Math.round(cr.height)
      });
    }
    /* Only a control that is STILL outside the viewport after you scroll to
       it is genuinely unreachable. Content inside a scrollable panel is
       merely below the fold, which is fine. */
    c.scrollIntoView({ block: "nearest", behavior: "instant" });
    const cr2 = c.getBoundingClientRect();
    if (cr2.right > vw + 1 || cr2.bottom > vh + 1) {
      out.clippedControls.push({
        sel: c.tagName.toLowerCase() + (c.id ? "#" + c.id : "") +
          " “" + (c.textContent || "").trim().replace(/\s+/g, " ").slice(0, 24) + "”",
        right: Math.round(cr2.right), bottom: Math.round(cr2.bottom)
      });
    }
  });
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  console.log(`\nOverlay audit — ${W}×${H}, min tap ${MIN_TAP}×${MIN_TAP}\n`);

  /* ---- Drawers ---- */
  console.log("Off-canvas drawer (opened)");
  console.log("-".repeat(64));
  for (const page of DRAWER_PAGES) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const p = await ctx.newPage();
    const role = roleFor(page);
    await p.addInitScript(s => {
      localStorage.setItem("pf_session", JSON.stringify(s.session));
      localStorage.setItem("pf_data_student@test.ke", JSON.stringify(s.data));
    }, { session: SESSION[role], data: DATA });
    await p.goto(`${BASE}/${page}`, { waitUntil: "networkidle", timeout: 20000 });
    await p.evaluate(() => { if (window.toggleSidebar) toggleSidebar(); });
    await p.waitForTimeout(350);
    const m = await p.evaluate(measureOverlay, { sel: "#sidebar", MIN_TAP });
    if (m.missing) { console.log(`${page.padEnd(28)} no drawer`); await ctx.close(); continue; }
    const bad = [];
    if (!m.fitsWidth) bad.push(`wider than screen by ${m.overflowsRight}px`);
    if (m.overflowsBottom > 0) bad.push(`${m.overflowsBottom}px below the fold`);
    if (!m.scrollable) bad.push(`content ${m.contentHeight}px in a ${m.boxHeight}px box and NOT scrollable`);
    if (m.smallTargets.length) bad.push(`${m.smallTargets.length} small tap target(s)`);
    if (m.clippedControls.length) bad.push(`${m.clippedControls.length} control(s) off-screen`);
    console.log(`${page.padEnd(28)} ${m.width}×${m.height}  ${bad.length ? "✗ " + bad.join("; ") : "ok"}`);
    if (bad.length) problems.push({ page, kind: "drawer", bad, m });
    await ctx.close();
  }

  /* ---- Modals ---- */
  console.log("\nModal dialogs (opened with content)");
  console.log("-".repeat(64));
  for (const page of MODAL_PAGES) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const p = await ctx.newPage();
    const role = roleFor(page);
    await p.addInitScript(s => {
      localStorage.setItem("pf_session", JSON.stringify(s.session));
      localStorage.setItem("pf_data_student@test.ke", JSON.stringify(s.data));
    }, { session: SESSION[role], data: DATA });
    await p.goto(`${BASE}/${page}`, { waitUntil: "networkidle", timeout: 20000 });

    /* Fill each dialog with realistic content, then open it. A dialog sized
       for a desktop (max-width 640-720px) is the main risk on a phone. */
    const ids = await p.evaluate(() => [...document.querySelectorAll(".modal-bg")].map(m => m.id || "(anon)"));
    for (const id of ids) {
      await p.evaluate(mid => {
        const bg = mid === "(anon)"
          ? document.querySelector(".modal-bg")
          : document.getElementById(mid);
        if (!bg) return;
        const body = bg.querySelector("[id$='Body'], .modal > div:nth-child(2)");
        if (body && !body.textContent.trim()) {
          body.innerHTML = "<p>Representative content for layout testing.</p>" +
            "<table><thead><tr><th>Column one</th><th>Column two</th><th>Column three</th></tr></thead>" +
            "<tbody><tr><td>Value one</td><td>Value two</td><td>Value three</td></tr></tbody></table>" +
            "<button class=\"btn btn-dark btn-block\">A button</button>";
        }
        bg.classList.add("open");
      }, id);
      await p.waitForTimeout(200);
      const m = await p.evaluate(measureOverlay, {
        sel: (id === "(anon)" ? ".modal-bg" : "#" + id) + " .modal", MIN_TAP
      });
      const bad = [];
      if (m.missing) bad.push("no .modal element");
      else {
        if (m.width === 0 || m.height === 0) bad.push("did not open (zero size)");
        if (!m.fitsWidth) bad.push(`wider than screen by ${m.overflowsRight}px`);
        if (m.overflowsBottom > 1) bad.push(`${m.overflowsBottom}px below the fold`);
        if (!m.scrollable) bad.push(`content ${m.contentHeight}px in a ${m.boxHeight}px box and NOT scrollable`);
        if (m.smallTargets.length) bad.push(`${m.smallTargets.length} small tap target(s)`);
        if (m.clippedControls.length) bad.push(`${m.clippedControls.length} control(s) unreachable`);
      }
      console.log(`${(page + " #" + id).padEnd(34)} ${m.width || 0}×${m.height || 0}  ${bad.length ? "✗ " + bad.join("; ") : "ok"}`);
      if (bad.length) problems.push({ page: page + " #" + id, kind: "modal", bad, m });
      /* close it again before opening the next */
      await p.evaluate(mid => {
        const bg = mid === "(anon)" ? document.querySelector(".modal-bg") : document.getElementById(mid);
        if (bg) bg.classList.remove("open");
      }, id);
    }
    await ctx.close();
  }

  await browser.close();
  if (problems.length) {
    console.log("\nDetails\n" + "-".repeat(64));
    problems.forEach(x => {
      console.log(`\n${x.page} (${x.kind})`);
      if (x.m.smallTargets) x.m.smallTargets.slice(0, 8).forEach(t => console.log(`  tap ${t.w}x${t.h}: ${t.sel}`));
      if (x.m.clippedControls) x.m.clippedControls.slice(0, 8).forEach(t => console.log(`  off-screen (right ${t.right}, bottom ${t.bottom}): ${t.sel}`));
    });
  }
  console.log(`\n${problems.length} overlay problem(s).`);
  process.exitCode = problems.length ? 1 : 0;
})();
