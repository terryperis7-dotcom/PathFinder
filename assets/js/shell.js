/* ============================================================
   App shell — one place for navigation, guards, icons and the
   shared chrome (sidebar, topbar, bottom nav, drawer).
   Every page includes this after core.js and before its own script.
   ============================================================ */

const PF_ROOT = (document.body && document.body.dataset.root) || "";
const PF_PAGE = (document.body && document.body.dataset.page) || "home";

const URLS = {
  home: "index.html",
  signin: "signin.html",
  signup: "signup.html",
  privacy: "legal/privacy.html",
  terms: "legal/terms.html",
  dashboard: "student/dashboard.html",
  onboarding: "student/onboarding.html",
  welcome: "student/welcome.html",
  "tutor-welcome": "tutor/welcome.html",
  quiz: "student/quiz.html",
  cluster: "student/cluster.html",
  tracker: "student/tracker.html",
  institutions: "student/institutions.html",
  funding: "student/funding.html",
  tutors: "student/tutors.html",
  messages: "student/messages.html",
  sessions: "student/sessions.html",
  profile: "student/profile.html",
  tspace: "tutor/dashboard.html",
  "tutor-students": "tutor/students.html",
  "tutor-messages": "tutor/messages.html",
  "tutor-sessions": "tutor/sessions.html",
  "tutor-schedule": "tutor/schedule.html",
  "tutor-profile": "tutor/profile.html",
  admin: "admin/dashboard.html",
  "admin-requests": "admin/requests.html",
  "admin-sessions": "admin/sessions.html",
  "admin-messages": "admin/messages.html",
  "admin-users": "admin/users.html",
  "admin-safety": "admin/safety.html",
  "admin-data": "admin/data.html",
  "admin-deployment": "admin/deployment.html",
  "admin-dpa": "admin/dpa.html"
};

/* Admin pages share data-page="admin"; this maps each one to its console tab. */
const AD_PAGE_TAB = {
  admin: "dash",
  "admin-requests": "requests",
  "admin-sessions": "sessions",
  "admin-messages": "messages",
  "admin-users": "users",
  "admin-safety": "safety",
  "admin-data": "data",
  "admin-deployment": "deploy",
  "admin-dpa": "dpa"
};

const CRUMB = {
  home: "Home",
  signin: "Sign in",
  signup: "Create account",
  privacy: "Privacy",
  terms: "Terms",
  dashboard: "Overview",
  onboarding: "Your grades",
  welcome: "Safety check",
  "tutor-welcome": "Safety check",
  quiz: "Career check",
  cluster: "Cluster points",
  tracker: "My progress",
  institutions: "Institutions",
  funding: "Funding & HELB",
  tutors: "Find a tutor",
  messages: "Messages",
  sessions: "Scheduled sessions",
  "tutor-messages": "Messages",
  profile: "My profile",
  tspace: "Overview",
  "tutor-students": "My students",
  "tutor-sessions": "Session log",
  "tutor-schedule": "Availability",
  "tutor-profile": "Verification",
  admin: "Admin console",
  "admin-requests": "Learning requests",
  "admin-users": "User control",
  "admin-safety": "Safety & reports",
  "admin-data": "Data audit",
  "admin-deployment": "Deployment centre",
  "admin-dpa": "Data protection"
};

/* Key nav labels only — page content stays English. Honest, small, and
   documented in the README rather than pretending to be a full translation. */
