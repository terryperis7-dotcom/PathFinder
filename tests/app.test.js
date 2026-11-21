#!/usr/bin/env node
/* PathFinder Kenya — unit tests. No dependencies: the browser modules are
   loaded into a sandbox with a tiny DOM stub and asserted directly.

   Run:  npm test        (or: node tests/app.test.js) */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
let passed = 0,
  failed = 0;
const failures = [];

function ok(name, cond, extra) {
  if (cond) {
    passed++;
    console.log("  ok   " + name);
  } else {
    failed++;
    failures.push(name + (extra ? "  → " + extra : ""));
    console.log("  FAIL " + name + (extra ? "  → " + extra : ""));
  }
}
function eq(name, actual, expected) {
  ok(name, actual === expected, "got " + JSON.stringify(actual) + ", want " + JSON.stringify(expected));
}
function group(title) {
  console.log("\n" + title);
}

/* ---------- sandbox: just enough DOM for the shared modules ---------- */
const noop = () => {};
const storage = new Map();
const sandbox = {
  console,
  window: {},
  document: {
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    createElement: () => ({
      style: {},
      classList: { add: noop, remove: noop },
      appendChild: noop,
      remove: noop,
      set innerHTML(v) {},
      get innerHTML() {
        return "";
      }
    }),
    body: { style: {}, classList: { add: noop, remove: noop }, dataset: {} }
  },
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k)
  },
  location: { href: "", hash: "", search: "", protocol: "https:", hostname: "localhost" },
  navigator: { serviceWorker: undefined },
  setTimeout,
  clearTimeout,
  Date,
  Math,
  JSON,
  TextEncoder,
  crypto: undefined
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

const files = [
  "assets/js/data.js",
  "assets/js/core.js",
  "assets/js/avatar.js",
  "assets/js/cluster.js",
  "assets/js/recommend.js",
  "assets/js/safety.js"
];
for (const f of files) {
  const code = fs.readFileSync(path.join(ROOT, f), "utf8");
  vm.runInContext(code, sandbox, { filename: f });
}
/* expose the lexical declarations we want to assert on */
vm.runInContext(
  `globalThis.T = {
  GRADES, SUBJECTS, COUNTIES, PF_PATHS, PF_QUESTIONS, PF_CLUSTERS, PF_INST, PF_FUNDS, PF_SCH, PF_TUTORS,
  LETTER_APP, gradePts, ptsToGrade, initials, esc, genAvatar, computeCluster, slotCluster,
  scorePaths, safetyCheck, S, save, checksOf
};`,
  sandbox
);
const T = sandbox.T;

/* ============================================================ */
group("grades & subjects");
eq("12 KCSE grades", T.GRADES.length, 12);
eq("A is worth 12 points", T.gradePts("A"), 12);
eq("E is worth 1 point", T.gradePts("E"), 1);
eq("unknown grade is 0 points", T.gradePts("Z"), 0);
eq("2026-style invalid grade is 0", T.gradePts(""), 0);
eq("12 examinable subjects", T.SUBJECTS.length, 12);
ok(
  "core subjects present",
  ["English", "Kiswahili", "Mathematics"].every((s) => T.SUBJECTS.includes(s))
);
eq("points → grade roundtrip", T.ptsToGrade(9), "B");

group("counties");
eq("all 47 counties", T.COUNTIES.length, 47);
ok("Nairobi and Mombasa listed", T.COUNTIES.includes("Nairobi") && T.COUNTIES.includes("Mombasa"));
eq("no duplicate counties", new Set(T.COUNTIES).size, T.COUNTIES.length);

