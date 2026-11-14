#!/usr/bin/env node
/* Measure every page at a phone viewport in a real browser and report the
   things that actually make a UI feel broken on a phone:

     · horizontal overflow (the page scrolls sideways)
     · tap targets under 44x44 px  (the accepted minimum touch size)
     · body text under 12 px
     · images that failed to load

   Usage:
     node tools/mobile_audit.js           # all pages at 360x640
     node tools/mobile_audit.js 320 480   # a different viewport

   Needs `npm i --no-save playwright-core`; exits 0 with a message if absent
   so the zero-dependency `npm test` still works on a bare checkout. */
const fs = require("fs");
const path = require("path");

let chromium;
try {
  chromium = require("playwright-core").chromium;
} catch (e) {
  console.log("mobile-audit: playwright-core not installed — skipped");
  process.exit(0);
}

const BASE = process.env.PF_BASE || "http://localhost:8000";
const W = Number(process.argv[2]) || 360;
const H = Number(process.argv[3]) || 640;
const MIN_TAP = 44;
const MIN_FONT = 12;

const ROLE = {
  "student/dashboard": "student", "student/cluster": "student", "student/quiz": "student",
  "student/institutions": "student", "student/funding": "student", "student/tracker": "student",
  "student/onboarding": "student", "student/profile": "student",
  "tutor/dashboard": "tutor", "tutor/students": "tutor",
  "tutor/schedule": "tutor", "tutor/profile": "tutor",
  "admin/dashboard": "superadmin", "admin/dpa": "superadmin", "admin/deployment": "superadmin"
};
const SESSION = {
  student: { email: "student@test.ke", name: "Test Student", role: "student", roleLabel: "KCSE Candidate" },
  tutor: { email: "tutor@test.ke", name: "Test Tutor", role: "tutor", roleLabel: "TSC Tutor" },
  superadmin: { email: "admin@test.ke", name: "SuperAdmin", role: "superadmin", roleLabel: "SuperAdmin" }
};
const STUDENT_DATA = {
  onboarded: true,          // requireOnboarded() redirects without this
  stage: "KCSE Candidate",
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
  ],
};

function allPages() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) { if (!/node_modules|shots|\.git|^tools$/.test(rel)) walk(rel); }
      else if (e.name.endsWith(".html")) out.push(rel.replace(/^\.\//, ""));
    }
  })(".");
  return out.sort();
}

/* Runs inside the page — Node-side constants must be passed in, not closed over. */
function measure(cfg) {
  const MIN_TAP = cfg.MIN_TAP, MIN_FONT = cfg.MIN_FONT;
  const vw = document.documentElement.clientWidth;
  const out = { overflowX: 0, wide: [], small: [], tinyText: [], brokenImg: [], clipped: [], obscured: [] };

  out.overflowX = Math.max(0, document.documentElement.scrollWidth - vw);

  const label = el => {
    const t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return el.tagName.toLowerCase() +
      (el.id ? "#" + el.id : "") +
      (el.className && typeof el.className === "string"
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "") +
      (t ? ` “${t}”` : "");
  };

  /* Elements sticking out past the right edge — the cause of sideways scroll. */
  document.querySelectorAll("body *").forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed") return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    /* Ignore elements parked outside a scroll/clip container, and anything
       inside the off-canvas drawer (it is meant to sit off-screen). */
    if (r.right > vw + 1 || r.left < -1) {
      let skip = false;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const acs = getComputedStyle(a);
        if (acs.overflowX === "hidden" || acs.overflowX === "clip" ||
            acs.overflowX === "auto" || acs.overflowX === "scroll") { skip = true; break; }
        if (acs.position === "fixed" || acs.position === "absolute") {
          const ar = a.getBoundingClientRect();
          /* An off-canvas panel translated out of view is intentional. */
          if (ar.right <= 1 || ar.left >= vw - 1) { skip = true; break; }
        }
      }
      if (!skip) out.wide.push({ sel: label(el), left: Math.round(r.left), right: Math.round(r.right) });
    }
  });

  /* Interactive elements that are too small to hit reliably. */
  document.querySelectorAll("a,button,input,select,textarea,[role=button],label.btn").forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;
    /* A checkbox/radio wrapped in a <label> is tapped via its label, so that
       is the target to measure — not the small box the browser draws. */
    const target = (el.matches("input[type=checkbox],input[type=radio]") && el.closest("label"))
      ? el.closest("label") : el;
    const r = target.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.width < MIN_TAP || r.height < MIN_TAP) {
      out.small.push({ sel: label(el), w: Math.round(r.width), h: Math.round(r.height) });
    }
  });

  /* Text too small to read comfortably. */
  document.querySelectorAll("p,li,td,th,span,small,label,div,button,a,h1,h2,h3,h4").forEach(el => {
    if (!el.textContent || !el.textContent.trim()) return;
    if (el.children.length) return;                       // leaf text only
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    const size = parseFloat(cs.fontSize);
    if (size && size < MIN_FONT) out.tinyText.push({ sel: label(el), px: +size.toFixed(1) });
  });

  /* Text silently cut off by its own container (overflow hidden, no ellipsis). */
  document.querySelectorAll("body *").forEach(el => {
    if (el.children.length) return;                       // leaf text only
    const txt = (el.textContent || "").trim();
    if (!txt) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    if (cs.overflowX !== "hidden" && cs.overflowX !== "clip") return;
    if (cs.textOverflow === "ellipsis") return;           // deliberate truncation
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      out.clipped.push({
        sel: label(el), shown: el.clientWidth, needed: el.scrollWidth,
        text: txt.slice(0, 40)
      });
    }
  });

  /* Controls you cannot actually tap because a fixed bar sits on top of them. */
  const bars = [...document.querySelectorAll("body *")].filter(el => {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "sticky") return false;
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }).map(el => el.getBoundingClientRect());

  /* A control is only genuinely unreachable if it is still covered after you
     scroll to it. Scroll each one into view first, THEN hit-test: this is the
     difference between "below the fold" (fine, you scroll) and "permanently
     stuck under a fixed bar" (broken). */
  const interactive = [...document.querySelectorAll("a,button,input,select,textarea,[role=button]")];
  for (const el of interactive) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    if (el.getBoundingClientRect().height === 0) continue;
    el.scrollIntoView({ block: "nearest", behavior: "instant" });
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
    const hit = document.elementFromPoint(x, y);
    if (!hit) continue;
    if (hit === el || el.contains(hit) || hit.contains(el)) continue;
    out.obscured.push({ sel: label(el), by: label(hit) });
  }
  window.scrollTo(0, 0);

  document.querySelectorAll("img").forEach(img => {
    if (img.complete && img.naturalWidth === 0) out.brokenImg.push(img.getAttribute("src") || "(no src)");
  });

  return out;
}

