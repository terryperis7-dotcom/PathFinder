/* ============================================================
   PathFinder Kenya — Shared app logic
   © 2026 PathFinder Kenya. All rights reserved. See /LICENSE.

   Sections
     1. Helpers (DOM, escaping, toast, CSV)
     2. Sessions & access guards
     3. Accounts (Supabase Auth when configured, local demo mode otherwise)
     4. Student data store
     5. Recommendation engine
     6. UI helpers (badges, search, language toggle)

   Data policy: real accounts start EMPTY. Mock data exists only in the
   clearly-labelled demo accounts.

   SECURITY NOTE: this is a static front-end. Page guards (requireRole)
   are a UX convenience, NOT a security boundary. Real protection comes
   from Supabase Auth + Row Level Security (see supabase/schema.sql).
   Local mode (no Supabase keys) is for demos/testing only.
   ============================================================ */

/* ---------- 1. Helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* Escape user data before injecting it into HTML (prevents XSS). */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
window.esc = esc;

/* Neutralise spreadsheet formula injection + quote a CSV cell. */
function csvCell(v) {
  let s = String(v == null ? "" : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function downloadFile(filename, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain" }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* Toast: always plain text (never HTML). */
function toast(msg) {
  const wrap = $("#toasts") || document.body;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transition = ".3s";
    setTimeout(() => t.remove(), 300);
  }, 4200);
}

/* Safe localStorage wrappers (private mode / quota errors must not crash pages). */
function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch (e) { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { return false; }
}

/* ---------- 2. Sessions & access guards ---------- */
const DEMO_USERS = {
  student:    { name: "Amina Odhiambo (Demo)",       email: "student@pathfinder.ke", role: "student",    roleLabel: "KCSE Candidate · Demo", demo: true, onboarded: true },
  tutor:      { name: "Mwalimu Peter Mwangi (Demo)", email: "tutor@pathfinder.ke",   role: "tutor",      roleLabel: "TSC Tutor · Demo",      demo: true },
  superadmin: { name: "Admin (Demo)",                email: "admin@pathfinder.ke",   role: "superadmin", roleLabel: "SuperAdmin · Demo",     demo: true }
};
const IDLE_MS = 30 * 60 * 1000;

function getUsers() { const u = lsGet("pf_users", []); return Array.isArray(u) ? u : []; }
function saveUsers(u) { lsSet("pf_users", u); }
function getSession() { return lsGet("pf_session", null); }

/* Never keep password material in the session object. */
function publicUser(u) {
  const c = Object.assign({}, u);
  delete c.salt; delete c.hash; delete c.iter;
  return c;
}
function setSession(u) {
  lsSet("pf_session", publicUser(u));
  try { localStorage.setItem("pf_session_at", String(Date.now())); } catch (e) {}
  if (window.PF_DB && PF_DB.live && !u.demo) { PF_DB.syncProfile(u); PF_DB.audit("signin", { role: u.role }); }
}
function clearSession() {
  try { localStorage.removeItem("pf_session"); localStorage.removeItem("pf_session_at"); } catch (e) {}
}
async function signOutTo(path) {
  const s = getSession();
  clearSession();
  try { if (window.PF_DB && PF_DB.live && s && !s.demo) await PF_DB.signOut(); } catch (e) {}
  location.href = path;
}
function signOut() { return signOutTo("signin.html"); }
function signOutDeep() { return signOutTo("../signin.html"); }

/* Idle timeout: auto sign-out after 30 minutes. */
(function () {
  let timer = null;
  function reset() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (!getSession()) return;
      toast("⏰ Session timed out for security. Please sign in again.");
      const inSub = /\/(student|tutor|admin)\//.test(location.pathname);
      setTimeout(function () { signOutTo(inSub ? "../signin.html" : "signin.html"); }, 1200);
    }, IDLE_MS);
  }
  ["click", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, reset, { passive: true }));
  reset();
})();

