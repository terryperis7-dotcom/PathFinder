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
  "assets/js/stages.js",
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
  scorePaths, safetyCheck, S, save, checksOf,
  PF_STAGES, STAGE_ALIASES, CBC_LEVELS, KJSEA_BANDS, CBE_PATHWAYS, CBE_CORE,
  stageId, stage, stageById, isCBC, isKCSE, hasClusterPoints, stageSubjects,
  cbePathway, gradeOptions, gradeLabel, gradeValue, gradePctFor, gradeMaxValue,
  cbcLevelFor, cbcLevelOfBand, bandPoints, gradeScaleNote, cbePathwayFit,
  stageReadiness, stageTimeline, scorePathsForStage, topTraits, cbcLift, interestNorm,
  PF_QUESTIONS
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

/* ============================================================
   The education model — the part that must simply be right
   ============================================================ */
group("stages: the shape of Kenyan schooling in 2026");
eq("six stages", T.PF_STAGES.length, 6);
eq("stage ids", T.PF_STAGES.map((s) => s.id).join(","), "primary,junior,senior,form12,form34,post");
ok(
  "every stage names its system",
  T.PF_STAGES.every((s) => s.system === "cbc" || s.system === "kcse")
);
ok(
  "every stage has a subject list (post-KCSE reuses the KCSE one)",
  T.PF_STAGES.every((s) => s.subjects === null || (Array.isArray(s.subjects) && s.subjects.length >= 5))
);
eq("three CBC stages (primary, junior, senior)", T.PF_STAGES.filter((s) => s.system === "cbc").length, 3);
eq("three 8-4-4 stages (Form 1–2, Form 3–4, post-KCSE)", T.PF_STAGES.filter((s) => s.system === "kcse").length, 3);
ok(
  "junior school ends with KJSEA",
  T.stageById("junior").exam === "KJSEA" && /Grade 9/.test(T.stageById("junior").examNote)
);
ok("primary ends with KPSEA", T.stageById("primary").exam === "KPSEA");
ok(
  "senior school is assessed at Grade 12",
  /Grade 12/.test(T.stageById("senior").exam) && /four core plus three/.test(T.stageById("senior").examNote)
);
ok(
  "the last KCSE is dated 2027 in the stage copy",
  /2027/.test(T.stageById("form34").examNote + T.stageById("post").examNote)
);

group("stages: legacy labels still resolve");
for (const [alias, id] of [
  ["CBC Grade 7–9", "junior"],
  ["CBC Grade 10–12", "senior"],
  ["KCSE Form 3–4", "form34"],
  ["Form 2", "form12"],
  ["Form Four leaver", "post"],
  ["TVET scholar", "post"],
  ["Grade 8", "junior"],
  ["Grade 6", "primary"]
]) {
  T.S.profile.stage = alias;
  eq("alias “" + alias + "” → " + id, T.stageId(), id);
}
T.S.profile.stage = "nonsense";
eq("unknown stage falls back to Form 3–4", T.stageId(), "form34");

group("grading: CBC levels and KJSEA bands");
eq("four CBC levels", T.CBC_LEVELS.length, 4);
eq("levels are EE, ME, AE, BE", T.CBC_LEVELS.map((l) => l.code).join(","), "EE,ME,AE,BE");
eq("EE is worth the most", Math.max(...T.CBC_LEVELS.map((l) => l.pts)), 4);
eq("BE is worth the least", Math.min(...T.CBC_LEVELS.map((l) => l.pts)), 1);
eq("eight KJSEA reporting bands", T.KJSEA_BANDS.length, 8);
eq("bands run EE1 → BE2", T.KJSEA_BANDS.map((b) => b.code).join(","), "EE1,EE2,ME1,ME2,AE1,AE2,BE1,BE2");
eq("KJSEA points run 8 → 1", T.KJSEA_BANDS.map((b) => b.pts).join(","), "8,7,6,5,4,3,2,1");
ok(
  "the bands cover 100 down to 0 with no gap",
  (() => {
    const sorted = [...T.KJSEA_BANDS].sort((a, b) => b.min - a.min);
    let next = 100;
    for (const b of sorted) {
      if (b.max !== next) return false;
      next = b.min - 1;
    }
    return next === -1;
  })()
);
eq("90–100 is EE1", T.KJSEA_BANDS.find((b) => b.min === 90).code, "EE1");
eq("0–10 is BE2", T.KJSEA_BANDS.find((b) => b.max === 10).code, "BE2");
eq("a 95 lands in EE", T.cbcLevelFor(95), "EE1");
eq("a 45 lands in ME", T.cbcLevelFor(45), "ME2");
eq("a 5 lands in BE", T.cbcLevelFor(5), "BE2");
eq("band → level", T.cbcLevelOfBand("ME1"), "ME");
eq("band → points", T.bandPoints("EE1"), 8);
eq("unknown band has no points", T.bandPoints("ZZ"), 0);