group("institutions");
eq("24 institutions", T.PF_INST.length, 24);
eq("ids are unique", new Set(T.PF_INST.map((i) => i.id)).size, 24);
eq("codes are unique", new Set(T.PF_INST.map((i) => i.code)).size, 24);
ok(
  "every institution has region, field, cut-off and fees",
  T.PF_INST.every((i) => i.region && i.field && i.cutoff && i.fees)
);
ok(
  "every institution has at least 3 programmes",
  T.PF_INST.every((i) => i.progs.length >= 3)
);
ok(
  "public universities carry indicative cut-offs",
  T.PF_INST.filter((i) => i.type === "Public University").every((i) => i.minPts > 0)
);
ok(
  "websites are https where given",
  T.PF_INST.filter((i) => i.site).every((i) => /^https:\/\//.test(i.site))
);
eq("12 public universities", T.PF_INST.filter((i) => i.type === "Public University").length, 12);
eq("6 private universities", T.PF_INST.filter((i) => i.type === "Private University").length, 6);
ok(
  "TVET and KMTC entries exist",
  T.PF_INST.some((i) => i.type.includes("TVET")) && T.PF_INST.some((i) => i.type.includes("KMTC"))
);

group("scholarships & funding");
eq("12 scholarships", T.PF_SCH.length, 12);
ok(
  "every scholarship links to official https",
  T.PF_SCH.every((s) => /^https:\/\//.test(s.url))
);
ok(
  "every scholarship states who it is for",
  T.PF_SCH.every((s) => s.who && s.window)
);
eq("5 HEF bands", T.PF_FUNDS.length, 5);
ok("band 1 is the most needy", T.PF_FUNDS[0].tag === "Most needy");

group("cluster engine");
eq("14 course clusters", T.PF_CLUSTERS.length, 14);
ok(
  "every cluster has four subject slots",
  T.PF_CLUSTERS.every((c) => c.slots.length === 4)
);
const allB = {};
T.SUBJECTS.forEach((s) => (allB[s] = "B"));
eq("all-B best-7 aggregate is 63", T.computeCluster(allB).t, 63);
eq("all-B yields exactly 36 weighted points", +T.computeCluster(allB).weightedOf(36).toFixed(2), 36);
const allA = {};
T.SUBJECTS.forEach((s) => (allA[s] = "A"));
eq("all-A aggregate is 84", T.computeCluster(allA).t, 84);
eq("all-A cluster score caps at 48", Math.round(T.computeCluster(allA).weightedOf(48)), 48);
const mixed = {
  English: "B+",
  Kiswahili: "B",
  Mathematics: "B",
  Biology: "B+",
  Physics: "B",
  Chemistry: "B-",
  Business: "A-",
  Geography: "B",
  History: "B-",
  Agriculture: "C+",
  "Computer Studies": "B+",
  CRE: "A-"
};
const sc = T.slotCluster([["English"], ["Biology", "Physics"], ["Chemistry", "Agriculture"], ["Mathematics"]], mixed);
eq("slot picks the stronger of Biology/Physics", sc.chosen[1], "Biology");
ok("cluster score stays inside 0–48", sc.weighted >= 0 && sc.weighted <= 48);
ok("the lift names one subject", sc.lift && typeof sc.lift.s === "string" && sc.lift.delta > 0);
const SLOTS = [["English"], ["Biology", "Physics"], ["Chemistry", "Agriculture"], ["Mathematics"]];
const ORDER = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"];
const uplift = (s) => {
  const g2 = Object.assign({}, mixed);
  const i = ORDER.indexOf(g2[s]);
  if (i <= 0) return null;
  g2[s] = ORDER[i - 1];
  return T.slotCluster(SLOTS, g2).weighted - sc.weighted;
};
ok(
  "the quoted lift is the best gain among the cluster subjects",
  sc.chosen.every((s) => {
    const d = uplift(s);
    return d === null || d <= sc.lift.delta + 1e-9;
  }),
  "lift " + sc.lift.s + " +" + sc.lift.delta.toFixed(2)
);
ok("the lift gain is positive and smaller than a full grade band jump", sc.lift.delta > 0 && sc.lift.delta < 12);

group("recommender");
eq("6 career pathways", T.PF_PATHS.length, 6);
eq("6 quiz questions", T.PF_QUESTIONS.length, 6);
ok(
  "every question has 4 options",
  T.PF_QUESTIONS.every((q) => q.o.length === 4)
);
ok(
  "all six RIASEC letters appear at least twice",
  ["R", "I", "A", "S", "E", "C"].every((l) => T.LETTER_APP[l] >= 2)
);
ok(
  "pathway interest weights sum to 1",
  T.PF_PATHS.every((p) => Math.abs(Object.values(p.letters).reduce((a, b) => a + b, 0) - 1) < 1e-9)
);
const handsOn = T.PF_QUESTIONS.map((q) => q.o.findIndex((o) => ["R", "I"].includes(o.l)));
const ranked = T.scorePaths(mixed, handsOn);
eq("returns one row per pathway", ranked.length, 6);
ok(
  "matches are sorted high to low",
  ranked.every((r, i) => i === 0 || ranked[i - 1].match >= r.match)
);
ok(
  "every match is a percentage",
  ranked.every((r) => r.match >= 0 && r.match <= 100)
);
ok(
  "hands-on answers favour Engineering or Agriculture",
  ["eng", "agri"].includes(ranked[0].id),
  "top was " + ranked[0].id
);

group("learner safety filter");
const blocked = T.safetyCheck("call me on 0712 345 678");
ok("blocks a phone number", blocked.includes("phone number"), JSON.stringify(blocked));
ok("blocks a social handle", T.safetyCheck("find me @terry_k").includes("social handle (@…)"));
ok("blocks naming WhatsApp", T.safetyCheck("add me on whatsapp").includes("social app name"));
ok("blocks profanity", T.safetyCheck("this is stupid").includes("offensive language"));
ok("allows a normal study message", T.safetyCheck("Please attempt questions 1–5 before we meet.").length === 0);
ok("allows a year reference", T.safetyCheck("KUCCPS opens in April 2026").length === 0);

group("avatars (no image files shipped)");
const a1 = T.genAvatar("Wanjiku Muthoni", 64),
  a2 = T.genAvatar("Wanjiku Muthoni", 64);
ok("avatar is inline SVG", a1.startsWith("<svg") && a1.includes("linearGradient"));
ok("avatar is deterministic", a1 === a2);
ok("avatar shows initials", a1.includes("WM"));
eq("initials from two names", T.initials("Brian Otieno"), "BO");
eq("initials from one name", T.initials("Terry"), "T");

group("escaping");
eq("escapes angle brackets", T.esc("<script>"), "&lt;script&gt;");
eq("escapes quotes", T.esc("\"x\" & 'y'"), "&quot;x&quot; &amp; &#39;y&#39;");
eq("escapes null as empty", T.esc(null), "");

group("tutors");
eq("8 pilot tutors", T.PF_TUTORS.length, 8);
ok(
  "rates stay inside the pilot band 350–600",
  T.PF_TUTORS.every((t) => t.rate >= 350 && t.rate <= 600)
);
ok(
  "every tutor declares checks",
  T.PF_TUTORS.every((t) => t.checks && typeof t.checks.tsc === "boolean")
);
ok(
  "every tutor has at least one subject and slot",
  T.PF_TUTORS.every((t) => t.subjects.length && t.slots.length)
);
ok(
  "no tutor claims a badge without a check",
  T.PF_TUTORS.every((t) => T.checksOf(t).length === 4)
);

group("state defaults");
ok("grade map starts empty", Object.keys(T.S.grades).length === 0);
ok("no shortlist by default", Array.isArray(T.S.shortlist) && T.S.shortlist.length === 0);
eq("default language is English", T.S.lang, "en");

/* ============================================================ */
console.log("\n" + (failed ? "✗ " + failed + " failed, " + passed + " passed" : "✓ all " + passed + " checks passed"));
if (failed) {
  console.log("\nFailures:\n - " + failures.join("\n - "));
  process.exit(1);
}