const I18N = {
  en: {
    dashboard: "Overview",
    quiz: "Career check",
    institutions: "Institutions",
    funding: "Funding & HELB",
    tracker: "My progress",
    cluster: "Cluster points",
    tutors: "Find a tutor",
    profile: "My profile",
    plan: "Your plan",
    academics: "Academics",
    support: "Support",
    workspaces: "Workspaces",
    teaching: "Teaching",
    earnings: "Earnings",
    trust: "Trust",
    oversight: "Oversight",
    data: "Data",
    requests: "Requests",
    students: "My students",
    availability: "Availability",
    sessionlog: "Session log",
    verification: "Verification",
    users: "User control",
    safety: "Safety & reports",
    adminconsole: "Admin console",
    operations: "Operations",
    publicsurface: "Public surface",
    platformoverview: "Platform overview",
    learningrequests: "Learning requests",
    safetyreports: "Safety reports",
    directory: "Institution directory",
    homepage2: "Public homepage",
    accountws: "Account & workspace",
    safetycentre: "Safety centre",
    audit: "Reference audit",
    deploy: "Deployment centre",
    dpa: "Data protection",
    homepage: "Public homepage",
    signout: "Sign out",
    guest: "Guest mode",
    synced: "Cloud sync on",
    local: "Local demo mode"
  },
  sw: {
    dashboard: "Muhtasari",
    quiz: "Jaribio la taaluma",
    institutions: "Taasisi",
    funding: "Ufadhili & HELB",
    tracker: "Maendeleo yangu",
    cluster: "Alama za nguzo",
    tutors: "Tafuta mwalimu",
    profile: "Wasifu wangu",
    plan: "Mpango wako",
    academics: "Masomo",
    support: "Msaada",
    workspaces: "Nafasi za kazi",
    teaching: "Kufundisha",
    earnings: "Mapato",
    trust: "Uaminifu",
    oversight: "Usimamizi",
    data: "Data",
    requests: "Maombi",
    students: "Wanafunzi wangu",
    availability: "Upatikanaji",
    sessionlog: "Kumbukumbu",
    verification: "Uthibitisho",
    users: "Watumiaji",
    safety: "Usalama & ripoti",
    adminconsole: "Dashibodi ya msimamizi",
    operations: "Shughuli",
    publicsurface: "Sehemu ya umma",
    platformoverview: "Muhtasari wa jukwaa",
    learningrequests: "Maombi ya kujifunza",
    safetyreports: "Ripoti za usalama",
    directory: "Orodha ya taasisi",
    homepage2: "Ukurasa wa umma",
    accountws: "Akaunti na kazi",
    safetycentre: "Kituo cha usalama",
    audit: "Ukaguzi wa data",
    deploy: "Kituo cha uenezaji",
    dpa: "Ulinzi wa data",
    homepage: "Ukurasa wa mwanzo",
    signout: "Toka",
    guest: "Hali ya mgeni",
    synced: "Usawazishaji wingu",
    local: "Hali ya onyesho"
  }
};
const lang = () => (S && S.lang) || "en";
const t = (k) => (I18N[lang()] && I18N[lang()][k]) || I18N.en[k] || k;

function urlFor(view, params) {
  let u = PF_ROOT + (URLS[view] || "index.html");
  if (params) {
    const q = new URLSearchParams(params).toString();
    if (q) u += "?" + q;
  }
  return u;
}
function go(view, params) {
  if (view === "tutors" && S && S._tutorSubject && !params) params = { subject: S._tutorSubject };
  location.href = urlFor(view, params);
}

/* ---------- Icons ---------- */
function injectIcons() {
  if (!window.PF_ICONS || document.getElementById("pf-icons")) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = PF_ICONS;
  const svg = wrap.firstElementChild;
  if (svg) {
    svg.id = "pf-icons";
    svg.setAttribute("aria-hidden", "true");
    document.body.insertBefore(svg, document.body.firstChild);
  }
}

/* ---------- Guards ---------- */
function guard(role) {
  if (SESSION && SESSION.role === role) return true;
  if (typeof lockedHTML !== "function") return false;
  /* Put the panel inside the page's own content host so the shell, the console
     tabs and the page head survive — signing in from here can then re-render in
     place instead of reloading the whole document. */
  const own =
    role === "admin" ? document.getElementById("adBox") : role === "tutor" ? document.getElementById("tsBox") : null;
  const host = own || document.getElementById("viewBody");
  if (host) host.innerHTML = lockedHTML(role);
  return false;
}

/* ---------- Sidebar / topbar / bottom nav ---------- */
function navLink(view, icon, label, badge, on, params) {
  const tab = params && params.tab ? ` data-tab="${esc(params.tab)}"` : "";
  return `<a href="${urlFor(view, params)}" data-nav="${view}"${tab} class="${on ? "on" : ""}" title="${esc(label)}${badge ? " · " + badge : ""}">${ic(icon)}<span class="lbl">${esc(label)}</span>${badge ? `<span class="snav-badge">${badge}</span>` : ""}</a>`;
}