group("grading: the scale in use is the stage's scale");
T.S.profile.stage = "KCSE Form 3–4";
eq("KCSE offers A–E", T.gradeOptions().length, 12);
eq("KCSE keeps 12 points for an A", T.gradeValue("A"), 12);
eq("A is 100%", T.gradePctFor("A"), 100);
eq("KCSE max is 12", T.gradeMaxValue(), 12);
ok("KCSE has cluster points", T.hasClusterPoints());
ok("KCSE scale note mentions clusters", /cluster/.test(T.gradeScaleNote()));
T.S.profile.stage = "junior";
eq("CBC offers four levels", T.gradeOptions().join(","), "EE,ME,AE,BE");
eq("CBC never invents 12 points", T.gradeValue("EE"), 4);
eq("CBC max is 4", T.gradeMaxValue(), 4);
ok("CBC has no cluster points", !T.hasClusterPoints());
ok("CBC scale note says so", /never turns it into a KCSE point/.test(T.gradeScaleNote()));
eq("CBC label is readable", T.gradeLabel("EE").slice(0, 2), "EE");
eq("an unknown CBC level is 0", T.gradeValue("B+"), 0);

group("subjects follow the stage");
T.S.profile.stage = "junior";
ok("junior has Integrated Science", T.stageSubjects().includes("Integrated Science"));
ok("junior has Pre-Technical Studies", T.stageSubjects().includes("Pre-Technical Studies"));
ok("junior never lists KCSE-only CRE", !T.stageSubjects().includes("CRE"));
T.S.profile.stage = "senior";
T.S.profile.pathway = "stem";
T.S.profile.electives = ["Physics", "Chemistry", "Biology"];
ok(
  "senior keeps the four core areas",
  T.CBE_CORE.every((c) => T.stageSubjects().includes(c))
);
ok(
  "senior adds the chosen electives",
  ["Physics", "Chemistry", "Biology"].every((e) => T.stageSubjects().includes(e))
);
eq("seven learning areas in senior school", T.stageSubjects().length, 7);
T.S.profile.electives = [];
eq("no electives chosen still gives seven", T.stageSubjects().length, 7);
T.S.profile.stage = "form34";
eq("KCSE uses the 12 examinable subjects", T.stageSubjects().length, 12);

group("pathways: three, and only three");
eq("three senior pathways", T.CBE_PATHWAYS.length, 3);
eq("they are STEM, Social Sciences and Arts & Sports", T.CBE_PATHWAYS.map((p) => p.id).join(","), "stem,social,arts");
ok("no fourth 'Languages' pathway", !T.CBE_PATHWAYS.some((p) => /language/i.test(p.label)));
ok(
  "each pathway has electives",
  T.CBE_PATHWAYS.every((p) => p.electives.length >= 3)
);
ok(
  "each pathway maps to career paths",
  T.CBE_PATHWAYS.every((p) => p.pfPaths.length >= 1)
);
T.S.profile.pathway = "arts";
eq("a chosen pathway resolves", T.cbePathway().id, "arts");
T.S.profile.pathway = "";
eq("no pathway resolves to null", T.cbePathway(), null);

group("pathway fit is arithmetic, not magic");
T.S.profile.stage = "junior";
T.S.grades = { English: "EE", Kiswahili: "ME", Mathematics: "EE", "Integrated Science": "EE", "Social Studies": "AE" };
const fits = T.cbePathwayFit();
eq("a fit row per pathway", fits.length, 3);
ok(
  "fit percentages stay inside 0–100",
  fits.every((f) => f.pct >= 0 && f.pct <= 100)
);
ok("a pathway with no graded subjects is flagged", fits.some((f) => !f.has) || fits.every((f) => f.has));
ok(
  "fit is sorted strongest first",
  fits.every((f, i) => i === 0 || fits[i - 1].pct >= f.pct)
);
T.S.grades = {};
ok(
  "no grades never crashes the fit",
  T.cbePathwayFit().every((f) => f.pct === 0 && !f.has)
);