/* Page guard. With Supabase, also verifies the auth session is still valid. */
function requireRole(role, loginPath) {
  const s = getSession();
  if (!s || s.role !== role) {
    location.href = loginPath + "?next=" + encodeURIComponent(location.pathname);
    return null;
  }
  if (window.PF_DB && PF_DB.live && !s.demo) {
    PF_DB.getSession().then(function (sb) {
      if (!sb) { clearSession(); location.href = loginPath + "?next=" + encodeURIComponent(location.pathname); }
    }).catch(function () { /* offline: keep working from cache */ });
  }
  return s;
}
/* Students must finish onboarding (results + quiz) before using the workspace. */
function requireOnboarded() {
  const s = getSession();
  if (!s) return null;
  if (s.role !== "student" || s.demo) return s;
  const d = getStudentData();
  if (!d || !d.onboarded) { location.href = "onboarding.html"; return null; }
  return s;
}
function homeFor(role) {
  return role === "student" ? "student/dashboard.html"
    : role === "tutor" ? "tutor/dashboard.html"
    : role === "superadmin" ? "admin/dashboard.html"
    : "index.html";
}
/* Only allow same-site relative redirects after sign-in (prevents open redirects). */
function safeNext(next, fallback) {
  if (!next) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(next) || next.startsWith("//") || next.includes("\\")) return fallback;
  return next.replace(/^\//, "");
}
function fillUserChip() {
  const s = getSession();
  if (!s) return;
  $$("[data-user-name]").forEach(el => el.textContent = s.name);
  $$("[data-user-role]").forEach(el => el.textContent = s.roleLabel || s.role);
  $$("[data-user-initials]").forEach(el => el.textContent =
    (s.name || "U").replace(/\(Demo\)/, "").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase());
}

/* ---------- 3. Accounts ----------
   Supabase configured  -> Supabase Auth (real, server-side)
   Not configured       -> local demo accounts. Passwords are salted + hashed
                           with PBKDF2 (never stored in plain text), but local
                           mode is still NOT secure storage for real student data. */
const PBKDF2_ITER = 150000;
const MIN_PASSWORD = 8;

function b64(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); }
function unb64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
async function hashPassword(pass, saltB64, iter) {
  if (!(window.crypto && crypto.subtle)) throw new Error("Secure sign-in needs HTTPS (or localhost).");
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter || PBKDF2_ITER }, key, 256);
  return { salt: b64(salt), hash: b64(bits), iter: iter || PBKDF2_ITER };
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function roleLabelFor(role, extra) {
  if (role === "student") return (extra && extra.stage) || "Student";
  if (role === "tutor") return "Tutor";
  return "SuperAdmin";
}
function findUser(email) {
  email = (email || "").trim().toLowerCase();
  const local = getUsers().find(x => (x.email || "").toLowerCase() === email);
  if (local) return local;
  return Object.values(DEMO_USERS).find(d => d.email === email) || null;
}

/* Basic brute-force slowdown for local sign-in (5 failures -> 30 s lock). */
function lockInfo(email) {
  const all = lsGet("pf_fail", {});
  const rec = all[email] || { n: 0, until: 0 };
  return { all, rec, locked: rec.until > Date.now(), wait: Math.ceil((rec.until - Date.now()) / 1000) };
}
function noteFailure(email) {
  const { all, rec } = lockInfo(email);
  rec.n = (rec.n || 0) + 1;
  if (rec.n >= 5) { rec.until = Date.now() + 30000; rec.n = 0; }
  all[email] = rec; lsSet("pf_fail", all);
}
function clearFailures(email) { const all = lsGet("pf_fail", {}); delete all[email]; lsSet("pf_fail", all); }

/* register -> { user } | { pending } | { error } */
async function registerAccount(info) {
  const email = (info.email || "").trim().toLowerCase();
  const role = info.role === "tutor" ? "tutor" : "student";   // SuperAdmin accounts are NEVER self-service
  if (!info.name || !email) return { error: "Please fill in your name and email." };
  if ((info.password || "").length < MIN_PASSWORD) return { error: "Password must be at least " + MIN_PASSWORD + " characters." };
  const extra = info.extra || {};

  if (window.PF_DB && PF_DB.live) {
    const { data, error } = await PF_DB.signUp(email, info.password, {
      full_name: info.name, phone: info.phone || null, role,
      county: extra.county || null, stage: extra.stage || null, school: extra.school || null, tsc_number: extra.tsc || null
    });
    if (error) return { error: error.message || "Could not create the account." };
    if (!data || !data.session) return { pending: "Account created. Check your email to confirm it, then sign in." };
    return { user: await PF_DB.loadUser(data.user, { name: info.name, phone: info.phone, role, extra }) };
  }

  if (findUser(email)) return { error: "An account with this email already exists. Please sign in." };
  let secret;
  try { secret = await hashPassword(info.password); } catch (e) { return { error: e.message }; }
  const user = { name: info.name, email, phone: info.phone || "", role, roleLabel: roleLabelFor(role, extra), extra, ...secret };
  const users = getUsers(); users.push(user); saveUsers(users);
  return { user: publicUser(user) };
}

