/* ============================================================
   Stages — one place that knows how Kenyan education is structured.

   Two systems are live at once in 2026:
     • 8-4-4        Form 1–4 → KCSE. The final KCSE sitting is November 2027.
     • CBC / CBE    2-6-3-3-3. Junior School (Grades 7–9) ends with KJSEA;
                    Senior School (Grades 10–12) runs four core learning areas
                    plus three pathway electives, assessed from Grade 12.

   Everything here is presentation + arithmetic on data the learner typed.
   Nothing invents a grade, a point or a deadline: when a stage has no cluster
   points (CBC does not use them) the UI says so instead of showing zeros.

   Sources for the structure: KICD senior-school designs, KNEC's 8-point KJSEA
   reporting bands, and the Ministry's 2026 senior-school circular.
   ============================================================ */

/* ---------- the stages ---------- */
const PF_STAGES = [
  {
    id: "primary",
    label: "CBC Grade 4–6",
    short: "Upper primary",
    system: "cbc",
    exam: "KPSEA",
    examNote: "Kenya Primary Education Assessment, sat in Grade 6 (October). Results in January.",
    next: "Junior School (Grades 7–9) through the Ministry's placement system.",
    subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Science & Technology",
      "Social Studies",
      "Agriculture",
      "Creative Arts",
      "Religious Education"
    ]
  },
  {
    id: "junior",
    label: "CBC Grade 7–9",
    short: "Junior School",
    system: "cbc",
    exam: "KJSEA",
    examNote:
      "Kenya Junior School Education Assessment, sat in Grade 9 (late October). Results in December, then Grade 10 placement in January.",
    next: "Senior School. Placement blends KPSEA (20%), Grade 7–8 school-based assessment (20%) and KJSEA (60%).",
    subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Integrated Science",
      "Social Studies",
      "Agriculture",
      "Pre-Technical Studies",
      "Business Studies",
      "Creative Arts & Sports",
      "Religious Education"
    ]
  },
  {
    id: "senior",
    label: "CBC Grade 10–12",
    short: "Senior School",
    system: "cbc",
    exam: "Grade 12 assessment",
    examNote:
      "Seven learning areas: four core plus three pathway electives, assessed through school-based work and the Grade 12 national assessment.",
    next: "University, TVET or work through the placement service that replaces KUCCPS cluster points for this cohort.",
    subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Community Service Learning",
      "Biology",
      "Chemistry",
      "Physics",
      "Computer Studies",
      "Agriculture",
      "History & Citizenship",
      "Geography",
      "Business Studies",
      "Religious Education",
      "Literature in English",
      "Fine Art",
      "Music & Dance",
      "Theatre & Film",
      "Sports & Recreation"
    ]
  },
  {
    id: "form12",
    label: "KCSE Form 1–2",
    short: "Form 1–2",
    system: "kcse",
    exam: "KCSE",
    examNote: "8-4-4. The final KCSE is sat in November 2027; after that the exam is retired.",
    next: "Form 3–4, then KCSE and KUCCPS placement.",
    subjects: null /* KCSE uses the shared SUBJECTS list */
  },
  {
    id: "form34",
    label: "KCSE Form 3–4",
    short: "Form 3–4",
    system: "kcse",
    exam: "KCSE",
    examNote: "8-4-4. The last KCSE sitting is scheduled for 8 November 2027.",
    next: "KUCCPS placement (universities, TVET, KMTC) or a 2027 resit if you need it.",
    subjects: null
  },
  {
    id: "post",
    label: "Post-KCSE / repeating",
    short: "Post-KCSE",
    system: "kcse",
    exam: "KCSE (done or resitting)",
    examNote: "Results out or resitting. The 2027 KCSE is the final 8-4-4 opportunity for a resit.",
    next: "KUCCPS / TVET applications, HELB and HEF funding.",
    subjects: null
  }
];

