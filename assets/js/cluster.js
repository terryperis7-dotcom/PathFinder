/* ============================================================
   PathFinder Kenya — KUCCPS cluster points engine
   © 2026 PathFinder Kenya. All rights reserved. See /LICENSE.

   Implements the official KUCCPS weighted-cluster-point formula:

       w = √( (r / 48) × (t / 84) ) × 48

     r = raw cluster points — sum of grade points in the 4
         cluster subjects required by the programme (max 48)
     t = aggregate points — sum of grade points in your best
         7 KCSE subjects (max 84)
     w = weighted cluster points, reported to 3 decimal places

   Grade points: A=12  A-=11  B+=10  B=9  B-=8  C+=7
                 C=6   C-=5   D+=4   D=3  D-=2  E=1

   SOURCES
   - Formula & grade scale: widely published KUCCPS methodology,
     corroborated across the KUCCPS student portal and official
     placement guidance.
   - Subject groups (I–V) and per-cluster subject requirements:
     KUCCPS "Degree Cluster Document" (kuccps.net) and
     students.kuccps.net programme listings.

   ACCURACY
   Clusters flagged `official: true` follow the published KUCCPS
   Degree Cluster Document slot requirements. Clusters flagged
   `official: false` are derived for programmes whose slot
   definition varies by sub-cluster — treat as indicative.
   Cut-offs are INDICATIVE: KUCCPS recalculates them every
   placement cycle. Always confirm on students.kuccps.net.
   ============================================================ */

/* ---------- Grade scale ---------- */
const PF_GRADE_POINTS = {
  "A": 12, "A-": 11, "B+": 10, "B": 9, "B-": 8, "C+": 7,
  "C": 6, "C-": 5, "D+": 4, "D": 3, "D-": 2, "E": 1
};
/* Best → worst, used for "raise this grade" suggestions */
const PF_GRADE_ORDER = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"];

/* ---------- KNEC percentage → letter grade ----------
   Official KCSE grade boundaries. Lets the calculator prefill
   from the percentage marks a student already logged in the
   PathFinder tracker, then be corrected to the real result.
*/
const PF_KNEC_GRADES = [
  { grade: "A",  min: 80 }, { grade: "A-", min: 75 }, { grade: "B+", min: 70 },
  { grade: "B",  min: 65 }, { grade: "B-", min: 60 }, { grade: "C+", min: 55 },
  { grade: "C",  min: 50 }, { grade: "C-", min: 45 }, { grade: "D+", min: 40 },
  { grade: "D",  min: 35 }, { grade: "D-", min: 30 }, { grade: "E",  min: 0 }
];

/* Convert a percentage mark to its KCSE letter grade. */
function gradeFromScore(score) {
  const n = Number(score);
  if (!isFinite(n) || n < 0) return null;
  const hit = PF_KNEC_GRADES.filter(g => n >= g.min)[0];
  return hit ? hit.grade : null;
}