/* login -> { user } | { error } */
async function loginAccount(emailRaw, password) {
  const email = (emailRaw || "").trim().toLowerCase();

  if (window.PF_DB && PF_DB.live) {
    const { data, error } = await PF_DB.signIn(email, password);
    if (error) return { error: "Incorrect email or password." };
    const user = await PF_DB.loadUser(data.user);
    if (user.suspended) { await PF_DB.signOut(); return { error: "⛔ This account is suspended. Please contact support." }; }
    await PF_DB.hydrateLocalCache(user);
    return { user };
  }

  const lk = lockInfo(email);
  if (lk.locked) return { error: "Too many attempts. Try again in " + lk.wait + " seconds." };
  const u = getUsers().find(x => (x.email || "").toLowerCase() === email);
  if (!u) { noteFailure(email); return { error: "Incorrect email or password." }; }   // same message: no account enumeration
  if (u.suspended) return { error: "⛔ This account is suspended. Please contact support." };
  try {
    if (!u.hash) {
      // Account created by an older version (any password was accepted). Set the password now.
      if (password.length < MIN_PASSWORD) return { error: "Please choose a password of at least " + MIN_PASSWORD + " characters to secure this account." };
      Object.assign(u, await hashPassword(password));
      saveUsers(getUsers().map(x => (x.email || "").toLowerCase() === email ? u : x));
    } else {
      const h = await hashPassword(password, u.salt, u.iter);
      if (!timingSafeEqual(h.hash, u.hash)) { noteFailure(email); return { error: "Incorrect email or password." }; }
    }
  } catch (e) { return { error: e.message }; }
  clearFailures(email);
  return { user: publicUser(u) };
}

/* Demo sign-in (mock data, no password). */
function demoSignin(role) {
  const u = DEMO_USERS[role];
  if (!u) return;
  setSession(u);
  ensureDemoData();
  toast("✓ Demo signed in — mock data is clearly labelled. Taking you to your workspace…");
  setTimeout(() => location.href = homeFor(role), 600);
}

/* ---------- 4. Student data store (per account) ---------- */
function dataKey(email) { const s = getSession(); return "pf_data_" + (email || (s ? s.email : "guest")); }
function getStudentData() { return lsGet(dataKey(), null); }
let _syncTimer = null;
function saveStudentData(d) {
  lsSet(dataKey(), d);                                       // instant local cache = fast UI
  if (window.PF_DB && PF_DB.live && !isDemo()) {             // debounced background sync, never blocks the UI
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(function () {
      PF_DB.syncStudentData(d);
      PF_DB.audit("student_data_saved", { subjects: (d.results || []).length });
    }, 800);
  }
}
function isDemo() { const s = getSession(); return !!(s && s.demo); }
function shortlistKey() { const s = getSession(); return "pf_short_" + (s ? s.email : "guest"); }

/* Mock data — ONLY for the demo account. Always labelled as mock in the UI. */
function mockStudentData() {
  return {
    onboarded: true, mock: true, stage: "KCSE Candidate (Form 3–4)", county: "Nairobi", school: "Pangani Girls' High School (Mock)",
    results: [
      { subject: "Mathematics", score: 88, target: 85 }, { subject: "Physics", score: 82, target: 80 }, { subject: "Chemistry", score: 49, target: 65 },
      { subject: "Computer Studies", score: 87, target: 85 }, { subject: "English", score: 79, target: 75 }, { subject: "Kiswahili", score: 74, target: 75 }],
    quiz: { top: "Engineering & Technology", riasec: "R–I profile", answers: {} },
    assessments: [
      { name: "Term 2 Mid-Term Practical", date: "2025-06-18", subject: "Physics (Paper 3)", raw: "34/40 (85%)", pts: "11.0" },
      { name: "Continuous Assessment 2", date: "2025-06-14", subject: "Chemistry (Paper I)", raw: "39/80 (48.7%)", pts: "5.0" },
      { name: "Inter-County Joint Opener", date: "2025-05-12", subject: "Mathematics (P1 & P2)", raw: "176/200 (88%)", pts: "12.0" }]
  };
}
function ensureDemoData() { if (isDemo() && !getStudentData()) saveStudentData(mockStudentData()); }