group("readiness and timelines are honest");
T.S.profile.stage = "form34";
T.S.grades = { English: "B" };
T.S.result = null;
const rd = T.stageReadiness();
ok("readiness lists checks", rd.checks.length >= 3);
ok("it counts what is entered", rd.filled === 1 && rd.total === 12, rd.filled + "/" + rd.total);
ok(
  "KCSE readiness waits for seven subjects",
  rd.checks.some((c) => /Best seven/.test(c.detail))
);
T.S.profile.stage = "senior";
T.S.profile.pathway = "";
ok(
  "senior readiness asks for a pathway",
  T.stageReadiness().checks.some((c) => /pathway/i.test(c.label) && !c.done)
);
const tl = T.stageTimeline();
ok(
  "every timeline row has a when and a what",
  tl.every((x) => x.when && x.what && x.note)
);
T.S.profile.stage = "junior";
ok(
  "junior timeline mentions the 20/20/60 blend",
  T.stageTimeline().some((x) => /60%/.test(x.note))
);
T.S.profile.stage = "form34";
ok(
  "KCSE timeline names November 2027",
  T.stageTimeline().some((x) => /2027/.test(x.when))
);
T.S.profile.stage = "nonsense";
ok("an unknown stage still returns a timeline", T.stageTimeline().length >= 1);

group("scoring works in both systems");
const ANSW = [0, 1, 2, 3, 0, 1];
T.S.profile.stage = "form34";
T.S.grades = {
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
const kcseScores = T.scorePathsForStage(ANSW);
eq("a score for every path", kcseScores.length, T.PF_PATHS.length);
ok(
  "KCSE scores are 0–100",
  kcseScores.every((p) => p.match >= 0 && p.match <= 100)
);
ok(
  "KCSE scores are ranked",
  kcseScores.every((p, i) => i === 0 || kcseScores[i - 1].match >= p.match)
);
ok(
  "KCSE carries cluster points",
  kcseScores.every((p) => typeof p.c.weighted === "number")
);
T.S.profile.stage = "junior";
T.S.grades = {
  English: "ME",
  Kiswahili: "ME",
  Mathematics: "EE",
  "Integrated Science": "ME",
  "Social Studies": "AE",
  Agriculture: "ME"
};
const cbcScores = T.scorePathsForStage(ANSW);
eq("CBC scores every path too", cbcScores.length, T.PF_PATHS.length);
ok(
  "CBC scores are 10–98",
  cbcScores.every((p) => p.match >= 10 && p.match <= 98),
  cbcScores.map((p) => p.match).join(",")
);
ok(
  "CBC does not fake weighted points",
  cbcScores.every((p) => p.c.cbc === true && p.c.weighted === undefined)
);
ok(
  "CBC percentages are 0–100",
  cbcScores.every((p) => p.c.pct >= 0 && p.c.pct <= 100)
);
T.S.grades = {};
ok("no grades still returns scores", T.scorePathsForStage(ANSW).length === T.PF_PATHS.length);
ok("no answers still returns scores", T.scorePathsForStage([]).length === T.PF_PATHS.length);

group("traits and lifts");
T.S.profile.stage = "form34";
const traits = T.topTraits(ANSW, 2);
eq("two traits by default shot", traits.length, 2);
ok(
  "traits are labelled in words",
  traits.every((t) => t.label && typeof t.label === "string")
);
ok(
  "trait scores are normalised",
  traits.every((t) => t.score > 0 && t.score <= 1)
);
T.S.profile.stage = "junior";
T.S.grades = { English: "AE", Kiswahili: "ME", Mathematics: "EE", "Integrated Science": "AE" };
const lift = T.cbcLift();
ok("a CBC lift is suggested", lift && lift.s && lift.gain > 0, JSON.stringify(lift));
T.S.grades = { English: "EE", Kiswahili: "EE" };
eq("nothing to lift when everything is EE", T.cbcLift(), null);

group("stage helpers never throw");
for (const st of T.PF_STAGES) {
  T.S.profile.stage = st.id;
  T.S.grades = {};
  T.S.result = null;
  let threw = null;
  try {
    T.stageSubjects();
    T.gradeOptions();
    T.gradeScaleNote();
    T.cbePathwayFit();
    T.stageReadiness();
    T.stageTimeline();
    T.scorePathsForStage(ANSW);
    T.cbcLift();
    T.topTraits(ANSW, 3);
  } catch (e) {
    threw = e.message;
  }
  ok("no throw for " + st.id, !threw, threw || "");
}
T.S.profile.stage = "form34";
T.S.grades = {};

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
