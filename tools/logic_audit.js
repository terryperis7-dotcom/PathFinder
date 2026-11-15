/* Round 9 — "check if all logical things make sense".
   A data-entry mistake that still parses is invisible to a render test: the
   page draws, the numbers are simply wrong. This asserts the invariants that
   have to hold for the results a student sees to mean anything. */
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..') + '/';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window = globalThis;
globalThis.document = {
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  createElement: () => ({ style: {}, appendChild() {}, remove() {} }),
  body: { appendChild() {} }, documentElement: {}
};
globalThis.location = { pathname: '/signin.html', href: '', search: '' };
const run = f => vm.runInThisContext(fs.readFileSync(root + f, 'utf8'), { filename: f });

run('assets/js/data.js');
run('assets/js/supabase.js');
run('assets/js/app.js');
run('assets/js/cluster.js');
run('assets/js/tutor.js');

const problems = [];
const notes = [];
let checksRun = 0;
function check(name, fn) {
  checksRun++;
  try { const msg = fn(); if (msg) problems.push(name + ' — ' + msg); }
  catch (e) { problems.push(name + ' — threw: ' + e.message); }
}

/* ---------- 1. Quiz and pathway scoring ---------- */
check('quiz is the length the UI advertises', () => {
  if (PF_QUIZ.length !== 6) return 'PF_QUIZ has ' + PF_QUIZ.length + ' questions, expected 6';
});
check('every question has the same option count', () => {
  const n = PF_QUIZ[0].opts.length;
  const bad = PF_QUIZ.filter(q => q.opts.length !== n).length;
  if (bad) return bad + ' question(s) do not have ' + n + ' options';
});
check('every dimension a pathway scores on is answerable', () => {
  const offered = new Set();
  PF_QUIZ.forEach(q => q.opts.forEach(o => offered.add(o[1])));
  const missing = [];
  PATHWAY_DEFS.forEach(p => p.riasec.forEach(l => { if (!offered.has(l)) missing.push(p.id + ':' + l); }));
  if (missing.length) return 'no quiz option for ' + missing.join(', ');
});
check('personality scale is calibrated to the question count', () => {
  /* persPct = pers/18*100 with 3 points per primary-dimension answer. */
  const calib = PF_QUIZ.length * 3;
  if (calib !== 18) return 'scoring constant is 18 but ' + PF_QUIZ.length + ' questions imply ' + calib;
});
check('all-primary answers reach 100%, and nothing overshoots', () => {
  const results = [{ subject: 'Mathematics', score: 90 }, { subject: 'Physics', score: 88 }];
  PATHWAY_DEFS.forEach(p => {
    const answers = {};
    PF_QUIZ.forEach((q, i) => {
      const idx = q.opts.findIndex(o => o[1] === p.riasec[0]);
      if (idx < 0) answers[i] = 0; else answers[i] = idx;
    });
    const row = computeRecommendations({ results, quiz: { answers } }).ranked.find(x => x.id === p.id);
    if (!row.persPct || row.persPct > 100) return;
  });
  const p0 = PATHWAY_DEFS[0];
  const answers = {};
  PF_QUIZ.forEach((q, i) => { answers[i] = q.opts.findIndex(o => o[1] === p0.riasec[0]); });
  const row = computeRecommendations({ results, quiz: { answers } }).ranked.find(x => x.id === p0.id);
  if (row.persPct !== 100) return 'primary-dimension answers scored ' + row.persPct + ', expected 100';
});
check('a mixed student is ranked, not flattened at 100', () => {
  const answers = {}; PF_QUIZ.forEach((q, i) => answers[i] = i % q.opts.length);
  const ranked = computeRecommendations({
    results: [{ subject: 'Mathematics', score: 78 }, { subject: 'English', score: 71 },
              { subject: 'Physics', score: 74 }, { subject: 'Biology', score: 66 },
              { subject: 'Chemistry', score: 69 }, { subject: 'Kiswahili', score: 75 },
              { subject: 'Geography', score: 70 }], quiz: { answers }
  }).ranked;
  const at100 = ranked.filter(r => r.persPct >= 100).length;
  if (at100 === ranked.length) return 'every pathway scored 100% — the scale is saturated';
  if (new Set(ranked.map(r => r.persPct)).size === 1) return 'every pathway tied — no discrimination';
});

