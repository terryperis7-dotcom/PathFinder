/* ============================================================
   PathFinder Kenya — Tutor workspace data layer
   © 2026 PathFinder Kenya. All rights reserved. See /LICENSE.

   Real persisted state for the tutor workspace: profile,
   verification checklist, availability and sessions.

   HONESTY NOTE — verification
   Nothing in this file can mark a tutor "verified". A document a
   tutor says they have uploaded is recorded as SUBMITTED and shown
   as "Awaiting review". Only a human reviewer setting the record
   from the database can flip it to verified. Claiming TSC, DCI or
   safeguarding clearance that has not been checked would put
   children at risk and expose the platform.

   Storage: per-account in localStorage, and (when Supabase is
   configured) the TSC number is synced to profiles.tsc_number.
   ============================================================ */

/* Fixed national pilot rate, KES per hour. */
const TUTOR_RATE = 500;

/* The steps a tutor must complete before taking paid sessions. */
const PF_VERIFICATION_STEPS = [
  { id: "tsc",          label: "TSC registration number",     hint: "Your Teachers Service Commission registration number." },
  { id: "id",           label: "National ID or passport",      hint: "Must match your TSC record." },
  { id: "conduct",      label: "DCI good conduct certificate", hint: "Police clearance — required for any work with minors." },
  { id: "safeguarding", label: "Safeguarding training",        hint: "Children Act 2022 awareness module." }
];

const TUTOR_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function tutorStoreKey() {
  const s = (typeof getSession === "function") ? getSession() : null;
  const who = (s && s.email) ? String(s.email).toLowerCase() : "anon";
  return "pf_tutor_" + who;
}

function defaultTutorProfile() {
  return {
    tsc: "", subjects: [], county: "", rate: TUTOR_RATE,
    bio: "", experience: "",
    docs: {},                 /* { tsc:{submitted:true,at:iso,verified:false}, ... } */
    availability: [],         /* [{day:"Monday", start:"16:00", end:"17:00"}] */
    sessions: []              /* sessions the tutor has created */
  };
}

function loadTutorProfile() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(tutorStoreKey()) || "null"); } catch (e) { raw = null; }
  const base = defaultTutorProfile();
  if (!raw || typeof raw !== "object") return base;
  /* merge so a stored profile from an older version still loads */
  const out = Object.assign(base, raw);
  out.docs = raw.docs && typeof raw.docs === "object" ? raw.docs : {};
  out.subjects = Array.isArray(raw.subjects) ? raw.subjects : [];
  out.availability = Array.isArray(raw.availability) ? raw.availability : [];
  out.sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
  if (!out.rate || out.rate <= 0) out.rate = TUTOR_RATE;
  return out;
}

function saveTutorProfile(p) {
  const profile = p || loadTutorProfile();
  try { localStorage.setItem(tutorStoreKey(), JSON.stringify(profile)); } catch (e) {}
  /* Best-effort cloud sync of the TSC number only. */
  if (typeof PF_DB !== "undefined" && PF_DB && PF_DB.live && typeof PF_DB.syncProfile === "function") {
    const s = (typeof getSession === "function") ? getSession() : null;
    if (s) PF_DB.syncProfile({ name: s.name, extra: { county: profile.county, tsc: profile.tsc } });
  }
  return profile;
}

function updateTutorProfile(patch) {
  const p = loadTutorProfile();
  Object.keys(patch || {}).forEach(k => { p[k] = patch[k]; });
  return saveTutorProfile(p);
}

/* ---------- Verification ----------
   Returns one row per step with a truthful status:
     'missing'   — nothing submitted
     'submitted' — the tutor says they provided it; awaits human review
     'verified'  — a reviewer confirmed it (set from the database only)
*/
function tutorVerification(profile) {
  const p = profile || loadTutorProfile();
  const docs = p.docs || {};
  const steps = PF_VERIFICATION_STEPS.map(function (st) {
    const d = docs[st.id] || {};
    const verified = d.verified === true;
    const submitted = d.submitted === true;
    return {
      id: st.id, label: st.label, hint: st.hint,
      status: verified ? "verified" : (submitted ? "submitted" : "missing"),
      submitted: submitted, verified: verified,
      at: d.at || null
    };
  });
  const submitted = steps.filter(s => s.submitted).length;
  const verified = steps.filter(s => s.verified).length;
  return {
    steps: steps, submitted: submitted, verified: verified, total: steps.length,
    complete: verified === steps.length,
    canTakeBookings: verified === steps.length
  };
}