/* ---------- 5. Recommendation engine ----------
   Combines (a) RIASEC personality from quiz answers and
   (b) grade feasibility vs typical KUCCPS cluster requirements.
   NOTE: this ESTIMATES pathway fit. Official cluster points are calculated by KUCCPS. */
const PATHWAY_DEFS = [
  { id: "eng", name: "Engineering & Technology", icon: "⚙", bg: "#eef7d6", cluster: "Cluster 1 & 3", req: { Mathematics: 75, Physics: 70, Chemistry: 60, "Computer Studies": 60 }, riasec: ["R", "I"], desc: "Software, civil, mechatronics, electrical — computational & built systems.", occ: ["Software Engineer", "Civil Engineer", "Mechatronics Tech"], unis: "UoN, JKUAT, TUK", tvet: "Kabwe Poly, Kenya Coast Poly" },
  { id: "health", name: "Health & Medicine", icon: "✚", bg: "#fdecea", cluster: "Cluster 13", req: { Biology: 65, Chemistry: 65, Mathematics: 60, Physics: 60 }, riasec: ["S", "I"], desc: "Clinical medicine, nursing, pharmacy, lab science.", occ: ["Clinical Officer", "Nurse (KRCHN)", "Lab Scientist"], unis: "UoN, Moi, Egerton", tvet: "KMTC (71 campuses)" },
  { id: "business", name: "Business & Finance", icon: "↗", bg: "#e6f4ea", cluster: "Cluster 6 & 7", req: { Mathematics: 65, English: 60 }, riasec: ["E", "C"], desc: "Finance, audit, logistics, actuarial, fintech.", occ: ["Financial Analyst", "Supply Chain Lead", "Actuarial Scientist"], unis: "Strathmore, KCA, Co-op Univ", tvet: "KASNEB (CPA/CIFA)" },
  { id: "agri", name: "Agriculture & Environment", icon: "🌱", bg: "#eef7d6", cluster: "Cluster 11", req: { Biology: 60, Chemistry: 55, Mathematics: 55 }, riasec: ["R", "N"], desc: "Agronomy, food tech, climate-smart agriculture.", occ: ["Agronomist", "Food Technologist", "Soil Scientist"], unis: "Egerton, JKUAT", tvet: "Bukura Agricultural College" },
  { id: "creative", name: "Creative Arts & Media", icon: "🎨", bg: "#fdf3d7", cluster: "Cluster 17", req: { English: 60, Kiswahili: 55 }, riasec: ["A", "S"], desc: "UI/UX, animation, journalism, film & sound.", occ: ["UX/UI Designer", "Animator", "Journalist"], unis: "Daystar, MMU", tvet: "KIMC" },
  { id: "law", name: "Law, Education & Governance", icon: "⚖", bg: "#ede9fe", cluster: "Cluster 2 & 19", req: { English: 65, Kiswahili: 60, Mathematics: 55 }, riasec: ["S", "E"], desc: "Law, teaching (TSC), public administration, policy.", occ: ["Teacher (TSC)", "Legal Researcher", "County Officer"], unis: "UoN, KU, Moi", tvet: "Teacher colleges, Kenya School of Law" }
];
const SUBJECT_FOCUS = {
  "Chemistry":        ["Stoichiometry, mole calculations & qualitative analysis — KNEC topical past papers.", "30 min daily + weekly tutor clinic"],
  "Mathematics":      ["Calculus & 3D geometry speed drills — weekly timed Paper 2 practice.", "3 × 45 min / week"],
  "Physics":          ["EM induction, waves & Paper 3 practical apparatus accuracy.", "2 × 45 min / week"],
  "English":          ["Paper 3 essay outlines, stylistic devices & thesis clarity.", "2 × 30 min / week"],
  "Kiswahili":        ["Sarufi, Isimu Jamii & Ushairi metric analysis drills.", "2 × 30 min / week"],
  "Computer Studies": ["Project milestone documentation + SQL/database relationships.", "2 × 45 min / week"],
  "Biology":          ["Cell biology diagrams, genetics crosses & practical prep.", "2 × 45 min / week"]
};
const GENERIC_FOCUS = ["Past-paper practice + topic mastery for your weakest topics.", "2 × 45 min / week"];

function gradeOf(score) { return score >= 80 ? "A" : score >= 70 ? "A−" : score >= 60 ? "B+" : score >= 50 ? "B" : score >= 40 ? "C+" : "C"; }