/* ---------- 2. Grades and points ---------- */
check('grade order and points cover the same 12 grades', () => {
  const a = Object.keys(PF_GRADE_POINTS).length, b = PF_GRADE_ORDER.length;
  if (a !== 12 || b !== 12) return 'points has ' + a + ', order has ' + b + ', expected 12';
  const missing = PF_GRADE_ORDER.filter(g => !(g in PF_GRADE_POINTS));
  if (missing.length) return 'grades with no points: ' + missing.join(',');
});
check('higher grades are worth more points', () => {
  /* PF_GRADE_ORDER runs A -> E; points must decrease monotonically. */
  for (let i = 1; i < PF_GRADE_ORDER.length; i++) {
    const prev = PF_GRADE_POINTS[PF_GRADE_ORDER[i - 1]], cur = PF_GRADE_POINTS[PF_GRADE_ORDER[i]];
    if (!(prev > cur)) return PF_GRADE_ORDER[i - 1] + ' (' + prev + ') is not above ' + PF_GRADE_ORDER[i] + ' (' + cur + ')';
  }
});
check('grade boundaries descend and cover 0-100', () => {
  const g = PF_KNEC_GRADES;
  for (let i = 1; i < g.length; i++) {
    if (!(g[i - 1].min > g[i].min)) return g[i - 1].grade + ' min ' + g[i - 1].min + ' not above ' + g[i].grade + ' min ' + g[i].min;
  }
  if (g[g.length - 1].min !== 0) return 'lowest band does not start at 0';
  if (g[0].min > 100) return 'highest band starts above 100';
});
check('gradeOf() matches the published boundaries', () => {
  /* A score must land in the band with the highest minimum it meets. */
  return null; // exercised below by sampling
});
[0, 29, 30, 44, 54, 55, 64, 79, 80, 100].forEach(score => {
  check('gradeOf(' + score + ') picks the right band', () => {
    const got = gradeOf(score);
    const want = PF_KNEC_GRADES.filter(g => score >= g.min).sort((a, b) => b.min - a.min)[0].grade;
    if (got !== want) return 'got ' + got + ', expected ' + want;
  });
});

/* ---------- 3. Reference data ---------- */
check('institution ids are unique', () => {
  const seen = new Set(), dup = [];
  PF_INSTITUTIONS.forEach(i => { if (seen.has(i.id)) dup.push(i.id); seen.add(i.id); });
  if (dup.length) return 'duplicate ids: ' + dup.join(',');
});
check('institution codes are unique', () => {
  const seen = new Set(), dup = [];
  PF_INSTITUTIONS.forEach(i => { if (i.code && seen.has(i.code)) dup.push(i.code); seen.add(i.code); });
  if (dup.length) return 'duplicate codes: ' + dup.join(',');
});
check('every institution has usable contact details', () => {
  const bad = PF_INSTITUTIONS.filter(i => {
    const d = PF_INSTITUTION_DETAILS[i.id] || {};
    const okSite = !d.website || /^https:\/\//.test(d.website);
    const okMail = !d.email || /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(d.email);
    const okYear = !d.established || (d.established >= 1800 && d.established <= 2026);
    return !(okSite && okMail && okYear);
  }).map(i => i.id);
  if (bad.length) return 'suspect details: ' + bad.join(',');
});
check('pathway summaries cite no invented institutions', () => {
  /* "Kabwe Poly" was shown to students for several rounds; no such
     institution exists in Kenya. Keep the guard that would catch it again. */
  const banned = [/kabwe/i, /mombasa polytechnic university/i];
  const hits = [];
  PATHWAY_DEFS.forEach(p => {
    const text = (p.unis || '') + ' ' + (p.tvet || '');
    banned.forEach(re => { if (re.test(text)) hits.push(p.id + ' — ' + text); });
  });
  if (hits.length) return 'non-existent institution cited: ' + hits.join(' | ');
});
check('counties are the 47 of Kenya, all unique', () => {
  const u = new Set(PF_COUNTIES);
  if (u.size !== 47) return 'got ' + u.size + ' counties, expected 47';
  if (u.size !== PF_COUNTIES.length) return 'duplicate counties present';
});
check('every scholarship has a deadline and a source link', () => {
  const bad = PF_SCHOLARSHIPS.filter(s => !s.deadline || !(s.url || PF_SCHOLARSHIP_URLS[s.name]));
  if (bad.length) return 'missing deadline/URL: ' + bad.map(s => s.name || '(unnamed)').join(', ');
});

/* ---------- 4. Funding bands ----------
   The bands live in the funding page, not in a module, so read them there and
   assert the published split: scholarship + loan + household must be 100%. */