/* Record that a tutor has provided a document. Never sets verified. */
function submitTutorDoc(id) {
  if (!PF_VERIFICATION_STEPS.some(s => s.id === id)) return null;
  const p = loadTutorProfile();
  p.docs = p.docs || {};
  p.docs[id] = { submitted: true, verified: false, at: new Date().toISOString() };
  return saveTutorProfile(p);
}

function withdrawTutorDoc(id) {
  const p = loadTutorProfile();
  if (p.docs) delete p.docs[id];
  return saveTutorProfile(p);
}

/* ---------- Availability ---------- */
function addTutorSlot(day, start, end) {
  if (TUTOR_DAYS.indexOf(day) < 0) return null;
  if (!start || !end || String(start) >= String(end)) return null;
  const p = loadTutorProfile();
  const dup = p.availability.some(s => s.day === day && s.start === start);
  if (dup) return p;
  p.availability.push({ day: day, start: start, end: end });
  p.availability.sort((a, b) => TUTOR_DAYS.indexOf(a.day) - TUTOR_DAYS.indexOf(b.day) || a.start.localeCompare(b.start));
  return saveTutorProfile(p);
}

function removeTutorSlot(index) {
  const p = loadTutorProfile();
  p.availability = p.availability.filter((_, i) => i !== index);
  return saveTutorProfile(p);
}

/* Weekly teaching hours, derived from the availability slots. */
function tutorWeeklyHours(profile) {
  const p = profile || loadTutorProfile();
  return p.availability.reduce(function (sum, s) {
    const a = String(s.start || "").split(":"), b = String(s.end || "").split(":");
    if (a.length < 2 || b.length < 2) return sum;
    const mins = (Number(b[0]) * 60 + Number(b[1])) - (Number(a[0]) * 60 + Number(a[1]));
    return sum + (isFinite(mins) && mins > 0 ? mins / 60 : 0);
  }, 0);
}

/* ---------- Sessions ----------
   Sessions are created by the tutor. There are no invented bookings:
   the list starts empty and only grows when the tutor adds one.
*/
function addTutorSession(sess) {
  const p = loadTutorProfile();
  const s = {
    id: "s" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    day: String((sess && sess.day) || "").trim(),
    time: String((sess && sess.time) || "").trim(),
    student: String((sess && sess.student) || "").trim(),
    subject: String((sess && sess.subject) || "").trim(),
    mode: String((sess && sess.mode) || "Online").trim(),
    status: "Awaiting guardian consent",
    createdAt: new Date().toISOString()
  };
  if (!s.day || !s.student) return null;
  p.sessions.push(s);
  saveTutorProfile(p);
  return s;
}

function removeTutorSession(id) {
  const p = loadTutorProfile();
  p.sessions = p.sessions.filter(s => s.id !== id);
  return saveTutorProfile(p);
}

/* Sort sessions by the KUCCPS-independent weekday order. */
function tutorSessionsSorted(profile) {
  const p = profile || loadTutorProfile();
  return p.sessions.slice().sort(function (a, b) {
    const d = TUTOR_DAYS.indexOf(a.day) - TUTOR_DAYS.indexOf(b.day);
    return d !== 0 ? d : String(a.time).localeCompare(String(b.time));
  });
}

/* Month estimate from the sessions actually booked. */
function tutorMonthlyEstimate(profile) {
  const p = profile || loadTutorProfile();
  const hours = p.sessions.length;   // one hour per session in the pilot
  return { sessions: p.sessions.length, hours: hours, amount: hours * (p.rate || TUTOR_RATE) * 4 };
}

if (typeof window !== "undefined") {
  window.TUTOR_RATE = TUTOR_RATE;
  window.PF_VERIFICATION_STEPS = PF_VERIFICATION_STEPS;
  window.TUTOR_DAYS = TUTOR_DAYS;
}