/* ---------- KCSE subjects and their official KUCCPS group ----------
   Group I   : English, Kiswahili, Mathematics (Alt A / Alt B)
   Group II  : Biology, Physics, Chemistry, General Science
   Group III : History & Govt, Geography, CRE, IRE, HRE
   Group IV  : Home Science, Art & Design, Agriculture, Woodwork,
               Metalwork, Building Construction, Power Mechanics,
               Electricity, Drawing & Design, Aviation, Computer Studies
   Group V   : French, German, Arabic, Sign Language, Music, Business
*/
const PF_SUBJECTS = [
  { code: "ENG",  name: "English",                    group: "I",   common: true },
  { code: "KIS",  name: "Kiswahili",                  group: "I",   common: true },
  { code: "MATA", name: "Mathematics (Alt A)",        group: "I",   common: true },
  { code: "MATB", name: "Mathematics (Alt B)",        group: "I",   common: true },
  { code: "BIO",  name: "Biology",                    group: "II",  common: true },
  { code: "PHY",  name: "Physics",                    group: "II",  common: true },
  { code: "CHE",  name: "Chemistry",                  group: "II",  common: true },
  { code: "GSC",  name: "General Science",            group: "II",  common: false },
  { code: "HAG",  name: "History & Government",       group: "III", common: true },
  { code: "GEO",  name: "Geography",                  group: "III", common: true },
  { code: "CRE",  name: "Christian Religious Education", group: "III", common: true },
  { code: "IRE",  name: "Islamic Religious Education",   group: "III", common: false },
  { code: "HRE",  name: "Hindu Religious Education",     group: "III", common: false },
  { code: "HSC",  name: "Home Science",               group: "IV",  common: true },
  { code: "ARD",  name: "Art & Design",               group: "IV",  common: false },
  { code: "AGR",  name: "Agriculture",                group: "IV",  common: true },
  { code: "WW",   name: "Woodwork",                   group: "IV",  common: false },
  { code: "MW",   name: "Metalwork",                  group: "IV",  common: false },
  { code: "BC",   name: "Building Construction",      group: "IV",  common: false },
  { code: "PM",   name: "Power Mechanics",            group: "IV",  common: false },
  { code: "ECT",  name: "Electricity",                group: "IV",  common: false },
  { code: "DRD",  name: "Drawing & Design",           group: "IV",  common: false },
  { code: "AVT",  name: "Aviation Technology",        group: "IV",  common: false },
  { code: "CMP",  name: "Computer Studies",           group: "IV",  common: true },
  { code: "FRE",  name: "French",                     group: "V",   common: false },
  { code: "GER",  name: "German",                     group: "V",   common: false },
  { code: "ARB",  name: "Arabic",                     group: "V",   common: false },
  { code: "KSL",  name: "Kenyan Sign Language",       group: "V",   common: false },
  { code: "MUC",  name: "Music",                      group: "V",   common: false },
  { code: "BST",  name: "Business Studies",           group: "V",   common: true }
];

/* Groups as code sets — built once, used by slot expansion */
const PF_GROUP_CODES = {};
PF_SUBJECTS.forEach(s => { (PF_GROUP_CODES[s.group] = PF_GROUP_CODES[s.group] || []).push(s.code); });
const PF_SUBJECT_BY_CODE = {};
PF_SUBJECTS.forEach(s => { PF_SUBJECT_BY_CODE[s.code] = s; });
const PF_GROUP_NAMES = {
  I: "English · Kiswahili · Mathematics",
  II: "Biology · Physics · Chemistry · General Science",
  III: "History · Geography · Religious Education",
  IV: "Technical & applied subjects",
  V: "Languages · Music · Business Studies"
};

/* Slot helper: a slot is { pick:[codes], groups:[roman] }.
   "groups" means any subject in that group qualifies. */
function slotCodes(slot) {
  const out = [];
  (slot.pick || []).forEach(c => { if (out.indexOf(c) < 0) out.push(c); });
  (slot.groups || []).forEach(g => (PF_GROUP_CODES[g] || []).forEach(c => { if (out.indexOf(c) < 0) out.push(c); }));
  return out;
}