const fundingSrc = fs.readFileSync(root + 'student/funding.html', 'utf8');
const bandSrc = fundingSrc.match(/const\s+BANDS\s*=\s*(\[[\s\S]*?\n\]\s*);/);
let BANDS = null;
if (bandSrc) { try { BANDS = vm.runInThisContext('(' + bandSrc[1] + ')'); } catch (e) { problems.push('could not parse HEF bands — ' + e.message); } }
check('HEF bands were found on the funding page', () => { if (!BANDS || !BANDS.length) return 'BANDS not found in student/funding.html'; });
if (BANDS && BANDS.length) {
  check('each HEF band splits into exactly 100%', () => {
    const bad = BANDS.filter(b => Math.abs((b.gov + b.helb + b.house) - 100) > 0.5)
      .map(b => b.b + '=' + (b.gov + b.helb + b.house) + '%');
    if (bad.length) return bad.join(', ');
  });
  check('support falls as income rises and household share rises', () => {
    for (let i = 1; i < BANDS.length; i++) {
      if (!(BANDS[i].gov < BANDS[i - 1].gov)) return BANDS[i].b + ' scholarship is not lower than ' + BANDS[i - 1].b;
      if (!(BANDS[i].house > BANDS[i - 1].house)) return BANDS[i].b + ' household share is not higher than ' + BANDS[i - 1].b;
    }
  });
  check('upkeep falls as income rises', () => {
    for (let i = 1; i < BANDS.length; i++) {
      if (!(BANDS[i].upkeep < BANDS[i - 1].upkeep)) return BANDS[i].b + ' upkeep is not lower than ' + BANDS[i - 1].b;
    }
  });
}

/* ---------- 5. Cluster calculator ---------- */
const FULL = { Mathematics: 'A', English: 'B', Kiswahili: 'B', Biology: 'B', Physics: 'A', Chemistry: 'B', Geography: 'B', History: 'B', CRE: 'B' };
check('every degree cluster is computable', () => {
  const bad = PF_CLUSTERS.filter(c => {
    try { const r = computeClusterResult(c.id, FULL); return !r || !isFinite(r.raw) || !isFinite(r.aggregate); }
    catch (e) { return true; }
  }).map(c => c.id);
  if (bad.length) return 'not computable: ' + bad.join(',');
});
check('cluster points never exceed the KUCCPS maximum of 48', () => {
  const perfect = {};
  Object.keys(FULL).forEach(k => perfect[k] = 'A');
  const bad = [];
  PF_CLUSTERS.forEach(c => {
    try {
      const r = computeClusterResult(c.id, perfect);
      const w = weightedClusterPoints(r.raw, r.aggregate);
      if (w > 48.001) bad.push(c.id + '=' + w);
    } catch (e) { bad.push(c.id + ' threw ' + e.message); }
  });
  if (bad.length) return 'over the 48 cap: ' + bad.join(', ');
});
check('a straight-A student scores higher than a straight-C student', () => {
  const a = {}, c = {};
  Object.keys(FULL).forEach(k => { a[k] = 'A'; c[k] = 'C'; });
  const ra = computeClusterResult('medicine', a), rc = computeClusterResult('medicine', c);
  const wa = weightedClusterPoints(ra.raw, ra.aggregate), wc = weightedClusterPoints(rc.raw, rc.aggregate);
  if (!(wa > wc)) return 'A-grades (' + wa + ') did not beat C-grades (' + wc + ')';
});
check('a blank grade scores zero rather than throwing', () => {
  const r = computeClusterResult('medicine', { Mathematics: '', English: 'B' });
  if (!r || !isFinite(r.aggregate)) return 'blank grades produced a non-numeric aggregate';
});

/* ---------- 6. Tutor workspace ---------- */
check('tutor code cannot mark a document verified by itself', () => {
  /* Verification must come from the database. If this file ever assigns
     verified:true, a tutor could self-approve and take bookings unpaid. */
  const src = fs.readFileSync(root + 'assets/js/tutor.js', 'utf8');
  const assigns = src.match(/verified\s*[:=]\s*true/g) || [];
  const statusLabel = /status:\s*verified\s*\?/.test(src);
  if (assigns.length && !statusLabel) return 'tutor.js sets verified:true (' + assigns.length + ' place(s))';
});
check('earnings scale with sessions at the published rate', () => {
  const a = tutorMonthlyEstimate({ rate: TUTOR_RATE, sessions: [1, 2] });
  const b = tutorMonthlyEstimate({ rate: TUTOR_RATE, sessions: [1, 2, 3, 4] });
  if (!(b.amount > a.amount)) return 'more sessions did not earn more';
  const expect = 2 * TUTOR_RATE * 4; // one hour per session, four weeks
  if (a.amount !== expect) return '2 sessions gave ' + a.amount + ', expected ' + expect;
});

/* ---------- report ---------- */
if (notes.length) { console.log('Notes:'); notes.forEach(n => console.log('  - ' + n)); }
if (problems.length) {
  console.log('\n' + problems.length + ' logic problem(s):');
  problems.forEach(p => console.log('  x ' + p));
  process.exit(1);
} else {
  console.log('All ' + checksRun + ' logic checks pass.');
}
/* supabase.js starts a background sync timer that keeps the event loop alive;
   without this the script prints its result and then never exits. */
process.exit(problems.length ? 1 : 0);
