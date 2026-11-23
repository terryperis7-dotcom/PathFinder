/* ============================================================
   Safety onboarding — the gate every learner and tutor walks through.

   Four things have to happen before the app opens up:
     1. Who you are — date of birth, county, school (age is computed from the
        date, never typed in, so nobody can claim 18 by accident).
     2. A guardian, if you are under 18. Name, relationship, a phone number and
        an explicit "my guardian knows I am here".
     3. Read the safety documents. Each one has to be opened before it can be
        ticked — the signature records exactly which ones and when.
     4. Sign it. A typed full name plus a version stamp, kept per account.

   Tutors add a fifth: the four verification documents. They may skip those, and
   the tutor then stays visibly unverified rather than silently "trusted".

   Everything is stored per account id under S.onboarding, so two people sharing
   one phone cannot inherit each other's signature.
   ============================================================ */

const SAFETY_VERSION = "2026-11";
const ONB_PAGES = ["welcome", "tutor-welcome"];
/* Guardianship is a legal fact, not a preference: 18 is the line, and the
   Kenyan age of majority has no exceptions we can implement here. */
const SAFETY_AGE = 18;
const SAFETY_MIN_AGE = 13;

/* The documents are short on purpose. A wall of text is not informed consent. */
const SAFETY_DOCS = [
  {
    id: "community",
    title: "Community & safety rules",
    blurb: "How learners and tutors talk to each other here.",
    points: [
      "Keep every conversation on PathFinder. Phone numbers, social handles and email addresses are blocked in messages.",
      "No money, airtime, gifts or deposits. Sessions are paid through the platform only, after the session.",
      "One adult and one learner per session. No private meet-ups, no lifts home, no sessions behind a closed door without a guardian nearby.",
      "Report anything that feels wrong — a report goes to a human reviewer, and the other person is never told who filed it."
    ]
  },
  {
    id: "privacy",
    title: "What we do with your data",
    blurb: "Kenya Data Protection Act 2019, in plain language.",
    points: [
      "Marks, mock scores and interests stay yours. An admin can see that a safety report exists; they cannot read your grades.",
      "In demo mode everything is stored on this device only. Nothing is sent anywhere until a school or project connects Supabase.",
      "You can export everything we hold, or delete your account, from My profile at any time.",
      "We never sell data and we do not share it with advertisers."
    ]
  },
  {
    id: "consent",
    title: "Guardians, and what they are agreeing to",
    blurb: "What a parent or guardian is told when a learner is under 18.",
    points: [
      "A guardian is told which tutor is booked, the weekly time slot, and whether the session is online or in person.",
      "A guardian can end a session or ask for a different tutor at any time — no reason needed.",
      "Learners under 13 cannot use tutoring here at all; the tools for exploring pathways still work.",
      "If a tutor contacts a learner outside the platform, that is a reportable safety breach, not a favour."
    ]
  },
  {
    id: "conduct",
    title: "Tutor conduct",
    blurb: "The standard a tutor is signing up to.",
    skipFor: "student",
    points: [
      "Never ask a learner for money, a phone number, a photo or an off-platform meeting.",
      "Be on time, or tell the learner and the platform before the slot starts.",
      "Talk about the learner's work, not their body, family finances or personal life.",
      "A safeguarding concern is reported to the platform first, and to the learner's guardian where it is safe to do so."
    ]
  }
];

const ONB_GUARDIAN_RELATIONS = ["Mother", "Father", "Guardian", "Aunt / Uncle", "Grandparent", "Other adult"];