/* ---------- Degree programme clusters ----------
   `slots` mirror the four KUCCPS cluster subjects, in order.
   `mins` are KUCCPS minimum subject grades where published.
*/
const PF_CLUSTERS = [
  {
    id: "medicine", num: 13, name: "Medicine, Nursing, Pharmacy & Health Sciences",
    icon: "⚕️", official: true,
    programmes: ["MBChB Medicine & Surgery", "BDS Dental Surgery", "B.Pharm Pharmacy",
                 "BSc Nursing", "BSc Clinical Medicine", "BSc Medical Laboratory Science",
                 "BSc Veterinary Medicine", "BSc Public Health"],
    slots: [
      { pick: ["BIO"] },
      { pick: ["CHE"] },
      { pick: ["MATA", "PHY"] },
      { pick: ["ENG", "KIS"], groups: ["II", "III", "IV", "V"] }
    ],
    mins: [{ code: "BIO", min: "B" }, { code: "CHE", min: "B" }, { code: "MATA", min: "B", alt: ["PHY"] }]
  },
  {
    id: "engineering", num: 5, name: "Engineering, Engineering Technology & Energy",
    icon: "⚙️", official: true,
    programmes: ["BSc Civil Engineering", "BSc Mechanical Engineering", "BSc Electrical & Electronic Engineering",
                 "BSc Mechatronics", "BSc Software Engineering", "BSc Telecommunications", "BSc Geomatic Engineering"],
    slots: [
      { pick: ["MATA"] },
      { pick: ["PHY"] },
      { pick: ["CHE"] },
      { pick: ["BIO"], groups: ["III", "IV", "V"] }
    ],
    mins: [{ code: "MATA", min: "C+" }, { code: "PHY", min: "C+" }, { code: "CHE", min: "C+" }]
  },
  {
    id: "computing", num: 7, name: "Computer Science, Cyber Security & Information Technology",
    icon: "💻", official: true,
    programmes: ["BSc Computer Science", "BSc Applied Computer Science", "BSc Software Engineering",
                 "BSc Computer Security & Forensics", "BSc Information Technology",
                 "BSc Computer Information Systems", "BSc Mathematics & Computer Science",
                 "BSc Statistics & Computer Science", "B.Tech Computer Technology"],
    slots: [
      { pick: ["MATA"] },
      { pick: ["PHY"] },
      { groups: ["II", "III"] },
      { groups: ["II", "III", "IV", "V"] }
    ],
    mins: [{ code: "MATA", min: "C+" }]
  },
  {
    id: "actuarial", num: 10, name: "Actuarial Science, Accountancy, Economics & Statistics",
    icon: "📈", official: true,
    programmes: ["BSc Actuarial Science", "BSc Accountancy", "BCom Commerce", "BSc Economics",
                 "BSc Statistics", "BSc Financial Economics", "BSc Mathematics"],
    slots: [
      { pick: ["MATA"] },
      { groups: ["II", "III"] },
      { groups: ["II", "III"] },
      { groups: ["II", "III", "IV", "V"] }
    ],
    mins: [{ code: "MATA", min: "C+" }]
  },
  {
    id: "business", num: 2, name: "Business, Hospitality & Tourism",
    icon: "💼", official: true,
    programmes: ["BCom Commerce", "BSc International Business", "BBA Business Administration",
                 "BSc Hospitality Management", "BSc Tourism Management", "BSc Procurement & Supply Chain"],
    slots: [
      { pick: ["ENG", "KIS"] },
      { pick: ["MATA", "MATB"] },
      { groups: ["II", "III"] },
      { groups: ["II", "III", "IV", "V"] }
    ],
    mins: []
  },
  {
    id: "architecture", num: 6, name: "Architecture, Quantity Survey & Building Construction",
    icon: "🏗", official: true,
    programmes: ["BArch Architecture", "BSc Quantity Surveying", "BSc Building Construction Management",
                 "BSc Urban & Regional Planning", "BSc Construction Management", "BSc Interior Design"],
    slots: [
      { pick: ["MATA"] },
      { pick: ["PHY"] },
      { groups: ["III"] },
      { groups: ["II", "III", "IV", "V"] }
    ],
    mins: [{ code: "MATA", min: "C+" }]
  },
  {
    id: "sciences", num: 9, name: "General & Biological Sciences, Physics & Chemistry",
    icon: "🔬", official: true,
    programmes: ["BSc Biochemistry", "BSc Microbiology", "BSc Biotechnology", "BSc Physics",
                 "BSc Chemistry", "BSc Botany", "BSc Zoology", "BSc Food Science & Technology"],
    slots: [
      { pick: ["BIO"] },
      { pick: ["CHE"] },
      { pick: ["MATA", "PHY", "GEO"] },
      { pick: ["ENG", "KIS"], groups: ["II", "III", "IV", "V"] }
    ],
    mins: []
  },
  {
    id: "law", num: 1, name: "Law",
    icon: "⚖️", official: true,
    programmes: ["Bachelor of Laws (LL.B)"],
    slots: [
      { pick: ["ENG", "KIS"] },
      { pick: ["MATA", "MATB"], groups: ["II"] },
      { groups: ["III"] },
      { groups: ["II", "III", "IV", "V"] }
    ],
    mins: []
  },
  {
    id: "media", num: 3, name: "Communication, Media, Languages & Film",
    icon: "🎬", official: true,
    programmes: ["BA Communication", "BA Journalism", "BA Film Production", "BA Public Relations",
                 "BA International Relations", "BA Languages & Linguistics", "BSc Graphics & Animation"],
    slots: [
      { pick: ["ENG", "KIS"] },
      { pick: ["MATA", "MATB"], groups: ["II"] },
      { groups: ["III"] },
      { groups: ["II", "III", "IV", "V"] }
    ],
    mins: []
  },
  {
    id: "agriculture", num: 8, name: "Agriculture, Agribusiness & Environmental Studies",
    icon: "🌾", official: false,
    programmes: ["BSc Agriculture", "BSc Agribusiness Management", "BSc Agricultural Economics",
                 "BSc Animal Science", "BSc Horticulture", "BSc Environmental Science",
                 "BSc Natural Resources Management", "BSc Agricultural Engineering"],
    slots: [
      { pick: ["BIO", "AGR"] },
      { pick: ["MATA", "MATB"] },
      { groups: ["II", "III"] },
      { pick: ["ENG", "KIS"], groups: ["II", "III", "IV", "V"] }
    ],
    mins: []
  },
  {
    id: "education", num: 15, name: "Education (B.Ed Arts & B.Ed Science)",
    icon: "👩‍🏫", official: false,
    programmes: ["B.Ed Arts", "B.Ed Science", "B.Ed Early Childhood Education",
                 "B.Ed Special Needs Education", "B.Ed Primary Education"],
    slots: [
      { pick: ["ENG", "KIS"] },
      { groups: ["II", "III", "IV", "V"] },
      { groups: ["II", "III", "IV", "V"] },
      { groups: ["I", "II", "III", "IV", "V"] }
    ],
    mins: []
  },
  {
    id: "geosciences", num: 4, name: "Geosciences, Earth Science & Meteorology",
    icon: "🌍", official: false,
    programmes: ["BSc Geology", "BSc Geophysics", "BSc Meteorology", "BSc Geospatial Engineering",
                 "BSc Mining & Mineral Processing"],
    slots: [
      { pick: ["GEO"] },
      { pick: ["CHE", "PHY"] },
      { pick: ["MATA", "MATB"] },
      { pick: ["ENG", "KIS"], groups: ["II", "III", "IV", "V"] }
    ],
    mins: []
  },
  {
    id: "sports", num: 12, name: "Sports Science, Recreation & Wellness",
    icon: "🏃", official: false,
    programmes: ["BSc Sports Science", "BSc Exercise & Sport Science", "BSc Recreation & Sports Management",
                 "BSc Health Promotion & Sports Science", "BSc Sports Management"],
    slots: [
      { pick: ["BIO", "GSC"] },
      { pick: ["MATA", "MATB"] },
      { groups: ["II", "III"] },
      { pick: ["ENG", "KIS"], groups: ["II", "III", "IV", "V"] }
    ],
    mins: []
  },
  {
    id: "design", num: 11, name: "Fashion Design, Textiles & Fine Art",
    icon: "🎨", official: false,
    programmes: ["BSc Fashion Design", "BSc Textile Engineering", "BFA Fine Art",
                 "BSc Industrial Design", "BSc Clothing, Fashion & Textile"],
    /* KUCCPS cluster 11 takes a very broad first subject; the remaining
       three vary by sub-cluster, so we accept any academic or applied
       subject rather than requiring an art/technical one. */
    slots: [
      { pick: ["ENG", "KIS", "MATA", "MATB", "HAG", "GEO", "CRE", "HSC", "ARD", "CMP"], groups: ["V"] },
      { groups: ["II", "III", "IV", "V"] },
      { groups: ["II", "III", "IV", "V"] },
      { groups: ["II", "III", "IV", "V"] }
    ],
    mins: []
  }
];