/* Quiz answers are stored as option INDEXES (new) or RIASEC LETTERS (legacy/remote). Return the letter. */
function quizLetter(qi, v) {
  if (typeof v === "number" || /^\d+$/.test(String(v))) {
    const q = (window.PF_QUIZ || [])[+qi];
    return q && q.opts[+v] ? q.opts[+v][1] : null;
  }
  return v;
}
function computeRecommendations(data) {
  const results = data.results || [];
  const bySubj = {};
  results.forEach(r => bySubj[r.subject] = r.score);
  const avg = results.length ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 0;

  const counts = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0, N: 0 };
  Object.entries((data.quiz && data.quiz.answers) || {}).forEach(([qi, v]) => {
    const letter = quizLetter(qi, v);
    if (letter in counts) counts[letter]++;
  });
  const topLetters = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]);

  /* 55% personality fit + 45% grade feasibility */
  const ranked = PATHWAY_DEFS.map(p => {
    let pers = 0;
    p.riasec.forEach((L, i) => { pers += (counts[L] || 0) * (i === 0 ? 3 : 2); });
    const persPct = Math.min(100, Math.round(pers / 18 * 100));
    let feasSum = 0, reqN = 0;
    const gaps = [];
    Object.entries(p.req).forEach(([sub, need]) => {
      const have = bySubj[sub];
      if (have == null) { gaps.push({ sub, need, have: null, msg: "Not yet entered — add " + sub + " to unlock this pathway." }); return; }
      reqN++;
      feasSum += Math.min(1.15, have / need);
      if (have < need) gaps.push({ sub, need, have, msg: "Raise " + sub + " from " + have + "% to " + need + "%+ (+" + (need - have) + " pts)" });
    });
    const feasPct = reqN ? Math.round(feasSum / reqN * 100) : 50;
    const overall = Math.round(persPct * 0.55 + Math.min(100, feasPct) * 0.45);
    const verdict = overall >= 75 ? "Strong fit — apply with confidence" : overall >= 60 ? "Good fit — close the gaps below" : overall >= 45 ? "Possible — needs grade improvement" : "Stretch — focus on grades first";
    return { ...p, persPct, feasPct, overall, verdict, gaps, topLetters };
  }).sort((a, b) => b.overall - a.overall);

  const plans = results.map(r => {
    const gap = (r.target || r.score) - r.score;
    const [focus, hours] = SUBJECT_FOCUS[r.subject] || GENERIC_FOCUS;
    return { subject: r.subject, score: r.score, grade: gradeOf(r.score), target: r.target || r.score, gap, focus, hours, priority: gap > 10 ? "High" : gap > 0 ? "Medium" : "Maintain" };
  }).sort((a, b) => b.gap - a.gap);

  return { avg, ranked, plans, topLetters, riasecLabel: topLetters.join("–") + " profile" };
}

