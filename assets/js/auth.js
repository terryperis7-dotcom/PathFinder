/* Sessions: local demo accounts (PBKDF2-hashed) and the Supabase path. */
/* ---------- Auth ---------- */
function setSession(acc, token, refresh) {
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
  if (!S.profile.name) S.profile.name = acc.name;
  save();
  refreshShell();
}
function signOut() {
  if (SESSION && SESSION.token && sb.enabled()) sb.signOut(SESSION.token).catch(() => {});
  liveReset();
  SESSION = null;
  store.set("pf-session-v1", null);
  location.href = PF_ROOT + "index.html";
  toast("Signed out — see you soon", "i-logout");
}
/* With Supabase configured, the server is the only authority: the role and
   the suspended flag come from the profiles row, not from this browser. */
async function liveSession(r) {
  const uid = r.user && r.user.id;
  SESSION = { id: uid, token: r.access_token, refresh: r.refresh_token };
  const p = await sb.myProfile(uid);
  if (!p) throw new Error("Your profile is not ready yet. Try again in a moment.");
  if (p.suspended) {
    SESSION = null;
    throw new Error("This account is suspended. Contact support if you think that is a mistake.");
  }
  setSession(p, r.access_token, r.refresh_token);
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
    const r = await sb.signUp(o.email, o.pw, { name: o.name, role: o.role === "tutor" ? "tutor" : "student", county: o.county });
    if (!r.access_token) throw new Error("Check your inbox to confirm your email, then sign in.");
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
    demo: false
  };
  acc.hash = await hashPw(o.pw, acc.salt);
  ACCOUNTS.push(acc);
  saveAccounts();
  setSession(acc);
}
/* A new login must not inherit the last person's cached admin view. */
function liveReset() {
  window.__adLive = false;
}
function signInDemo(role) {
  const acc = ACCOUNTS.find((a) => a.demo && a.role === role);
  if (!acc) return;
  if (role === "tutor") seedDemoTutorData();
  setSession(acc);
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