/* Labels that older saves and sign-up forms may hold. */
const STAGE_ALIASES = {
  "CBC Grade 7–9": "junior",
  "CBC Grade 7-9": "junior",
  "CBC Grade 10–12": "senior",
  "CBC Grade 10-12": "senior",
  "KCSE Form 1–2": "form12",
  "KCSE Form 3–4": "form34",
  "KCSE Form 3-4": "form34",
  "Form Four leaver": "post",
  "TVET scholar": "post",
  "Post-KCSE": "post",
  /* what people actually type */
  "Form 1": "form12",
  "Form 2": "form12",
  "Form 3": "form34",
  "Form 4": "form34",
  "Form Four": "form34",
  "Form Four candidate": "form34",
  "KCSE candidate": "form34",
  "8-4-4": "form34",
  "Grade 6": "primary",
  "Grade 4": "primary",
  "Grade 5": "primary",
  "Primary school": "primary",
  "Upper primary": "primary",
  "Grade 7": "junior",
  "Grade 8": "junior",
  "Grade 9": "junior",
  "Junior school": "junior",
  "Junior School": "junior",
  "Grade 10": "senior",
  "Grade 11": "senior",
  "Grade 12": "senior",
  "Senior school": "senior",
  "Senior School": "senior",
  CBC: "junior",
  leaver: "post",
  graduate: "post",
  primary: "primary",
  junior: "junior",
  senior: "senior",
  form12: "form12",
  form34: "form34",
  post: "post"
};

/* ---------- CBC grading ----------
   Four achievement levels, reported by KNEC in eight bands (EE1 … BE2) worth
   8 → 1 points. The app stores the level a learner knows; the bands explain it. */
const CBC_LEVELS = [
  { code: "EE", label: "Exceeding expectation", pts: 4, pct: 85, hint: "Confident and can apply it in new situations" },
  { code: "ME", label: "Meeting expectation", pts: 3, pct: 60, hint: "Solid — the expected level for the grade" },
  { code: "AE", label: "Approaching expectation", pts: 2, pct: 32, hint: "Getting there with support" },
  { code: "BE", label: "Below expectation", pts: 1, pct: 10, hint: "Needs targeted help — ask your teacher" }
];
const KJSEA_BANDS = [
  { code: "EE1", pts: 8, min: 90, max: 100 },
  { code: "EE2", pts: 7, min: 75, max: 89 },
  { code: "ME1", pts: 6, min: 58, max: 74 },
  { code: "ME2", pts: 5, min: 41, max: 57 },
  { code: "AE1", pts: 4, min: 31, max: 40 },
  { code: "AE2", pts: 3, min: 21, max: 30 },
  { code: "BE1", pts: 2, min: 11, max: 20 },
  { code: "BE2", pts: 1, min: 0, max: 10 }
];

/* ---------- senior school pathways (CBE) ----------
   Three pathways, not four: Languages sits inside Social Sciences. Every learner
   keeps the four core learning areas and adds three from the pathway. */
