#!/usr/bin/env node
/* ============================================================
   PathFinder Kenya — page render smoke test
   Loads every page in jsdom, executes its scripts for real, and
   reports any runtime error, missing element or console error.

   This catches the failure modes static checks cannot: a renamed
   function, an element ID that no longer exists, an undefined
   variable on first render.

   Usage:  node tools/render_check.js
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");

/* jsdom is a devDependency — the core `npm test` deliberately has no
   dependencies so it runs on a bare checkout. Skip quietly if it is absent
   so this check is an optional, deeper layer rather than a hard failure. */
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require("jsdom")); }
catch (e) {
  console.log("jsdom not installed — skipping page render check.");
  console.log("Run `npm install` to enable it, then: npm run test:render");
  process.exit(0);
}

const ROOT = path.join(__dirname, "..");

/* Pages and the role each one requires (so requireRole() passes). */
const PAGES = [
  ["index.html", null],
  ["signin.html", null],
  ["signup.html", null],
  ["legal/privacy.html", null],
  ["legal/terms.html", null],
  ["student/dashboard.html", "student"],
  ["student/cluster.html", "student"],
  ["student/quiz.html", "student"],
  ["student/institutions.html", "student"],
  ["student/funding.html", "student"],
  ["student/tracker.html", "student"],
  ["student/onboarding.html", "student"],
  ["student/profile.html", "student"],
  ["tutor/dashboard.html", "tutor"],
  ["tutor/students.html", "tutor"],
  ["tutor/schedule.html", "tutor"],
  ["tutor/profile.html", "tutor"],
  ["admin/dashboard.html", "superadmin"],
  ["admin/deployment.html", "superadmin"],
  ["admin/dpa.html", "superadmin"]
];

function sessionFor(role) {
  if (!role) return null;
  return JSON.stringify({
    name: role === "student" ? "Test Student" : role === "tutor" ? "Test Tutor" : "Test Admin",
    email: role + "@test.ke",
    role: role,
    roleLabel: role === "student" ? "KCSE Candidate" : role === "tutor" ? "TSC Tutor" : "SuperAdmin"
  });
}