(async () => {
  const pages = allPages();
  const browser = await chromium.launch();
  const rows = [];

  for (const page of pages) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const p = await ctx.newPage();
    const role = ROLE[page.replace(/\.html$/, "")];
    await p.addInitScript(seed => {
      if (seed.role) localStorage.setItem("pf_session", JSON.stringify(seed.session));
      if (seed.role === "student") localStorage.setItem("pf_data_student@test.ke", JSON.stringify(seed.data));
    }, { role, session: SESSION[role] || null, data: STUDENT_DATA });

    try {
      await p.goto(`${BASE}/${page}`, { waitUntil: "networkidle", timeout: 20000 });
      await p.waitForTimeout(200);
      /* A guard that redirects (requireRole / requireOnboarded) silently swaps
         the page under us — then we would be auditing the wrong page. */
      const landed = new URL(p.url()).pathname.replace(/^\//, "");
      if (landed !== page) rows.push({ page, redirect: landed, ...(await p.evaluate(measure, { MIN_TAP, MIN_FONT })) });
      else rows.push({ page, ...(await p.evaluate(measure, { MIN_TAP, MIN_FONT })) });
    } catch (e) {
      rows.push({ page, error: e.message.split("\n")[0] });
    }
    await ctx.close();
  }
  await browser.close();

  let problems = 0;
  console.log(`\nMobile audit — ${W}×${H}, min tap target ${MIN_TAP}×${MIN_TAP}, min font ${MIN_FONT}px\n`);
  console.log("page".padEnd(24) + "ovf  wide   tap   text   img  clip  hidden");
  console.log("-".repeat(78));
  for (const r of rows) {
    if (r.error) { console.log(r.page.padEnd(26) + "ERROR " + r.error); problems++; continue; }
    const n = [r.overflowX, r.wide.length, r.small.length, r.tinyText.length,
               r.brokenImg.length, r.clipped.length, r.obscured.length];
    problems += n[0] > 0 ? 1 : 0;
    problems += n[1] + n[2] + n[3] + n[4] + n[5] + n[6];
    if (r.redirect) problems += 1;
    const flag = n.some((x, i) => x > 0 && i !== 2) || r.redirect ? "  <-- " : "";
    console.log((r.page + (r.redirect ? ` → ${r.redirect}` : "")).padEnd(24) +
      String(n[0]).padStart(5) + String(n[1]).padStart(6) +
      String(n[2]).padStart(6) + String(n[3]).padStart(7) +
      String(n[4]).padStart(6) + String(n[5]).padStart(6) +
      String(n[6]).padStart(7) + flag);
  }

  const detail = rows.filter(r => !r.error && (r.redirect || r.overflowX > 0 || r.wide.length || r.small.length || r.clipped.length || r.obscured.length || r.tinyText.length || r.brokenImg.length));
  if (detail.length) {
    console.log("\nDetails\n" + "-".repeat(74));
    for (const r of detail) {
      console.log("\n" + r.page);
      if (r.redirect) console.log(`  REDIRECTED to ${r.redirect} — measured the wrong page`);
      if (r.overflowX > 0) console.log(`  scrolls sideways by ${r.overflowX}px`);
      r.wide.slice(0, 6).forEach(x => console.log(`  overflows: ${x.sel}  [${x.left} → ${x.right}]`));
      if (r.wide.length > 6) console.log(`  …and ${r.wide.length - 6} more`);
      r.small.slice(0, 8).forEach(x => console.log(`  tap ${x.w}x${x.h} (<${MIN_TAP}): ${x.sel}`));
      if (r.small.length > 8) console.log(`  …and ${r.small.length - 8} more`);
      r.tinyText.slice(0, 4).forEach(x => console.log(`  tiny text ${x.px}px: ${x.sel}`));
      if (r.tinyText.length > 4) console.log(`  …and ${r.tinyText.length - 4} more`);
      r.clipped.slice(0, 6).forEach(x => console.log(`  clipped text (${x.shown}px of ${x.needed}px needed): “${x.text}”`));
      if (r.clipped.length > 6) console.log(`  …and ${r.clipped.length - 6} more`);
      r.obscured.slice(0, 6).forEach(x => console.log(`  hidden behind ${x.by}: ${x.sel}`));
      if (r.obscured.length > 6) console.log(`  …and ${r.obscured.length - 6} more`);
      r.brokenImg.slice(0, 4).forEach(x => console.log(`  broken image: ${x}`));
    }
  }

  console.log(`\n${problems} problem(s).`);
  process.exitCode = problems ? 1 : 0;
})();