const CBE_PATHWAYS = [
  {
    id: "stem",
    label: "STEM",
    full: "Science, Technology, Engineering & Mathematics",
    blurb: "Medicine, engineering, data and the technical trades.",
    groups: ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Studies", "Agriculture", "Integrated Science"],
    electives: [
      "Physics",
      "Chemistry",
      "Biology",
      "Computer Studies",
      "Agriculture",
      "General Science",
      "Drawing & Design",
      "Aviation Technology",
      "Building & Construction",
      "Electrical Technology",
      "Power Mechanics",
      "Wood Technology",
      "Media Technology"
    ],
    careers: "Medicine, engineering, software, data science, architecture, agribusiness",
    pfPaths: ["health", "eng", "agri"]
  },
  {
    id: "social",
    label: "Social Sciences",
    full: "Social Sciences — humanities, business and languages",
    blurb: "Law, business, languages and public service.",
    groups: [
      "Social Studies",
      "History",
      "Geography",
      "Business Studies",
      "Religious Education",
      "English",
      "Kiswahili",
      "Literature in English"
    ],
    electives: [
      "History & Citizenship",
      "Geography",
      "Business Studies",
      "Religious Education",
      "Literature in English",
      "French",
      "German",
      "Arabic",
      "Mandarin",
      "Kenyan Sign Language"
    ],
    careers: "Law, business, journalism, accounting, public administration, languages",
    pfPaths: ["biz", "edu", "creative"]
  },
  {
    id: "arts",
    label: "Arts & Sports",
    full: "Arts and Sports Science",
    blurb: "Film, music, design and sport science.",
    groups: [
      "Creative Arts & Sports",
      "Fine Art",
      "Music & Dance",
      "Theatre & Film",
      "Sports & Recreation",
      "Physical Education"
    ],
    electives: [
      "Fine Art",
      "Music & Dance",
      "Theatre & Film",
      "Sports & Recreation",
      "Physical Education",
      "Photography",
      "Crafts"
    ],
    careers: "Film, music, design, sport science, coaching, creative direction",
    pfPaths: ["creative", "edu"]
  }
];

const CBE_CORE = ["English", "Kiswahili", "Mathematics", "Community Service Learning"];

/* ---------- stage resolution ---------- */
function stageId() {
  const raw = (S && S.profile && S.profile.stage) || "form34";
  return STAGE_ALIASES[raw] || "form34";
}
function stage() {
  const id = stageId();
  return PF_STAGES.find((s) => s.id === id) || PF_STAGES[4];
}
function stageById(id) {
  return PF_STAGES.find((s) => s.id === id) || PF_STAGES[4];
}
const isCBC = () => stage().system === "cbc";
const isKCSE = () => stage().system === "kcse";
/* Kept for older call sites that only care whether cluster points apply. */
const hasClusterPoints = () => isKCSE();

/* The subject list the learner should be entering grades for. */
function stageSubjects() {
  const s = stage();
  if (!s.subjects) return SUBJECTS;
  if (s.id === "senior") {
    const chosen =
      S && S.profile && Array.isArray(S.profile.electives) && S.profile.electives.length ? S.profile.electives : [];
    const extras = chosen.length ? chosen : CBE_PATHWAY_ELECTIVES_DEFAULT();
    return CBE_CORE.concat(extras.filter((e) => !CBE_CORE.includes(e)));
  }
  return s.subjects;
}
function CBE_PATHWAY_ELECTIVES_DEFAULT() {
  const p = cbePathway();
  return p ? p.electives.slice(0, 3) : ["Biology", "Chemistry", "Physics"];
}
function cbePathway() {
  const id = (S && S.profile && S.profile.pathway) || "";
  return CBE_PATHWAYS.find((p) => p.id === id) || null;
}

/* ---------- grading helpers ---------- */
function gradeOptions() {
  return isCBC() ? CBC_LEVELS.map((l) => l.code) : GRADES.map((g) => g[0]);
}
function gradeLabel(code) {
  if (isCBC()) {
    const l = CBC_LEVELS.find((x) => x.code === code);
    return l ? l.code + " · " + l.label : "—";
  }
  return code || "—";
}
/* One number per grade for charts and comparisons. KCSE keeps the official
   12→1 point scale; CBC uses the indicative midpoint of its band and never
   pretends to be a KCSE point. */
function gradeValue(code) {
  if (isCBC()) {
    const l = CBC_LEVELS.find((x) => x.code === code);
    return l ? l.pts : 0;
  }
  return gradePts(code);
}
function gradePctFor(code) {
  if (isCBC()) {
    const l = CBC_LEVELS.find((x) => x.code === code);
    return l ? l.pct : 0;
  }
  return Math.round((gradePts(code) / 12) * 100);
}
function gradeMaxValue() {
  return isCBC() ? 4 : 12;
}
function cbcLevelFor(score) {
  const band = KJSEA_BANDS.find((b) => score >= b.min && score <= b.max);
  return band ? band.code : "—";
}
const cbcLevelOfBand = (code) => (code ? code.slice(0, 2) : "—");
const bandPoints = (code) => {
  const b = KJSEA_BANDS.find((x) => x.code === code);
  return b ? b.pts : 0;
};