/* ---------- Indicative cut-off points ----------
   Published figures from recent placement cycles. KUCCPS
   recalculates cut-offs every year — these are for orientation
   only and must be confirmed on students.kuccps.net.
*/
const PF_CUTOFFS = [
  { programme: "MBChB Medicine & Surgery",      inst: "University of Nairobi",  cluster: "medicine",     lo: 43.5, hi: 44.5 },
  { programme: "MBChB Medicine & Surgery",      inst: "Moi University",         cluster: "medicine",     lo: 41.8, hi: 43.2 },
  { programme: "MBChB Medicine & Surgery",      inst: "Kenyatta University",    cluster: "medicine",     lo: 42.0, hi: 43.4 },
  { programme: "B.Pharm Pharmacy",              inst: "JKUAT",                  cluster: "medicine",     lo: 41.2, hi: 42.6 },
  { programme: "BSc Nursing",                   inst: "Kirinyaga University",   cluster: "medicine",     lo: 39.372, hi: 39.372 },
  { programme: "BSc Nursing",                   inst: "Kisii University",       cluster: "medicine",     lo: 36.5, hi: 38.4 },
  { programme: "BSc Computer Science",          inst: "University of Nairobi",  cluster: "computing",    lo: 41.5, hi: 42.8 },
  { programme: "BSc Computer Science",          inst: "JKUAT",                  cluster: "computing",    lo: 40.1, hi: 41.7 },
  { programme: "BSc Computer Science",          inst: "Kisii University",       cluster: "computing",    lo: 33.0, hi: 35.5 },
  { programme: "BSc Civil Engineering",         inst: "University of Nairobi",  cluster: "engineering",  lo: 42.0, hi: 43.6 },
  { programme: "BSc Mechatronics",              inst: "Dedan Kimathi (DeKUT)",  cluster: "engineering",  lo: 38.4, hi: 40.2 },
  { programme: "BSc Actuarial Science",         inst: "University of Nairobi",  cluster: "actuarial",    lo: 38.5, hi: 40.5 },
  { programme: "BSc Actuarial Science",         inst: "JKUAT",                  cluster: "actuarial",    lo: 36.8, hi: 38.9 },
  { programme: "Bachelor of Laws (LL.B)",       inst: "University of Nairobi",  cluster: "law",          lo: 39.8, hi: 41.5 },
  { programme: "Bachelor of Laws (LL.B)",       inst: "Kenyatta University",    cluster: "law",          lo: 38.6, hi: 40.2 },
  { programme: "Bachelor of Laws (LL.B)",       inst: "Kisii University",       cluster: "law",          lo: 34.5, hi: 36.5 },
  { programme: "BCom Commerce",                 inst: "Kenyatta University",    cluster: "business",     lo: 34.0, hi: 36.2 },
  { programme: "B.Ed Arts",                     inst: "Kenyatta University",    cluster: "education",    lo: 30.0, hi: 33.0 },
  { programme: "BSc Agriculture",               inst: "Egerton University",     cluster: "agriculture",  lo: 30.5, hi: 33.5 }
];