/* Shared SVG bar chart: score (bars) vs target (orange line). All text is escaped. */
function renderScoreChart(results) {
  if (!results || !results.length) return "";
  const w = 640, h = 220, pad = { l: 36, r: 12, t: 12, b: 28 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b, bw = iw / results.length;
  let bars = "";
  results.forEach(function (r, i) {
    const x = pad.l + bw * i + bw * 0.2, bw2 = bw * 0.6;
    const y1 = pad.t + ih * (1 - r.score / 100), y2 = pad.t + ih * (1 - (r.target || r.score) / 100);
    bars += '<rect x="' + x + '" y="' + y1 + '" width="' + bw2 + '" height="' + (pad.t + ih - y1) + '" rx="6" fill="#7c5cff"/>' +
      '<line x1="' + x + '" y1="' + y2 + '" x2="' + (x + bw2) + '" y2="' + y2 + '" stroke="#ff7a59" stroke-width="3"/>' +
      '<text x="' + (x + bw2 / 2) + '" y="' + (h - 10) + '" text-anchor="middle" font-size="10" fill="#6b6b8a">' + esc(String(r.subject).slice(0, 10)) + '</text>' +
      '<text x="' + (x + bw2 / 2) + '" y="' + (y1 - 6) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#2e1065">' + esc(r.score) + '%</text>';
  });
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;display:block" role="img" aria-label="Scores versus targets">' +
    '<line x1="' + pad.l + '" y1="' + (pad.t + ih) + '" x2="' + (w - pad.r) + '" y2="' + (pad.t + ih) + '" stroke="rgba(124,92,255,.15)"/>' + bars + '</svg>' +
    '<p class="tiny muted">Purple bar = your score · Orange line = target. Update your results to see progress move.</p>';
}

/* Export the signed-in student's results as CSV. */
function exportData() {
  const d = getStudentData();
  if (!d || !(d.results || []).length) { toast("Nothing to export yet — add your results first."); return; }
  const rows = [["Subject", "Score %", "Target %"]].concat(d.results.map(r => [r.subject, r.score, r.target || ""]));
  downloadFile("pathfinder-results.csv", rows.map(r => r.map(csvCell).join(",")).join("\n"), "text/csv");
  toast("⬇ Results exported (CSV).");
}
function exportJSON() {
  const s = getSession() || { name: "Guest" };
  downloadFile("pathfinder-export.json", JSON.stringify({ learner: s.name, exported: new Date().toISOString(), data: getStudentData() }, null, 2), "application/json");
  toast("⬇ Full archive exported (JSON).");
}

/* ---------- 6. UI helpers ---------- */
function mockBadge() { return '<span class="chip mock" title="Illustrative data shown only in the demo account">⚠ MOCK DATA</span>'; }
function realBadge() { return '<span class="chip real" title="Compiled from public CUE / KUCCPS / TVETA / HELB sources — verify on official sites">✓ PUBLIC SOURCES</span>'; }
function demoBanner() {
  if (!isDemo()) return "";
  return '<div class="alert-mock" style="margin-bottom:18px"><b>Demo account — mock data.</b> Everything on this page is illustrative sample data so you can explore. Sign up with your own account to enter your real results. ' + mockBadge() + '</div>';
}
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { const m = $("#addModal"); if (m) m.classList.remove("open"); }
});

function dbStatus() { return (window.PF_DB && PF_DB.live) ? "Supabase live · synced" : "Local cache mode · add Supabase keys in assets/js/supabase-config.js to go live"; }
function dbBadge() { return (window.PF_DB && PF_DB.live) ? '<span class="chip green">● Supabase live</span>' : '<span class="chip amber">● Local cache (Supabase ready)</span>'; }

/* Fast search with live suggestions. getItems(q) -> [{title, sub, value}] (all text is escaped here). */
function attachAutocomplete(inputEl, getItems, onPick) {
  if (!inputEl) return;
  let box = document.getElementById(inputEl.id + "_suggest");
  if (!box) {
    box = document.createElement("div");
    box.id = inputEl.id + "_suggest";
    box.style.cssText = "position:absolute;left:0;right:0;top:calc(100% + 6px);background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow2);z-index:60;overflow:hidden;display:none;max-height:300px;overflow-y:auto";
    inputEl.parentElement.style.position = "relative";
    inputEl.parentElement.appendChild(box);
  }
  let timer = null;
  inputEl.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      const q = inputEl.value.trim().toLowerCase();
      if (q.length < 2) { box.style.display = "none"; return; }
      const items = getItems(q).slice(0, 8);
      if (!items.length) { box.innerHTML = '<div style="padding:14px" class="tiny muted">No matches — try another spelling.</div>'; box.style.display = "block"; return; }
      box.innerHTML = items.map(function (it, i) {
        return '<button type="button" data-i="' + i + '" style="width:100%;text-align:left;background:#fff;border:0;border-bottom:1px solid rgba(124,92,255,.07);padding:12px 14px;font-size:14px;cursor:pointer"><b>' + esc(it.title) + '</b><br><span class="tiny muted">' + esc(it.sub || "") + '</span></button>';
      }).join("");
      box.style.display = "block";
      box.querySelectorAll("button").forEach(function (b) {
        b.onclick = function () {
          const it = items[+b.dataset.i];
          inputEl.value = it.value || it.title;
          box.style.display = "none";
          if (onPick) onPick(it);
          inputEl.dispatchEvent(new Event("input"));
        };
      });
    }, 120);
  });
  document.addEventListener("click", function (e) { if (!box.contains(e.target) && e.target !== inputEl) box.style.display = "none"; });
  inputEl.addEventListener("keydown", function (e) { if (e.key === "Escape") box.style.display = "none"; });
}
function globalSearchItems(q) {
  const out = [];
  (window.PF_INSTITUTIONS || []).forEach(function (i) {
    if ((i.name + " " + i.progs.join(" ")).toLowerCase().includes(q)) out.push({ title: i.name, value: i.name, sub: i.type + " · " + i.region + " · " + (i.cutoff || "") });
  });
  (window.PF_SCHOLARSHIPS || []).forEach(function (s) {
    if (s.name.toLowerCase().includes(q)) out.push({ title: s.name, value: s.name, sub: s.type + " · " + s.amt });
  });
  ["Passion Quiz", "Academic Tracker", "Funding & HELB", "Institutions Database", "Tutor Centre"].forEach(function (x) {
    if (x.toLowerCase().includes(q)) out.push({ title: x, value: x, sub: "Go to page" });
  });
  return out;
}
/* Wire the topbar search box (present on most pages). */
function initGlobalSearch() {
  const el = document.getElementById("globalSearch");
  if (el) attachAutocomplete(el, globalSearchItems, function (it) { toast("Searching: " + it.title); });
}