/* A short, honest explanation of the scale in use. */
function gradeScaleNote() {
  if (isCBC()) {
    return "CBC uses four achievement levels — EE, ME, AE, BE — reported by KNEC in eight bands worth 8 to 1 points at KJSEA. This app stores the level you know and never turns it into a KCSE point.";
  }
  return "KCSE grades A–E are worth 12 to 1 points. Cluster points combine your best seven subjects with the four cluster subjects:  w = √((r/48) × (t/84)) × 48.";
}

/* ---------- pathway fit for CBC ----------
   For Junior School the question is "which senior pathway?", for Senior School
   it is "which pathway am I already in and does my subject mix hold up?". Fit is
   the average level in that pathway's subjects, so a missing subject simply
   drops out of the average instead of counting as a fail. */
function cbePathwayFit() {
  const subjects = stageSubjects();
  const rows = CBE_PATHWAYS.map((p) => {
    const graded = p.groups.filter((s) => S.grades[s] && subjects.includes(s));
    const pts = graded.reduce((a, s) => a + gradeValue(S.grades[s]), 0);
    const max = graded.length * gradeMaxValue();
    const pct = max ? Math.round((pts / max) * 100) : 0;
    return { ...p, graded, pct, has: graded.length > 0 };
  });
  return rows.sort((a, b) => b.pct - a.pct);
}

/* ---------- readiness checklist ---------- */
function stageReadiness() {
  const s = stage();
  const subs = stageSubjects();
  const filled = subs.filter((x) => S.grades[x]).length;
  const checks = [
    { done: filled > 0, label: "Grades entered", detail: filled + " of " + subs.length + " learning areas" },
    {
      done: filled >= Math.min(6, subs.length),
      label: "Enough to compare",
      detail: "At least six is a useful picture"
    },
    {
      done: !!S.result,
      label: "Career check done",
      detail: S.result ? "Pathways ranked" : "Six questions, about two minutes"
    }
  ];
  if (s.id === "senior")
    checks.push({
      done: !!cbePathway(),
      label: "Pathway chosen",
      detail: cbePathway() ? cbePathway().label : "Pick STEM, Social Sciences or Arts & Sports"
    });
  if (s.id === "junior")
    checks.push({ done: !!S.result, label: "Senior pathway explored", detail: "Use the fit chart to shortlist one" });
  if (isKCSE())
    checks.push({ done: filled >= 7, label: "Cluster points possible", detail: "Best seven subjects needed" });
  return { checks, filled, total: subs.length, stage: s };
}

/* ---------- exam + next-step copy per stage ---------- */
function stageTimeline() {
  const s = stage();
  if (s.id === "primary")
    return [
      { when: "October", what: "KPSEA", note: "Grade 6 national assessment" },
      { when: "January", what: "Junior School", note: "Placement through the Ministry portal" }
    ];
  if (s.id === "junior")
    return [
      { when: "November", what: "KJSEA", note: "Grade 9 assessment" },
      { when: "December", what: "Results", note: "Blended: 20% KPSEA · 20% Grade 7–8 · 60% KJSEA" },
      { when: "January", what: "Grade 10", note: "Senior school placement — 8 school choices (3 C1, 2 C2, 2 C3, 1 C4)" }
    ];
  if (s.id === "senior")
    return [
      { when: "Term by term", what: "School-based assessment", note: "Counts toward your Grade 12 record" },
      { when: "Grade 12", what: "National assessment", note: "Four core + three pathway electives" },
      { when: "After", what: "Placement", note: "University, TVET or work" }
    ];
  if (s.id === "form12") return [{ when: "Form 3–4", what: "KCSE", note: "Final 8-4-4 cohort sits in November 2027" }];
  if (s.id === "form34")
    return [
      { when: "November 2027", what: "KCSE", note: "The last KCSE under 8-4-4" },
      { when: "After results", what: "KUCCPS", note: "Universities, TVET and KMTC placement" }
    ];
  return [
    { when: "Now", what: "KUCCPS / TVET", note: "Apply on the official portals only" },
    { when: "2027", what: "Final KCSE resit", note: "The last chance under 8-4-4" }
  ];
}