/* ============================================================
   Core calculations
   ============================================================ */

/* Grade → points. Unknown/blank grades score 0. */
function gradePoints(grade) {
  return PF_GRADE_POINTS[String(grade || "").trim().toUpperCase()] || 0;
}

/* Sum of the best `n` grade points across every subject the
   student has a grade for. KUCCPS uses the best 7 (max 84). */
function aggregatePoints(grades, n) {
  const count = n == null ? 7 : n;
  const vals = Object.keys(grades || {})
    .map(c => gradePoints(grades[c]))
    .filter(v => v > 0)
    .sort((a, b) => b - a);
  return vals.slice(0, count).reduce((a, b) => a + b, 0);
}

/* The official weighted-cluster-point formula.
   raw = r (max 48), agg = t (max 84). Returns 3 dp. */
function weightedClusterPoints(raw, agg) {
  const r = Math.max(0, Math.min(48, Number(raw) || 0));
  const t = Math.max(0, Math.min(84, Number(agg) || 0));
  if (r <= 0 || t <= 0) return 0;
  const w = Math.sqrt((r / 48) * (t / 84)) * 48;
  return Math.round(w * 1000) / 1000;
}

/* Choose the best available subject for each of the four slots.
   A subject may only be counted ONCE across the four slots
   (KUCCPS rule), so we search for the assignment with the
   highest total rather than greedily taking the best each time.

   grades — { CODE: "B+", ... } — only graded subjects are offered.
   Returns { picked:[code|null x4], raw:number, perSlot:[points x4] }
*/
function pickClusterSubjects(slots, grades) {
  const g = grades || {};
  const names = slots.map(s => slotCodes(s).filter(c => gradePoints(g[c]) > 0));

  let best = { picked: [null, null, null, null], raw: -1, perSlot: [0, 0, 0, 0] };

  function walk(i, used, picked, sum) {
    // Prune: even if every remaining slot scored 12 we can't beat `best`
    if (sum + 12 * (slots.length - i) <= best.raw) return;
    if (i === slots.length) {
      if (sum > best.raw) {
        best = {
          picked: picked.slice(),
          perSlot: picked.map(c => gradePoints(g[c])),
          raw: sum
        };
      }
      return;
    }
    const cands = names[i]
      .filter(c => !used[c])
      .sort((a, b) => gradePoints(g[b]) - gradePoints(g[a])); // strongest first
    if (!cands.length) { // no graded subject fits this slot
      const next = picked.slice(); next.push(null);
      walk(i + 1, used, next, sum);
      return;
    }
    cands.forEach(c => {
      const u = Object.assign({}, used); u[c] = true;
      const next = picked.slice(); next.push(c);
      walk(i + 1, u, next, sum + gradePoints(g[c]));
    });
  }
  walk(0, {}, [], 0);

  if (best.raw < 0) best.raw = 0;
  return best;
}