/* ---------- record helpers ---------- */
function onbUid() {
  return (typeof SESSION !== "undefined" && SESSION && SESSION.id) || "";
}
function onbState(uid) {
  S.onboarding = S.onboarding || {};
  const k = uid || onbUid();
  if (!S.onboarding[k])
    S.onboarding[k] = {
      step: 0,
      dob: "",
      county: (SESSION && SESSION.county) || "",
      school: "",
      guardian: {},
      docsRead: [],
      signed: null,
      docsSkipped: false,
      completed: false
    };
  const r = S.onboarding[k];
  r.docsRead = r.docsRead || [];
  r.guardian = r.guardian || {};
  return r;
}
function onbSave(patch, uid) {
  const r = onbState(uid);
  Object.assign(r, patch || {});
  save();
  return r;
}
/* Age from a date of birth, counted the way a person would. */
function onbAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}
function onbNeedsGuardian(dob) {
  const a = onbAge(dob);
  return a != null && a < SAFETY_AGE;
}
function onbDone(uid) {
  const r = S.onboarding && S.onboarding[uid || onbUid()];
  return !!(r && r.completed);
}
/* Which documents apply to this role. */
function onbDocs() {
  const role = (SESSION && SESSION.role) || "student";
  return SAFETY_DOCS.filter((d) => !d.skipFor || d.skipFor !== role);
}
function onbAllRead() {
  const read = onbState().docsRead;
  return onbDocs().every((d) => read.indexOf(d.id) >= 0);
}
function onbCanFinish() {
  const r = onbState();
  const age = onbAge(r.dob);
  if (age == null || age < SAFETY_MIN_AGE) return false;
  if (SESSION && SESSION.role === "tutor" && age < SAFETY_AGE) return false;
  if (age < SAFETY_AGE && !(r.guardian && r.guardian.name && r.guardian.phone && r.guardian.ack)) return false;
  /* everything the signature depends on — the signature itself is the last step,
     so it must not be part of this test or the button would never enable */
  return onbAllRead();
}
/* Sign: name, version, the documents that were read and the moment. */
function onbSign(fullName) {
  const r = onbState();
  r.signed = {
    name: String(fullName || "").trim(),
    ts: Date.now(),
    version: SAFETY_VERSION,
    docs: r.docsRead.slice(),
    age: onbAge(r.dob),
    guardian: onbNeedsGuardian(r.dob) ? Object.assign({}, r.guardian) : null,
    role: (SESSION && SESSION.role) || "student"
  };
  if (!r.completed) r.completedAt = Date.now();
  r.completed = true;
  r.step = 99;
  if (SESSION) {
    const acc = ACCOUNTS.find((a) => a.id === SESSION.id);
    if (acc) {
      acc.needsOnboarding = false;
      saveAccounts();
    }
  }
  save();
  /* The signed record is also kept server-side: the database refuses chat
     until it exists, and a guardian on file is what an admin follows up. */
  if (typeof sb !== "undefined" && sb.live()) {
    const g = r.guardian || {};
    const row = {
      profile_id: SESSION.id,
      dob: r.dob || null,
      county: r.county || null,
      school: r.school || null,
      guardian_name: g.name || null,
      guardian_relation: g.relation || null,
      guardian_phone: g.phone || null,
      guardian_knows: !!g.ack,
      docs_read: r.docsRead.slice(),
      signed_name: r.signed.name,
      version: SAFETY_VERSION
    };
    sb.upsert("safety_consents", [row]).catch(() => queueSync("safety_consents", [row]));
  }
  return r.signed;
}

/* ---------- the gate ---------- */
function onbGuard() {
  if (typeof SESSION === "undefined" || !SESSION) return false;
  if (SESSION.role === "admin") return false;
  if (onbDone()) return false;
  if (ONB_PAGES.indexOf(typeof PF_PAGE === "string" ? PF_PAGE : "") >= 0) return false;
  const target = PF_ROOT + (SESSION.role === "tutor" ? "tutor/welcome.html" : "student/welcome.html");
  /* a marker the tests (and a human reading the DOM) can see: navigation itself
     is not observable in jsdom */
  document.documentElement.setAttribute("data-onb-gate", target);
  try {
    location.assign(target);
  } catch (e) {
    /* jsdom and file:// cannot navigate; the page still renders */
  }
  return true;
}
function onbWelcomeURL() {
  const role = (SESSION && SESSION.role) || "student";
  return PF_ROOT + (role === "tutor" ? "tutor/welcome.html" : "student/welcome.html");
}

/* ---------- what the rest of the app shows about it ---------- */
function safetySignatureHTML() {
  const r = (S.onboarding && S.onboarding[onbUid()]) || null;
  const url = onbWelcomeURL();
  if (!r || !r.completed) {
    return `<div class="sign-row todo">${ic("i-shield")}<div><b>Safety check not finished</b>
      <span>Read the rules, add your details and sign before booking a session.</span></div>
      <a class="btn btn-dark btn-sm" href="${url}">Start</a></div>`;
  }
  if (r.legacy) {
    return `<div class="sign-row">${ic("i-check")}<div><b>Safety check signed</b>
      <span>Signed before ${esc(SAFETY_VERSION)} — you can read the current documents again any time.</span></div>
      <a class="btn btn-ghost btn-sm" href="${url}">Review</a></div>`;
  }
  const s = r.signed || {};
  const when = s.ts
    ? new Date(s.ts).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  return `<div class="sign-row">${ic("i-check")}<div><b>Signed by ${esc(s.name || "you")}</b>
    <span>${esc(when)} · version ${esc(s.version || SAFETY_VERSION)}${s.guardian ? " · guardian on record: " + esc(s.guardian.name) : ""}</span></div>
    <a class="btn btn-ghost btn-sm" href="${url}">Review</a></div>`;
}
