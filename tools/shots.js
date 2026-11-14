#!/usr/bin/env node
/* Real-browser screenshots at a phone viewport and a desktop viewport.

   Usage:
     node tools/shots.js                 # every page, 360x640 + 1280x900
     node tools/shots.js student/profile # just that page

   Writes to tools/shots/<name>-<viewport>.png.
   Needs `npm i --no-save playwright-core` — degrades to a message if absent,
   so it never breaks the zero-dependency `npm test`. */
const fs = require("fs");
const path = require("path");

let chromium;
try {
  chromium = require("playwright-core").chromium;
} catch (e) {
  console.log("shots: playwright-core not installed — skipped (try: npm i --no-save playwright-core)");
  process.exit(0);
}

const BASE = process.env.PF_BASE || "http://localhost:8000";
const OUT = path.join(__dirname, "shots");

/* Pages that need a role session before they will render. */
const ROLE = {
  "student/dashboard": "student", "student/cluster": "student", "student/quiz": "student",
  "student/institutions": "student", "student/funding": "student", "student/tracker": "student",
  "student/onboarding": "student", "student/profile": "student",
  "tutor/dashboard": "tutor", "tutor/students": "tutor",
  "tutor/schedule": "tutor", "tutor/profile": "tutor",
  "admin/dashboard": "superadmin", "admin/dpa": "superadmin", "admin/deployment": "superadmin"
};

const ROLE_SESSION = {
  student: { email: "student@test.ke", name: "Test Student", role: "student", roleLabel: "KCSE Candidate" },
  tutor: { email: "tutor@test.ke", name: "Test Tutor", role: "tutor", roleLabel: "TSC Tutor" },
  superadmin: { email: "admin@test.ke", name: "SuperAdmin", role: "superadmin", roleLabel: "SuperAdmin" }
};

/* Minimal onboarded record so requireOnboarded() does not redirect. */
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

const VIEWPORTS = [
  { name: "phone", width: 360, height: 640 },
  { name: "landscape", width: 740, height: 360 },
  { name: "desk", width: 1280, height: 900 }
];

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

(async () => {
  const filter = process.argv[2];
  const pages = allPages().filter(p => !filter || p.includes(filter));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const problems = [];

  for (const vp of VIEWPORTS) {
    for (const page of pages) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2
      });
      const p = await ctx.newPage();
      const errs = [];
      p.on("pageerror", e => errs.push(e.message.split("\n")[0]));

      /* Seed storage before any app script runs. */
      const role = ROLE[page.replace(/\.html$/, "")];
      await p.addInitScript(seed => {
        if (seed.role) localStorage.setItem("pf_session", JSON.stringify(seed.session));
        if (seed.role === "student") {
          localStorage.setItem("pf_data_student@test.ke", JSON.stringify(seed.data));
        }
      }, { role, session: ROLE_SESSION[role] || null, data: STUDENT_DATA });

      try {
        await p.goto(`${BASE}/${page}`, { waitUntil: "networkidle", timeout: 20000 });
        await p.waitForTimeout(250);
        const slug = page.replace(/[\\/]/g, "_").replace(/\.html$/, "");
        await p.screenshot({
          path: path.join(OUT, `${slug}-${vp.name}.png`),
          fullPage: true
        });
        if (errs.length) problems.push(`${page} [${vp.name}] ${errs.join(" | ")}`);
      } catch (e) {
        problems.push(`${page} [${vp.name}] ${e.message.split("\n")[0]}`);
      }
      await ctx.close();
    }
  }
  await browser.close();

  console.log(`shots: ${pages.length} pages × ${VIEWPORTS.length} viewports → tools/shots/`);
  if (problems.length) {
    console.log("\n" + problems.length + " page problem(s):");
    problems.forEach(x => console.log("  " + x));
    process.exitCode = 1;
  } else {
    console.log("no page errors in a real browser.");
  }
})();