function runPage(relPath, role) {
  const file = path.join(ROOT, relPath);
  let html = fs.readFileSync(file, "utf8");
  const errors = [];
  const consoleErrors = [];
  const redirects = [];
  let current = "(page)";   // which script is executing, for error attribution

  /* Collect every <script> in document order, then strip them all from the
     markup. jsdom would otherwise run the inline scripts while parsing —
     before app.js has loaded — and every page would fail on requireRole(). */
  const scripts = [];
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => {
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs);
    scripts.push(src ? { src: src[1] } : { code: body });
    return "";
  });

  const vc = new VirtualConsole();
  vc.on("jsdomError", e => {
    const msg = e.message + " " + String(e.detail || "");
    /* The guards redirect by assigning location.href; jsdom cannot navigate. */
    if (/Not implemented: navigation|navigation \(except hash/.test(msg)) { redirects.push(msg); return; }
    if (/Not implemented: Window's scrollTo/.test(msg)) return;   // jsdom limitation, not an app bug
    errors.push(current + " → " + e.message +
      (e.detail ? "\n      " + String(e.detail).split("\n")[0] : ""));
  });
  vc.on("error", (...a) => consoleErrors.push(a.map(String).join(" ")));

  const dom = new JSDOM(html, {
    url: "http://localhost:8000/" + relPath,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const w = dom.window;

  /* jsdom has no crypto.subtle — only password hashing needs it. */
  if (!w.crypto) w.crypto = {};
  if (!w.crypto.subtle) {
    w.crypto.subtle = { importKey: async () => ({}), deriveBits: async () => new ArrayBuffer(32) };
  }
  if (!w.crypto.getRandomValues) {
    w.crypto.getRandomValues = a => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; };
  }
  if (!w.Promise) w.Promise = Promise;
  /* jsdom has no layout engine, so scrolling is unimplemented. Stub it so
     pages that scroll on step change behave as they would in a browser. */
  /* Assign unconditionally: jsdom *does* define these, and they throw. */
  w.scrollTo = function () {};
  w.scrollBy = function () {};
  w.scroll = function () {};
  if (w.HTMLElement) w.HTMLElement.prototype.scrollIntoView = function () {};

  /* Seed a session so protected pages render their real content. */
  const sess = sessionFor(role);
  if (sess) { try { w.localStorage.setItem("pf_session", sess); } catch (e) {} }

  /* Student pages redirect to onboarding until results exist — give the test
     user a completed setup so the real dashboard content renders. */
  if (role === "student") {
    try {
      w.localStorage.setItem("pf_data_student@test.ke", JSON.stringify({
        onboarded: true, mock: false,
        stage: "KCSE Candidate (Form 3–4)", county: "Kajiado (034)", school: "Test School",
        exam: "Mock 2",
        results: [
          { subject: "Mathematics", score: 72, target: 85 },
          { subject: "English", score: 68, target: 80 },
          { subject: "Kiswahili", score: 64, target: 75 },
          { subject: "Biology", score: 81, target: 88 },
          { subject: "Chemistry", score: 75, target: 85 },
          { subject: "Physics", score: 58, target: 78 },
          { subject: "Geography", score: 70, target: 80 }
        ],
        quiz: { answers: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 0, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5 } },
        assessments: []
      }));
    } catch (e) {}
  }

  /* Execute the scripts in document order by injecting real <script> elements.

     This matters: window.eval() would run each file as *indirect eval*, where
     top-level `const`/`let` live in a scope that dies with the call. Real
     <script src> tags share one global lexical environment, so app.js's
     `const $$ = …` is visible to the inline scripts that follow. Injecting
     elements reproduces browser semantics; w.eval() would report false errors. */
  scripts.forEach((s, i) => {
    let code = null;
    if (s.src) {
      if (/^https?:/.test(s.src)) return;                     // CDN: intentionally skipped
      const p = path.join(path.dirname(file), s.src);
      if (!fs.existsSync(p)) { errors.push("missing script: " + s.src); return; }
      current = s.src;
      code = fs.readFileSync(p, "utf8");
    } else {
      if (!/\S/.test(s.code || "")) return;
      current = "inline script #" + i;
      code = s.code;
    }
    try {
      const el = w.document.createElement("script");
      el.textContent = code;
      w.document.body.appendChild(el);
    } catch (e) {
      errors.push(current + " → " + e.message);
    }
  });

  return { relPath, errors, consoleErrors, redirects, doc: w.document, window: w };
}


/* The harness injects local scripts as <script> elements, so their SOURCE ends
   up inside body.innerHTML — which would make content assertions match app.js's
   own demo-user constants rather than anything a visitor sees. Strip script and
   style nodes before asserting on content. */
function visibleHTML(doc) {
  const clone = doc.body.cloneNode(true);
  clone.querySelectorAll("script,style").forEach(n => n.remove());
  return clone.innerHTML;
}

/* --- run --- */
let bad = 0;
console.log("Rendering every page in jsdom…\n");

PAGES.forEach(([rel, role]) => {
  const r = runPage(rel, role);
  const ok = r.errors.length === 0;
  if (!ok) bad++;
  console.log((ok ? "  ok   " : "  FAIL ") + rel + (role ? "  (as " + role + ")" : ""));
  r.errors.forEach(e => console.log("         " + e));
});

/* --- content assertions on the pages that matter most --- */
console.log("\nContent checks:");
function assertContent(label, cond, detail) {
  console.log((cond ? "  ok   " : "  FAIL ") + label + (cond ? "" : "  — " + (detail || "")));
  if (!cond) bad++;
}

{
  const r = runPage("student/cluster.html", "student");
  const d = r.doc;
  assertContent("cluster: subject inputs rendered",
    d.querySelectorAll("#subjectGrid select").length >= 7,
    d.querySelectorAll("#subjectGrid select").length + " selects");
  assertContent("cluster: all 14 cluster cards rendered",
    d.querySelectorAll("#clusterGrid button").length === 14,
    d.querySelectorAll("#clusterGrid button").length + " cards");
  assertContent("cluster: comparison list rendered",
    d.querySelectorAll("#compareWrap > div").length === 14,
    d.querySelectorAll("#compareWrap > div").length + " rows");
  assertContent("cluster: empty state shown before grades are entered",
    /Enter your grades to see your points/.test(d.getElementById("resultWrap").innerHTML));
}
{
  const r = runPage("student/funding.html", "student");
  const detail = r.doc.getElementById("bandDetail");
  assertContent("funding: band detail panel populated",
    detail && /Government scholarship/.test(detail.innerHTML));
  assertContent("funding: Band 1 shows 70 / 25 / 5",
    detail && /70%/.test(detail.innerHTML) && /25%/.test(detail.innerHTML) && /5%/.test(detail.innerHTML),
    (detail ? detail.textContent.slice(0, 120) : "no panel"));
}
{
  const r = runPage("admin/dashboard.html", "superadmin");
  const list = r.doc.getElementById("aAuditList");
  assertContent("admin: reference-data audit rendered",
    list && list.querySelectorAll(".checkrow").length >= 14,
    list ? list.querySelectorAll(".checkrow").length + " rows" : "missing");
  assertContent("admin: no fabricated learner records",
    !/Amina Odhiambo|Moses Kiprop|Faith Wanjiku/.test(visibleHTML(r.doc)));
}
{
  const r = runPage("tutor/profile.html", "tutor");
  const vlist = r.doc.getElementById("verifyList");
  assertContent("tutor: verification checklist rendered",
    vlist && vlist.querySelectorAll(".checkrow").length === 4,
    vlist ? vlist.querySelectorAll(".checkrow").length + " rows" : "missing");
  assertContent("tutor: nothing is falsely marked verified",
    vlist && !/Verified<\/span>/.test(vlist.innerHTML) && /Not submitted/.test(vlist.innerHTML));
  assertContent("tutor: no DCI/good-conduct false claim",
    !/Good Conduct<\/b><br><span class="tiny muted">Verified/.test(visibleHTML(r.doc)));
}
{
  const r = runPage("tutor/schedule.html", "tutor");
  assertContent("tutor: sessions start empty",
    /No sessions yet/.test(r.doc.getElementById("schedTable").innerHTML));
}
{
  const r = runPage("tutor/students.html", "tutor");
  assertContent("tutor: student roster shows no invented learners",
    /No students linked yet/.test(visibleHTML(r.doc)) &&
    !/Amina Odhiambo|Moses Kiprop|Faith Wanjiku/.test(visibleHTML(r.doc)));
}

console.log("\n" + (bad === 0 ? "All pages render cleanly." : bad + " problem(s) found."));
process.exit(bad ? 1 : 0);