/* Check KUCCPS minimum subject grades for a cluster.
   Returns a list of { code, name, min, grade, ok, note } */
function checkClusterMinimums(cluster, grades) {
  const g = grades || {};
  return (cluster.mins || []).map(m => {
    const codes = [m.code].concat(m.alt || []);
    const grade = g[m.code];
    let ok = gradePoints(grade) >= gradePoints(m.min);
    let which = m.code;
    if (!ok && (m.alt || []).length) {
      // an alternative subject may satisfy the requirement
      const alt = (m.alt || []).find(c => gradePoints(g[c]) >= gradePoints(m.min));
      if (alt) { ok = true; which = alt; }
    }
    return {
      code: m.code, which: which, name: PF_SUBJECT_BY_CODE[m.code] ? PF_SUBJECT_BY_CODE[m.code].name : m.code,
      min: m.min, grade: grade || null, ok: ok,
      note: ok ? "Met" : "Below the KUCCPS minimum for this cluster",
      slots: codes
    };
  });
}

/* Full calculation for one cluster.
   grades — { CODE: "B+", ... }
   Returns a result object used by the UI and by tests. */
function computeClusterResult(clusterIdOrObj, grades) {
  const cluster = typeof clusterIdOrObj === "string"
    ? PF_CLUSTERS.filter(c => c.id === clusterIdOrObj)[0]
    : clusterIdOrObj;
  if (!cluster) return null;

  const g = grades || {};
  const pick = pickClusterSubjects(cluster.slots, grades);
  const agg = aggregatePoints(grades, 7);
  const points = weightedClusterPoints(pick.raw, agg);
  const mins = checkClusterMinimums(cluster, grades);

  return {
    cluster: cluster,
    picked: pick.picked,
    perSlot: pick.perSlot,
    raw: pick.raw,
    aggregate: agg,
    points: points,
    maxRaw: 48,
    maxAggregate: 84,
    minimums: mins,
    eligible: mins.every(m => m.ok) && pick.picked.filter(Boolean).length === 4,
    missing: pick.picked.map((c, i) => c ? null : i).filter(i => i !== null)
  };
}

/* Calculate every cluster at once, ranked best-first. */
function computeAllClusters(grades) {
  return PF_CLUSTERS
    .map(c => computeClusterResult(c, grades))
    .filter(Boolean)
    .sort((a, b) => b.points - a.points);
}

/* What if this one subject went up by `steps` grades?
   Returns new points and the delta — powers the
   "which subject should I push?" advice. */
function simulateSubjectImprovement(clusterId, grades, code, steps) {
  const g = Object.assign({}, grades || {});
  const cur = String(g[code] || "").toUpperCase();
  const idx = PF_GRADE_ORDER.indexOf(cur);
  if (idx < 0) return null;
  const next = PF_GRADE_ORDER[Math.max(0, idx - (steps || 1))];
  if (next === cur) return null;
  g[code] = next;
  const before = computeClusterResult(clusterId, grades);
  const after = computeClusterResult(clusterId, g);
  if (!before || !after) return null;
  return {
    code: code, from: cur, to: next,
    before: before.points, after: after.points,
    delta: Math.round((after.points - before.points) * 1000) / 1000,
    stillInCluster: after.picked.indexOf(code) >= 0
  };
}

/* Rank subjects by how much the cluster score would rise if each
   improved by one grade. Only returns positive, meaningful moves. */
function improvementPlan(clusterId, grades, limit) {
  const codes = Object.keys(grades || {}).filter(c => gradePoints(grades[c]) > 0 && grades[c] !== "A");
  const out = [];
  codes.forEach(c => {
    const s = simulateSubjectImprovement(clusterId, grades, c, 1);
    if (s && s.delta > 0) out.push(s);
  });
  out.sort((a, b) => b.delta - a.delta);
  return typeof limit === "number" ? out.slice(0, limit) : out;
}

