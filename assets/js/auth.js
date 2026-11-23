/* Sessions: local demo accounts (PBKDF2-hashed) and the Supabase path. */
/* ---------- Auth ---------- */
function setSession(acc, token, refresh) {
  const prevId = SESSION && SESSION.id;
  /* the grades, tracker and notifications belong to an account, not a device */
  if (typeof pfSwitchAccount === "function") pfSwitchAccount(prevId, acc);
  SESSION = {
    id: acc.id,
    name: acc.name,
    email: acc.email,
    role: acc.role,
    county: acc.county,
    demo: !!acc.demo,
    tutorId: acc.tutorId || null,
    token: token || null,
    refresh: refresh || null
  };
  store.set("pf-session-v1", SESSION);
  /* the profile, the picture and the signed safety check belong to this
     account, not to whoever used the device last */
  pfHydrateProfile();
  if (!S.profile.name) S.profile.name = acc.name;
  save();
  refreshShell();
  /* nothing works until the safety check is done — see onboarding.js */
  if (typeof onbGuard === "function") onbGuard(true);
}
function signOut() {
  if (SESSION && SESSION.token && sb.enabled()) sb.signOut(SESSION.token).catch(() => {});
  liveReset();
  /* shelve this person's work and picture before the device is handed on */
  if (SESSION && typeof pfPersonalNow === "function") {
    S.acctWork = S.acctWork || {};
    S.acctWork[SESSION.id] = pfPersonalNow();
  }
  if (typeof pfReleaseProfile === "function") pfReleaseProfile();
  save();
  SESSION = null;
  store.set("pf-session-v1", null);
  location.href = PF_ROOT + "index.html";
  toast("Signed out — see you soon", "i-logout");
}
/* With Supabase configured the server is the only authority: the role and the
   suspended flag come from the profiles row, never from this browser. */
async function liveSession(r) {
  const uid = r.user && r.user.id;
  /* The profile lookup needs the new token, but until the profile is checked the
     device still belongs to whoever was signed in, so put that session back. */
  const before = SESSION;
  SESSION = { id: uid, token: r.access_token, refresh: r.refresh_token };
  let p;
  try {
    p = await sb.myProfile(uid);
  } finally {
    SESSION = before;
  }
  if (!p) throw new Error("Your profile is not ready yet — try again in a moment.");
  if (p.suspended) {
    throw new Error("This account is suspended. Contact support if you think that is a mistake.");
  }
  setSession(p, r.access_token, r.refresh_token);
}
/* A new login must not inherit the last person's cached admin view. */
function liveReset() {
  window.__adLive = false;
}
async function doSignIn(email, pw) {
  if (sb.enabled()) {
    liveReset();
    return liveSession(await sb.signIn(email, pw));
  }
  const acc = ACCOUNTS.find((a) => a.email.toLowerCase() === String(email).toLowerCase());
  if (!acc) throw new Error("No account with that email — create one below.");
  if (acc.demo) throw new Error("That's a demo account — use the one-click demo buttons.");

  const h = await hashPw(pw, acc.salt);
  if (h !== acc.hash) throw new Error("Wrong password.");
  setSession(acc);
}
async function doSignUp(o) {
  if (sb.enabled()) {
    liveReset();
    /* the profile row is created by the handle_new_user trigger, and a sign-up
       that asks for "admin" is stored as "student" */
    let r = await sb.signUp(o.email, o.pw, {
      name: o.name,
      role: o.role === "tutor" ? "tutor" : "student",
      county: o.county
    });
    /* A project with email confirmation switched off returns a session straight
       away and this is the end of it. When Supabase answers with a user but no
       token, confirmation is still on — sign in with the password we already
       hold rather than sending the person to a mailbox. Only if that fails too
       do they have to confirm, and then the page says so plainly. */
    if (!r.access_token) {
      try {
        r = await sb.signIn(o.email, o.pw);
      } catch (e) {
        const err = new Error(
          "Your account was created, but this Supabase project still asks for an email confirmation before the first sign-in."
        );
        err.code = "confirm_email";
        throw err;
      }
    }
    return liveSession(r);
  }
  if (ACCOUNTS.find((a) => a.email.toLowerCase() === o.email.toLowerCase()))
    throw new Error("An account with that email already exists.");
  const acc = {
    id: "u" + Date.now(),
    name: o.name,
    email: o.email,
    role: o.role,
    county: o.county,
    salt: "s" + Math.random().toString(36).slice(2, 12),
    created: Date.now(),
    demo: false,
    /* they land on the welcome flow: safety documents, details, signature */
    needsOnboarding: true
  };
  acc.hash = await hashPw(o.pw, acc.salt);
  ACCOUNTS.push(acc);
  saveAccounts();
  setSession(acc);
}
function signInDemo(role) {
  const acc = ACCOUNTS.find((a) => a.demo && a.role === role);
  if (!acc) return;
  if (role === "tutor") seedDemoTutorData();
  setSession(acc);
  /* the demo learner should land on a populated overview, and it is only ever
     the demo account that gets filled in for them */
  if (role === "student" && typeof pfSeedDemoGrades === "function")
    if (!Object.keys(S.grades || {}).length) pfSeedDemoGrades();
  toast("Signed in as " + acc.name + " (DEMO " + role + ")", "i-check");
  /* Already on that role's page? Render in place — no reload, no scroll jump. */
  const here = PF_PAGE || "";
  const onOwn =
    role === "admin"
      ? here.indexOf("admin") === 0
      : role === "tutor"
        ? here === "tspace" || here.indexOf("tutor") === 0
        : here === "dashboard" || here === "onboarding";
  if (onOwn) {
    try {
      renderShell();
    } catch (e) {}
    if (role === "admin" && typeof renderAdmin === "function") renderAdmin();
    if (role === "tutor" && typeof renderTutorDesk === "function") renderTutorDesk();
    if (role === "student" && typeof renderDashboard === "function") renderDashboard();
    reveal();
    return;
  }
  go(role === "tutor" ? "tspace" : role === "admin" ? "admin" : "dashboard");
}
function seedDemoTutorData() {
  if (S.demoSeeded) return;
  const now = Date.now();
  const b1 = {
    id: now - 3e5,
    tutorId: "t1",
    subject: "Mathematics",
    slot: "Sat 9:00–11:00 AM",
    mode: "In-person / online",
    note: "Form 3 — matrices",
    status: "Confirmed",
    ts: now - 864e5 * 2,
    learner: "Achieng A.",
    demoSeed: true
  };
  const b2 = {
    id: now - 2e5,
    tutorId: "t1",
    subject: "Physics",
    slot: "Mon 4:00–6:00 PM",
    mode: "Online",
    note: "Paper 2, electricity",
    status: "Requested",
    ts: now - 36e5 * 5,
    learner: "Kevin O.",
    demoSeed: true
  };
  S.bookings.unshift(b2, b1);
  S.msgs[b1.id] = [
    { from: "me", text: "Hi Brian! Mathematics on Sat 9–11 — Form 3 matrices.", ts: now - 864e5 * 2 },
    { from: "tutor", text: "Confirmed! Bring your exercise book — diagnostic first.", ts: now - 864e5 * 2 + 6e5 }
  ];
  S.msgs[b2.id] = [{ from: "me", text: "Hi! Physics on Mon 4–6 — Paper 2 electricity.", ts: now - 36e5 * 5 }];
  S.demoSeeded = true;
  save();
}