/* ---------- Kiswahili (SW) / English (EN) toggle ---------- */
window.PF_I18N = {
  en: {},
  sw: {
    "Dashboard": "Dashibodi", "My progress": "Maendeleo yangu", "Career explorer": "Kichunguzi cha kazi",
    "Universities & TVET": "Vyuo vikuu & TVET", "Scholarships & funding": "Ruzuku & ufadhili",
    "Settings": "Mipangilio", "Help & support": "Msaada", "Sign in": "Ingia", "Get started free": "Anza bure",
    "Create your free account": "Fungua akaunti yako ya bure", "Take the 60-second quiz": "Fanya quiz ya sekunde 60",
    "Every Kenyan student deserves a clear path.": "Kila mwanafunzi wa Kenya anastahili njia iliyo wazi.",
    "Hello, future achiever": "Habari, mshindi wa baadaye", "Big dreams start here.": "Ndoto kubwa huanza hapa.",
    "Discover your path": "Gundua njia yako", "Add a result": "Weka matokeo", "Your overview": "Muhtasari wako",
    "Overall average": "Wastani wa jumla", "Subjects tracked": "Masomo yanayofuatiliwa", "Strongest subject": "Somo bora zaidi",
    "Saved institutions": "Vyuo vilivyohifadhiwa", "Passion Quiz": "Quiz ya shauku", "My Tracker": "Kifuatiliaji changu",
    "Profile & Stage": "Wasifu & hatua", "Sign out": "Toka", "Save changes": "Hifadhi mabadiliko"
  }
};
function setLang(lang) {
  try { localStorage.setItem("pf_lang", lang); } catch (e) {}
  document.querySelectorAll("[data-lang]").forEach(function (b) { b.classList.toggle("on", b.dataset.lang === lang); });
  const dict = window.PF_I18N[lang] || {};
  if (lang === "sw") {
    document.querySelectorAll("a,button,h1,h2,h3,span,div,p").forEach(function (el) {
      if (el.children.length === 0 && el.textContent) {
        const k = el.textContent.trim();
        if (dict[k]) el.textContent = el.textContent.replace(k, dict[k]);
      }
    });
    document.documentElement.lang = "sw";
    toast("🇰🇪 Kiswahili Sanifu imewashwa — muongozo wa kozi na vyuo.");
  } else {
    document.documentElement.lang = "en";
    location.reload();
  }
}
function initLang() {
  let lang = "en";
  try { lang = localStorage.getItem("pf_lang") || "en"; } catch (e) {}
  document.querySelectorAll("[data-lang]").forEach(function (b) {
    b.classList.toggle("on", b.dataset.lang === lang);
    b.onclick = function () { setLang(b.dataset.lang); };
  });
  if (lang === "sw") setLang("sw");
}
/* Tutor and admin workspaces are UI previews with sample data and simulated actions. Say so on every page. */
function initPreviewBanner() {
  if (!/\/(tutor|admin)\//.test(location.pathname)) return;
  const main = document.querySelector("main.view");
  if (!main || main.querySelector(".preview-banner, .alert-mock")) return;
  const d = document.createElement("div");
  d.className = "alert-mock preview-banner";
  d.style.marginBottom = "18px";
  d.innerHTML = "<b>Preview workspace.</b> Lists and numbers on this page are sample data, and buttons only simulate actions — nothing is sent to real people. " + mockBadge();
  main.insertBefore(d, main.firstChild);
}
document.addEventListener("DOMContentLoaded", function () { initLang(); initGlobalSearch(); initPreviewBanner(); });