/* Match a student's score against the indicative cut-off table. */
function matchCutoffs(clusterId, points) {
  return PF_CUTOFFS
    .filter(c => c.cluster === clusterId)
    .map(c => {
      const target = c.hi > c.lo ? c.hi : c.lo;   // aim for the top of the range
      const gap = Math.round((target - points) * 1000) / 1000;
      return {
        programme: c.programme, inst: c.inst, lo: c.lo, hi: c.hi, target: target, gap: gap,
        verdict: gap <= 0 ? "likely" : gap <= 1.5 ? "borderline" : "short"
      };
    })
    .sort((a, b) => a.gap - b.gap);
}

/* Human-readable breakdown of the formula, for the UI */
function explainCluster(result) {
  const r = result.raw, t = result.aggregate;
  return "w = √(( " + r + " / 48 ) × ( " + t + " / 84 )) × 48 = " +
    result.points.toFixed(3) + " points";
}

/* ---------- Bridging the tracker to the calculator ----------
   The tracker stores free-text subject names and percentage marks.
   These helpers convert that into the { CODE: "B+" } shape the
   cluster engine expects, so a student does not retype their results.
*/

/* Map a free-text subject name onto a KCSE subject code. */
function matchSubjectCode(name) {
  const s = String(name || "").toLowerCase().trim();
  if (!s) return null;
  const table = [
    [/^(eng|english)\b/, "ENG"],
    [/^(kis|kiswahili|swahili)\b/, "KIS"],
    [/^(mat|math|maths|mathematics)\b/, "MATA"],
    [/^(bio|biology)\b/, "BIO"],
    [/^(phy|physics)\b/, "PHY"],
    [/^(che|chem|chemistry)\b/, "CHE"],
    [/^(gsc|general science)\b/, "GSC"],
    [/^(his|history|hist|hag)\b/, "HAG"],
    [/^(geo|geography)\b/, "GEO"],
    [/^(cre|christian)\b/, "CRE"],
    [/^(ire|islamic)\b/, "IRE"],
    [/^(hre|hindu)\b/, "HRE"],
    [/^(hsc|home ?science|home ?economics)\b/, "HSC"],
    [/^(ard|art|fine ?art)\b/, "ARD"],
    [/^(agr|agriculture)\b/, "AGR"],
    [/^(ww|wood ?work)\b/, "WW"],
    [/^(mw|metal ?work)\b/, "MW"],
    [/^(bc|building)\b/, "BC"],
    [/^(pm|power ?mechanics)\b/, "PM"],
    [/^(ect|electricity|electrical)\b/, "ECT"],
    [/^(drd|drawing)\b/, "DRD"],
    [/^(avt|aviation)\b/, "AVT"],
    [/^(cmp|computer|ict)\b/, "CMP"],
    [/^(fre|french)\b/, "FRE"],
    [/^(ger|german)\b/, "GER"],
    [/^(arb|arabic)\b/, "ARB"],
    [/^(ksl|sign ?language)\b/, "KSL"],
    [/^(muc|music)\b/, "MUC"],
    [/^(bst|business)\b/, "BST"]
  ];
  for (let i = 0; i < table.length; i++) if (table[i][0].test(s)) return table[i][1];
  return null;
}

/* Convert tracker rows ([{subject, score}]) into grades.
   Returns { grades:{CODE:'B+'}, matched:n, unmatched:[names] } */
function gradesFromResults(results) {
  const grades = {}, unmatched = [];
  let matched = 0;
  (results || []).forEach(r => {
    const code = matchSubjectCode(r.subject);
    if (!code) { unmatched.push(r.subject); return; }
    const g = gradeFromScore(r.score);
    if (!g) { unmatched.push(r.subject); return; }
    grades[code] = g;
    matched++;
  });
  return { grades: grades, matched: matched, unmatched: unmatched };
}

/* Expose for tests / other modules (browser: window; node: global) */
if (typeof window !== "undefined") {
  window.PF_GRADE_POINTS = PF_GRADE_POINTS;
  window.PF_GRADE_ORDER = PF_GRADE_ORDER;
  window.PF_KNEC_GRADES = PF_KNEC_GRADES;
  window.PF_SUBJECTS = PF_SUBJECTS;
  window.PF_CLUSTERS = PF_CLUSTERS;
  window.PF_CUTOFFS = PF_CUTOFFS;
  window.PF_GROUP_NAMES = PF_GROUP_NAMES;
  window.PF_SUBJECT_BY_CODE = PF_SUBJECT_BY_CODE;
}