/* Chips for a header: stage, system, exam. */
function stageChips() {
  const s = stage();
  return [
    { icon: "i-cap", text: s.label },
    { icon: "i-file", text: s.system === "cbc" ? "CBC / CBE" : "8-4-4" },
    { icon: "i-cal", text: s.exam }
  ];
}

/* Map a career pathway (the app's six) to a CBE senior pathway. */
function cbePathwayForCareer(pfPathId) {
  const p = CBE_PATHWAYS.find((x) => x.pfPaths.includes(pfPathId));
  return p ? p.label : "Social Sciences";
}

/* ---------- scoring that works in both systems ----------
   KCSE keeps the KUCCPS cluster maths in cluster.js. CBC has no cluster
   points, so feasibility is the average achievement level of that pathway's
   own subjects, expressed as a percentage. The interest half is identical in
   both systems, which keeps the two scores comparable. */
const LETTER_TRAITS = {
  R: "hands-on",
  I: "analytical",
  A: "creative",
  S: "people-first",
  E: "enterprising",
  C: "organised"
};
function interestNorm(answers) {
  const pts = {};
  (answers || []).forEach((ai, qi) => {
    const q = PF_QUESTIONS[qi];
    const o = q && q.o[ai];
    if (!o || !o.l) return;
    pts[o.l] = (pts[o.l] || 0) + 1;
  });
  const norm = {};
  for (const l in pts) norm[l] = pts[l] / (LETTER_APP[l] || 1);
  return norm;
}
function topTraits(answers, n) {
  const norm = interestNorm(answers);
  return Object.keys(norm)
    .sort((a, b) => norm[b] - norm[a])
    .slice(0, n || 2)
    .map((l) => ({ letter: l, label: LETTER_TRAITS[l] || l, score: Math.min(1, norm[l]) }));
}
function scorePathsForStage(answers) {
  if (isKCSE()) return scorePaths(S.grades, answers || []);
  const norm = interestNorm(answers);
  return PF_PATHS.map((p) => {
    let fit = 0;
    for (const l in p.letters) fit += p.letters[l] * (norm[l] || 0);
    fit = Math.min(1, fit * 1.5);
    const subs = Array.from(new Set([].concat.apply([], p.slots)));
    const graded = subs.filter((s) => S.grades && S.grades[s]);
    const pct = graded.length
      ? Math.round(graded.reduce((a, s) => a + gradePctFor(S.grades[s]), 0) / graded.length)
      : 0;
    const feas = graded.length ? pct / 100 : 0.45;
    return {
      ...p,
      c: {
        chosen: graded.length ? graded : subs.slice(0, 4),
        cbc: true,
        pct,
        ok: graded.filter((s) => gradeValue(S.grades[s]) >= 3).length,
        lift: null
      },
      match: Math.max(10, Math.min(98, Math.round(12 + 48 * fit + 40 * feas)))
    };
  }).sort((a, b) => b.match - a.match);
}
/* Best single improvement to suggest on a CBC result card. */
function cbcLift() {
  const rows = stageSubjects().filter((s) => S.grades && S.grades[s]);
  const order = ["BE", "AE", "ME", "EE"];
  let best = null;
  for (const s of rows) {
    const lv = S.grades[s];
    const i = order.indexOf(lv);
    if (i < 0 || i === order.length - 1) continue;
    const up = order[i + 1];
    const gain = gradePctFor(up) - gradePctFor(lv);
    if (!best || gain > best.gain) best = { s, from: lv, to: up, gain };
  }
  return best;
}