function renderShell() {
  const sideRole = document.getElementById("sideRole");
  if (!sideRole) return; // public page: no app chrome
  /* setup is a focused card flow: no sidebar, no nav, no notification bell.
     The CSS hides the containers; this stops the work happening at all. */
  if (PF_PAGE === "welcome" || PF_PAGE === "tutor-welcome") return;
  const role = SESSION ? SESSION.role : "student";
  const first = SESSION ? SESSION.name.split(" ")[0] : "Guest";
  const demo =
    SESSION && SESSION.demo ? ' <span class="chip demo" style="font-size:9px;padding:1px 6px">DEMO</span>' : "";

  sideRole.innerHTML =
    role === "tutor"
      ? `${ic("i-users")}<span><b style="font-size:12.5px">${esc(first)}</b> · TSC Tutor${demo}</span>`
      : role === "admin"
        ? `${ic("i-shield")}<span><b style="font-size:12.5px">${esc(first)}</b> · Administrator${demo}</span>`
        : `${ic("i-cap")}<span><b style="font-size:12.5px">${esc(first)}</b> · ${esc(S.profile.stage || "KCSE Candidate")}${demo}</span>`;
  /* renderShell runs again after every sign-in and every state change */
  sideRole.querySelectorAll(".side-sync").forEach((n) => n.remove());
  sideRole.insertAdjacentHTML(
    "beforeend",
    `<span class="side-sync" title="${sb.enabled() ? "Supabase connected" : "Local demo — nothing leaves this device"}"><i class="${sb.live() ? "on" : ""}"></i></span>`
  );

  const openReports = S.reports.filter((r) => r.status === "open").length;
  let nav = "";
  if (role === "tutor") {
    const t2 = PF_TUTORS.find((x) => x.id === SESSION.tutorId);
    const pending = t2 ? S.bookings.filter((b) => b.tutorId === t2.id && b.status === "Requested").length : 0;
    const logged = t2 ? S.bookings.filter((b) => b.tutorId === t2.id && b.status === "Confirmed").length : 0;
    const vc = t2 ? checksOf(t2).filter(Boolean).length : 0;
    /* "Overview" and "Requests" are two views of one page, so they are rows in
       the workspace tab strip, not two sidebar entries that look identical. */
    const inWork = ["tspace", "tutor-students", "tutor-schedule", "tutor-sessions"].includes(PF_PAGE);
    nav = `<h5>${t("teaching")}</h5>
      ${navLink("tspace", "i-home", "Workspace", pending || "", inWork && PF_PAGE === "tspace")}
      ${navLink("tutor-students", "i-users", t("students"), "", PF_PAGE === "tutor-students")}
      ${navLink("tutor-schedule", "i-clock", t("availability"), "", PF_PAGE === "tutor-schedule")}
      ${navLink("tutor-sessions", "i-file", t("sessionlog"), logged || "", PF_PAGE === "tutor-sessions")}
      ${navLink("tutor-messages", "i-chat", "Messages", myUnreadCount() || "", PF_PAGE === "tutor-messages")}
      <h5>${t("trust")}</h5>
      ${navLink("tutor-profile", "i-shield", t("verification"), vc + "/4", PF_PAGE === "tutor-profile")}`;
  } else if (role === "admin") {
    const pendingReqs = S.bookings.filter((b) => b.status === "Requested").length;
    const confirmedCount = S.bookings.filter((b) => b.status === "Confirmed").length;
    const unreadMsgs = (S.threads || []).reduce(
      (a, th) => a + (th.msgs || []).filter((m) => msgSide(m, "admin") === "them" && !m.read).length,
      0
    );
    /* Every admin page shares data-page="admin"; the tab lives in data-adtab. */
    const adt = (document.body && document.body.dataset.adtab) || "";
    const onTab = (k, pageKey) => (adt ? adt === k : PF_PAGE === pageKey);
    nav = `<h5>${t("adminconsole")}</h5>
      ${navLink("admin", "i-chart", t("platformoverview"), "", onTab("dash", "admin"))}
      ${navLink("admin-users", "i-users", t("users"), ACCOUNTS.length, onTab("users", "admin-users"))}
      ${navLink("admin-requests", "i-cal", t("learningrequests"), pendingReqs || "", onTab("requests", "admin-requests"))}
      ${navLink("admin-sessions", "i-clock", "Scheduled sessions", confirmedCount || "", onTab("sessions", "admin-sessions"))}
      ${navLink("admin-messages", "i-chat", "Messaging", unreadMsgs || "", onTab("messages", "admin-messages"))}
      ${navLink("admin-safety", "i-flag", t("safetyreports"), openReports || "", onTab("safety", "admin-safety"))}
      <h5>${t("operations")}</h5>
      ${navLink("admin-data", "i-file", t("audit"), "", onTab("data", "admin-data"))}
      ${navLink("admin-deployment", "i-server", t("deploy"), "", onTab("deploy", "admin-deployment"))}
      ${navLink("admin-dpa", "i-db", t("dpa"), "", onTab("dpa", "admin-dpa"))}
      <h5>${t("publicsurface")}</h5>
      ${navLink("institutions", "i-grid", t("directory"), "", PF_PAGE === "institutions")}`;
  } else {
    nav = `<h5>${t("plan")}</h5>
      ${navLink("dashboard", "i-home", t("dashboard"), "", PF_PAGE === "dashboard")}
      ${navLink("quiz", "i-spark", "Career check", "6q", PF_PAGE === "quiz")}
      ${navLink("institutions", "i-grid", t("institutions"), PF_INST.length, PF_PAGE === "institutions")}
      ${navLink("funding", "i-coins", t("funding"), "", PF_PAGE === "funding")}
      <h5>${t("academics")}</h5>
      ${navLink("onboarding", "i-file", "Grades & subjects", "", PF_PAGE === "onboarding")}
      ${navLink("tracker", "i-target", t("tracker"), String(S.assessments.length), PF_PAGE === "tracker")}
      ${navLink("cluster", "i-cog", t("cluster"), "", PF_PAGE === "cluster")}
      <h5>${t("support")}</h5>
      ${navLink("tutors", "i-users", t("tutors"), String(activeTutors().length), PF_PAGE === "tutors")}
      ${navLink("sessions", "i-cal", "My sessions", myConfirmedCount() || "", PF_PAGE === "sessions")}
      ${navLink("messages", "i-chat", "Messages", myUnreadCount() || "", PF_PAGE === "messages")}`;
  }
  /* No "public homepage" and no second profile row: the brand at the top of the
     column and the picture in the top bar already do both jobs, and every row
     saved is a row that fits on a small screen. */
  document.getElementById("snav").innerHTML = nav;
  const so = document.getElementById("sideSignOut");
  if (so)
    so.addEventListener("click", (e) => {
      e.preventDefault();
      signOut();
    });

  const foot = document.getElementById("sideFoot");
  const footBtn = (act, iconName, label) =>
    `<button type="button" class="foot-link" data-${act} title="${esc(label)}">${ic(iconName, "sm")}<span>${esc(label)}</span></button>`;
  /* One compact row. The cloud/local status used to sit here as a block and
     pushed the last nav item off a small screen — it now lives beside the
     workspace name above, where it costs no vertical space. */
  if (foot)
    foot.innerHTML = SESSION
      ? `<div class="foot-row">${footBtn("safety-centre", "i-shield", t("safetycentre"))}${footBtn("signout", "i-logout", t("signout"))}</div>`
      : `<div class="foot-row"><a href="${urlFor("signin")}" data-nav="signin">${ic("i-lock", "sm")} Sign in</a><a href="${urlFor("signup")}" data-nav="signup">${ic("i-user", "sm")} Create account</a></div>`;

  const crumb = document.getElementById("crumb");
  if (crumb)
    crumb.innerHTML = `${esc(SESSION ? (SESSION.role === "admin" ? "Administrator" : SESSION.role === "tutor" ? "Tutor" : "Student") : "Student")} <span>/ ${esc(CRUMB[PF_PAGE] || "")}</span>`;

  const chip = document.getElementById("userChip");
  if (chip) {
    const nm = SESSION ? SESSION.name : S.profile.name || "Guest";
    chip.innerHTML = `<span style="width:38px;height:38px;border-radius:50%;overflow:hidden;display:grid">${genAvatar(nm, 38)}</span><span class="ut"><b>${esc(nm.split(" ")[0])}</b><small>${esc(SESSION ? (role === "admin" ? "Administrator" : role === "tutor" ? "Tutor" : S.profile.stage || roleLabel()) : "Guest · not saved")}</small></span>`;
    chip.setAttribute("aria-haspopup", "dialog");
    chip.setAttribute("aria-expanded", "false");
    chip.onclick = () => (SESSION && typeof pfOpenProfileCard === "function" ? pfOpenProfileCard() : go("signin"));
  }

  const search = document.getElementById("topSearch");
  if (search) search.style.display = PF_PAGE === "dashboard" || PF_PAGE === "institutions" ? "flex" : "none";

  const mid =
    role === "tutor"
      ? navLink("tspace", "i-chart", "Workspace", "", false)
      : role === "admin"
        ? "" // the console already has its own tab strip
        : navLink("quiz", "i-spark", "My path", "", false);
  const bn = document.getElementById("bottomNav");
  if (bn) {
    const home = role === "tutor" ? "tspace" : role === "admin" ? "admin" : "dashboard";
    const adTabNow = (document.body && document.body.dataset.adtab) || "";
    const bnItems =
      role === "admin"
        ? [
            ["i-home", "Console", "admin"],
            null,
            ["i-cal", "Requests", "admin-requests"],
            ["i-flag", "Safety", "admin-safety"],
            ["i-db", "DPA", "admin-dpa"]
          ]
        : [
            ["i-home", "Home", home],
            null,
            ["i-grid", "Schools", "institutions"],
            ["i-coins", "Funding", "funding"],
            ["i-users", "Tutors", "tutors"]
          ];
    bn.innerHTML = bnItems
      .map((item) =>
        item
          ? navLink(
              item[2],
              item[0],
              item[1],
              "",
              role === "admin" && adTabNow ? adTabNow === AD_PAGE_TAB[item[2]] : PF_PAGE === item[2]
            )
          : mid
      )
      .join("");
  }

  const langBtn = document.getElementById("langBtn");
  if (langBtn) langBtn.textContent = lang() === "en" ? "EN" : "SW";
}

