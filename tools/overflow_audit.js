/* Round 9 — why does a phone have to zoom out?
   The viewport meta tag was already correct on every page, so the cause has to
   be an element that is wider than the screen. This finds them: it loads each
   page at 360x640, then lists every element whose right edge crosses the
   viewport edge, walking up to name the container that actually causes it. */
const { chromium } = require('playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8000';

const PAGES = [
  'index.html', 'signin.html', 'signup.html',
  'student/dashboard.html', 'student/onboarding.html', 'student/quiz.html',
  'student/institutions.html', 'student/funding.html', 'student/tracker.html',
  'student/cluster.html', 'student/profile.html',
  'tutor/dashboard.html', 'tutor/profile.html', 'tutor/schedule.html',
  'tutor/students.html',
  'admin/dashboard.html', 'admin/dpa.html', 'admin/deployment.html',
  'legal/privacy.html', 'legal/terms.html'
];
const VIEWPORTS = [
  { name: '360x640 portrait', width: 360, height: 640 },
  { name: '320x568 small',    width: 320, height: 568 },
  { name: '390x844 modern',   width: 390, height: 844 },
  { name: '740x360 landscape',width: 740, height: 360 }
];
const ROOT = path.join(__dirname, '..');

async function auditPage(page, rel, vp) {
  // Route guards bounce some pages; seed a student so the guarded ones render.
  // Guarded pages bounce to signin.html unless a session exists, which would
  // silently make every page measure the login screen instead of itself.
  await page.addInitScript(() => {
    try {
      const results = [
        { subject: 'Mathematics', score: 78, target: 88 },
        { subject: 'English', score: 71, target: 80 },
        { subject: 'Physics', score: 74, target: 85 },
        { subject: 'Biology', score: 66, target: 78 },
        { subject: 'Chemistry', score: 69, target: 80 },
        { subject: 'Kiswahili', score: 75, target: 82 },
        { subject: 'Geography', score: 70, target: 79 }
      ];
      const quiz = { answers: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
      // requireRole() matches the role string exactly; admin pages use
      // "superadmin", not "admin", so guessing here silently bounces them.
      const sessions = {
        'student/': { email: 'demo.student@pathfinder.test', role: 'student',    name: 'Demo Student', demo: true },
        'tutor/':   { email: 'demo.tutor@pathfinder.test',   role: 'tutor',      name: 'Demo Tutor',   demo: true },
        'admin/':   { email: 'demo.admin@pathfinder.test',   role: 'superadmin', name: 'Demo Admin',   demo: true }
      };
      const prefix = Object.keys(sessions).find(k => location.pathname.indexOf('/' + k) === 0);
      if (prefix) localStorage.setItem('pf_session', JSON.stringify(sessions[prefix]));
      // dataKey() derives the storage key from the session email, so the data
      // must be written under that same key or the guard still bounces.
      const email = prefix ? sessions[prefix].email : 'guest';
      localStorage.setItem('pf_data_' + email, JSON.stringify({ results, quiz, onboarded: true, mock: true }));
    } catch (e) {}
  });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 140)));
  await page.goto(BASE + '/' + rel, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(450);
  const landed = await page.evaluate(() => location.pathname.replace(/^\//, ''));
  if (landed !== rel) errors.push('REDIRECTED to ' + landed);

  const res = await page.evaluate(({ vp }) => {
    const vw = document.documentElement.clientWidth;
    const out = { docScrollW: document.documentElement.scrollWidth, vw, offenders: [], errors: [] };
    const describe = el => {
      const cls = (el.className && typeof el.className === 'string')
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
      const id = el.id ? '#' + el.id : '';
      return el.tagName.toLowerCase() + id + cls;
    };
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      // Ignore things that are meant to sit off-screen (drawers, modals, SR text).
      if (el.closest('.sidebar') || el.closest('.modal-bg') || el.classList.contains('sr-only')) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      // 1px of slack absorbs sub-pixel rounding.
      const over = Math.round(r.right - vw);
      if (over > 1) {
        const parent = el.parentElement;
        out.offenders.push({
          el: describe(el),
          over,
          w: Math.round(r.width),
          left: Math.round(r.left),
          parent: parent ? describe(parent) : null,
          text: (el.textContent || '').trim().slice(0, 40)
        });
      }
    });
    // Keep the widest few per page — the deepest cause, not all its children.
    out.offenders.sort((a, b) => b.over - a.over);
    const seen = new Set();
    out.offenders = out.offenders.filter(o => {
      if (seen.has(o.parent + '|' + Math.round(o.over / 8))) return false;
      seen.add(o.parent + '|' + Math.round(o.over / 8));
      return true;
    }).slice(0, 6);
    return out;
  }, { vp });
  res.errors = errors;
  return res;
}

(async () => {
  const browser = await chromium.launch();
  let total = 0;
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true
    });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 120)));
    console.log('\n=== ' + vp.name + ' (vw=' + vp.width + ') ===');
    for (const rel of PAGES) {
      const r = await auditPage(page, rel, vp);
      const overflow = r.docScrollW - r.vw;
      if (r.errors && r.errors.length && !(overflow > 1 || r.offenders.length)) {
        console.log('  ' + rel.padEnd(28) + ' ok, but: ' + r.errors.join(' | '));
      }
      if (overflow > 1 || r.offenders.length) {
        total++;
        console.log('  ' + rel.padEnd(28) + ' scrollW=' + r.docScrollW + ' (+' + overflow + ')');
        (r.errors || []).forEach(e => console.log('       ! ' + e));
        r.offenders.forEach(o => console.log('       +' + String(o.over).padStart(4) + 'px  ' +
          o.el + '  w=' + o.w + ' L=' + o.left + '  in ' + o.parent +
          (o.text ? '  "' + o.text + '"' : '')));
      }
    }
    if (pageErrors.length) console.log('  JS errors: ' + [...new Set(pageErrors)].join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log('\n' + (total ? total + ' page/viewport combinations overflow.' : 'No overflow on any page at any size.'));
})();