/* ---------- Safety centre (available on every page, from the profile card) ---------- */
function safetySheet() {
  if (typeof openModal !== "function") return;
  const mine = S.reports || [];
  const rule = (icon, tone, title, text) =>
    `<div class="ac-li"><span class="ac-dot ${tone}">${ic(icon)}</span><div class="ac-mid"><b>${esc(title)}</b><span>${esc(text)}</span></div></div>`;
  openModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">
      <span class="ac-dot green" style="width:42px;height:42px;flex-basis:42px;border-radius:12px">${ic("i-shield")}</span>
      <div style="flex:1;min-width:0"><h3 style="font-size:18px">Safety centre</h3><p class="tiny muted">Designed for a learner on a shared phone.</p></div>
      <button class="modal-x" data-close aria-label="Close">${ic("i-x")}</button></div>
    ${typeof safetySignatureHTML === "function" ? `<div style="margin-bottom:10px">${safetySignatureHTML()}</div>` : ""}
    <div class="alert-mock" style="margin-bottom:10px">${ic("i-shield", "sm")} <b>First rule:</b> no phone numbers, social handles or links in tutor requests. If someone asks you to move to WhatsApp before review, report and block them.</div>
    <div class="ac-list">
      ${rule("i-chat", "", "Contact details blocked", "Phones, emails, @handles, WhatsApp, Telegram and links are rejected in request text.")}
      ${rule("i-flag", "rose", "Abusive language blocked", "Swearing, harassment and explicit terms are rejected before saving.")}
      ${rule("i-coins", "amber", "No money before review", "Never send a deposit, M-Pesa or registration fee to a tutor.")}
      ${rule("i-user", "", "Guardian awareness", "Under-18 learners need a guardian to know about the session.")}
      ${rule("i-pin", "sky", "Online or public only", "First sessions are online or in a public venue — never a private home, never alone.")}
      ${rule("i-lock", "green", "Reviewer sees requests first", "The reviewer holds contact details, and blocked tutors cannot be booked.")}
    </div>
    <h4 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:14px 0 4px">Reports you have filed</h4>
    ${
      mine.length
        ? mine
            .map(
              (r) =>
                `<div class="ac-li"><span class="ac-dot rose">${ic("i-flag")}</span><div class="ac-mid"><b>${esc(r.tutor || "Tutor")} · ${esc(r.reason || "reported")}</b><span>Ref ${esc(String(r.id).slice(-5))} · ${esc(r.status || "open")}</span></div></div>`
            )
            .join("")
        : `<div class="ac-empty" style="padding:14px">${ic("i-shield")}<b>No reports yet</b><p>If a tutor makes you uncomfortable, use Report on their profile. You can stay anonymous.</p></div>`
    }
    <div class="alert-violet" style="margin-top:12px">${ic("i-info", "sm")} <b>In an emergency</b> contact your guardian, school or local police. This demo does not connect to emergency services; reports stay on this device.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
      <a class="btn btn-line btn-sm" href="${urlFor("tutors")}">${ic("i-users", "sm")} Find a tutor</a>
      <a class="btn btn-ghost btn-sm" href="${PF_ROOT}legal/privacy.html">${ic("i-scale", "sm")} Privacy notice</a>
      ${SESSION && SESSION.role === "admin" ? `<a class="btn btn-ghost btn-sm" href="${urlFor("admin-safety")}">${ic("i-flag", "sm")} Open the safety queue</a>` : ""}
      <button class="btn btn-dark btn-sm" style="margin-left:auto" data-close>Close</button>
    </div>`);
}
function exportMyData() {
  const data = {
    account: SESSION,
    profile: S.profile,
    grades: S.grades,
    targets: S.targets,
    assessments: S.assessments,
    result: S.result,
    shortlist: S.shortlist,
    bookings: S.bookings,
    reports: S.reports,
    exported: new Date().toISOString()
  };
  saveFile("pathfinder-my-data.json", JSON.stringify(data, null, 2), "application/json");
  toast("Your data was exported as JSON.", "i-download");
}

function refreshShell() {
  renderShell();
  if (typeof renderBell === "function") renderBell();
}
function roleLabel() {
  return SESSION
    ? SESSION.role === "admin"
      ? "Administrator"
      : SESSION.role === "tutor"
        ? "Tutor"
        : "Student"
    : "Student";
}

/* ---------- Sidebar open / closed ---------- */
/* The choice is remembered across pages and reloads (pf-ui-v1). On desktop the
   sidebar becomes a narrow icon rail; on a phone it slides away entirely. */
function sideIsClosed() {
  return document.documentElement.getAttribute("data-side") === "closed";
}
function setSide(closed) {
  pfSetSideState(closed ? "closed" : "open");
  document.getElementById("sidebar") && document.getElementById("sidebar").classList.toggle("collapsed", !!closed);
  const btn = document.getElementById("hambBtn");
  if (btn) {
    btn.setAttribute("aria-expanded", String(!closed));
    btn.setAttribute("aria-label", closed ? "Open the menu" : "Close the menu");
    btn.setAttribute("aria-controls", "sidebar");
  }
  if (closed && window.matchMedia("(max-width:1024px)").matches) closeDrawer();
}
function toggleSide() {
  setSide(!sideIsClosed());
}

/* ---------- Drawer ---------- */
function openDrawer() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sideOverlay").classList.add("show");
  document.body.classList.add("sidebar-open");
}
function closeDrawer() {
  const s = document.getElementById("sidebar"),
    o = document.getElementById("sideOverlay");
  if (s) s.classList.remove("open");
  if (o) o.classList.remove("show");
  document.body.classList.remove("sidebar-open");
}

/* ---------- Public-nav session chip ---------- */
function renderPubRight() {
  const el = document.getElementById("pubRight");
  if (!el) return;
  el.innerHTML = SESSION
    ? `<button class="pnav-user" id="pubUser"><span style="text-align:right"><b>${esc(SESSION.name.split(" ")[0])}</b><small>${esc(roleLabel())}</small></span><span style="width:38px;height:38px;border-radius:50%;overflow:hidden;display:grid">${genAvatar(SESSION.name, 38)}</span></button>`
    : "";
  /* signed-in visitors get the same bell on the public pages */
  if (SESSION && typeof renderBell === "function") renderBell(el);
  const b = document.getElementById("pubUser");
  if (b) {
    b.setAttribute("aria-haspopup", "dialog");
    b.setAttribute("aria-expanded", "false");
    b.setAttribute("aria-controls", "profPop");
    /* the same card as inside the app, so the public pages do not grow a second
       version of "your account" */
    b.addEventListener("click", () => {
      if (typeof pfOpenProfileCard === "function") pfOpenProfileCard();
      else go(SESSION.role === "tutor" ? "tspace" : SESSION.role === "admin" ? "admin" : "dashboard");
    });
  }
}

/* ---------- Wiring ---------- */
document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-nav]");
  if (nav) {
    e.preventDefault();
    if (nav.dataset.short) {
      location.href = urlFor("institutions", { filter: "shortlist" });
      return;
    }
    if (nav.dataset.preset) {
      location.href = urlFor("signup", { role: nav.dataset.preset });
      return;
    }
    go(nav.dataset.nav, nav.dataset.tab ? { tab: nav.dataset.tab } : undefined);
    return;
  }
  const sc = e.target.closest("[data-scroll]");
  if (sc) {
    e.preventDefault();
    const el = document.getElementById(sc.dataset.scroll);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (e.target.closest("[data-account]")) {
    pfOpenProfileCard();
    return;
  }
  if (e.target.closest("[data-safety-centre]")) {
    safetySheet();
    return;
  }
  if (e.target.closest("[data-account-export]")) {
    exportMyData();
    return;
  }
  if (e.target.closest("[data-account-avatar]")) {
    if (typeof openAvatarPicker === "function") openAvatarPicker();
    return;
  }
  if (e.target.closest("[data-signout]")) {
    closeModal();
    signOut();
    return;
  }
  const cl = e.target.closest("[data-close]");
  if (cl) {
    closeModal();
    return;
  }
  const dm = e.target.closest("[data-demo]");
  if (dm) {
    signInDemo(dm.dataset.demo);
    return;
  }
  const tf = e.target.closest("[data-tutor-for]");
  if (tf) {
    S._tutorSubject = tf.dataset.tutorFor;
    save();
    go("tutors");
    return;
  }
  if (typeof requestModal === "function") {
    const req = e.target.closest("[data-req]");
    if (req) {
      requestModal(req.dataset.req);
      return;
    }
    const mt = e.target.closest("[data-msg-tutor]");
    if (mt) {
      const tu = PF_TUTORS.find((x) => x.id === mt.dataset.msgTutor);
      const ex = S.bookings.find((b) => b.tutorId === tu.id && b.mine);
      if (ex) openChat(ex.id, "learner");
      else {
        requestModal(tu.id);
        toast("Pick a slot to start the conversation", "i-info");
      }
      return;
    }
    const rep = e.target.closest("[data-report]");
    if (rep) {
      const tu = PF_TUTORS.find((x) => x.id === rep.dataset.report);
      if (tu) reportModal(tu.id);
    }
  }
});

/* ---------- Boot ---------- */
(function bootShell() {
  injectIcons();
  /* seeded notes come first so the badge is right on the very first paint */
  if (typeof seedNotes === "function") seedNotes();
  renderShell();
  renderPubRight();
  /* the bell is part of the chrome on every page, before any page script runs */
  if (typeof renderBell === "function") renderBell();

  /* the stored choice is applied by core.js before first paint; mirror it here */
  if (document.getElementById("sidebar"))
    document.getElementById("sidebar").classList.toggle("collapsed", sideIsClosed());

  /* the one sidebar control: on a laptop it collapses the column to a rail and
     remembers that choice, on a phone it slides the drawer in and out */
  const hamb = document.getElementById("hambBtn");
  if (hamb) {
    hamb.setAttribute("aria-controls", "sidebar");
    hamb.setAttribute("aria-expanded", String(!sideIsClosed()));
    hamb.setAttribute("aria-label", sideIsClosed() ? "Open the menu" : "Close the menu");
    hamb.addEventListener("click", () => {
      const phone = (function () {
        try {
          return window.matchMedia("(max-width:1024px)").matches;
        } catch (e) {
          return false;
        }
      })();
      if (!phone) {
        toggleSide();
        return;
      }
      const sb = document.getElementById("sidebar");
      if (sb && sb.classList.contains("open")) closeDrawer();
      else openDrawer();
    });
  }
  const closer = document.getElementById("sideClose");
  if (closer) closer.addEventListener("click", closeDrawer);
  const ov = document.getElementById("sideOverlay");
  if (ov) ov.addEventListener("click", closeDrawer);

  /* nothing else opens up until the safety check is signed */
  if (typeof onbGuard === "function") onbGuard();

  const gs = document.getElementById("globalSearch");
  if (gs)
    gs.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const q = gs.value.trim();
      const inst = document.getElementById("instSearch");
      if (inst) {
        inst.value = q;
        renderInst();
      } else location.href = urlFor("institutions", { q });
    });

  const lb = document.getElementById("langBtn");
  if (lb)
    lb.addEventListener("click", () => {
      S.lang = lang() === "en" ? "sw" : "en";
      save();
      renderShell();
    });

  if (
    "serviceWorker" in navigator &&
    (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ) {
    navigator.serviceWorker.register(PF_ROOT + "sw.js").catch(() => {});
  }
  window.addEventListener("offline", () =>
    toast("You are offline — PathFinder keeps working from this device", "i-info")
  );
  window.addEventListener("online", () => toast("Back online", "i-check"));
  if (typeof flushSync === "function") flushSync();
})();
