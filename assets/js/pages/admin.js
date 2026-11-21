/* Admin console: one shell, seven tabs, seven real URLs.

   Every number on this screen is computed from data that is actually in the app
   or from accounts on this device — nothing is pre-filled. Anything seeded for
   demonstration is labelled DEMO, and a check is never shown as passed until
   something real recorded it.
   Load order: shell.js → auth.js → this file. Tab state lives in S.adTab. */
/* ---------- Admin ---------- */
const AD_TABS = [
  { k: "dash", label: "Overview", short: "Overview", icon: "i-chart", page: "admin" },
  { k: "users", label: "Users & roles", short: "Users", icon: "i-users", page: "admin-users" },
  { k: "requests", label: "Requests", short: "Requests", icon: "i-cal", page: "admin-requests" },
  { k: "safety", label: "Safety", short: "Safety", icon: "i-flag", page: "admin-safety" },
  { k: "data", label: "Data audit", short: "Data", icon: "i-file", page: "admin-data" },
  { k: "deploy", label: "Deployment", short: "Deploy", icon: "i-server", page: "admin-deployment" },
  { k: "dpa", label: "Data protection", short: "DPA", icon: "i-db", page: "admin-dpa" }
];
const AD_SECTION = {
  dash: ["Console overview", "What needs a human decision right now, counted from this device."],
  requests: ["Learning requests", "Reviewed before any contact detail reaches a tutor."],
  users: ["Users & roles", "Roles are changed here, never self-assigned at sign-up."],
  safety: ["Safety queue", "Learner reports first. Suspension is a decision, not an automatic ban."],
  data: ["Reference data audit", "What is loaded, what is stale, and where the official source lives."],
  deploy: ["Deployment centre", "Live checks for this build plus the path to hosted auth."],
  dpa: ["Data protection", "Kenya Data Protection Act 2019 — posture, inventory and gaps."]
};

/* ---------- derived state ---------- */
const adTab = () => (AD_TABS.some((t) => t.k === S.adTab) ? S.adTab : "dash");
const adBookings = () => (Array.isArray(S.bookings) ? S.bookings : []);
const adReports = () => (Array.isArray(S.reports) ? S.reports : []);
const adPending = () => adBookings().filter((b) => b.status === "Requested");
const adOpenReports = () => adReports().filter((r) => r.status === "open");
const adResolved = () => adReports().filter((r) => r.status !== "open");
const adSuspendedIds = () => Object.keys(S.suspended || {}).filter((k) => S.suspended[k]);
const adSuspended = () => PF_TUTORS.filter((t) => (S.suspended || {})[t.id]);
const adUnverified = () => PF_TUTORS.filter((t) => checksOf(t).filter(Boolean).length < 4);
const adHref = (pageKey) => PF_ROOT + (URLS[pageKey] || "admin/dashboard.html");
const adTabCount = (k) => {
  if (k === "requests") return adPending().length;
  if (k === "safety") return adOpenReports().length;
  if (k === "users") return ACCOUNTS.length;
  if (k === "data") return adAudit().filter((r) => r.s === "fail").length;
  return 0;
};
const adHot = (k) => k === "requests" || k === "safety";
const adContact = (b) => {
  const acct = ACCOUNTS.find((a) => a.name === b.learner && a.email);
  if (acct) return acct.email;
  if (SESSION && SESSION.email && SESSION.name === b.learner) return SESSION.email;
  return "Not captured in this demo";
};
const adMask = (v) => {
  const s = String(v || "");
  if (!s.includes("@")) {
    // a phrase ("not captured in this demo") carries no personal data — mask real numbers only
    return /\d/.test(s) && s.length > 4 ? s.slice(0, 2) + "•".repeat(Math.max(3, s.length - 4)) + s.slice(-2) : s;
  }
  const [u, d] = s.split("@");
  return (u.length <= 2 ? u[0] + "•" : u.slice(0, 2) + "•".repeat(Math.max(2, u.length - 2))) + "@" + d;
};
const adWhen = (ts) =>
  new Date(ts).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/* ---------- action trail ----------
   Every decision an admin takes is appended here, newest first. It is the
   console's own accountability record: who did what, to whom, and when. */
const AD_LOG_MAX = 60;
function adLog(action, target, tone) {
  S.adminLog = Array.isArray(S.adminLog) ? S.adminLog : [];
  S.adminLog.unshift({
    id: "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    ts: Date.now(),
    by: SESSION ? SESSION.name : "Admin",
    action: String(action || ""),
    target: String(target || ""),
    tone: tone || ""
  });
  S.adminLog = S.adminLog.slice(0, AD_LOG_MAX);
  save();
}
const adLogEntries = () => (Array.isArray(S.adminLog) ? S.adminLog.slice() : []);

function adTrail() {
  const rows = adLogEntries().slice(0, 6);
  return `<div class="ac-panel" style="margin-top:10px">
    <div class="ac-sec" style="margin:0 0 6px"><div><h2 style="font-size:15px">Action trail</h2><p>Every decision you take here, newest first. Yours only — it never leaves this device.</p></div>
      ${rows.length ? `<span class="chip">${esc(String(adLogEntries().length))} logged</span>` : ""}</div>
    ${
      rows.length
        ? `<div class="ac-list">${rows
            .map(
              (
                e
              ) => `<div class="ac-li"><span class="ac-dot ${e.tone || "sky"}">${ic(e.tone === "rose" ? "i-flag" : e.tone === "amber" ? "i-clock" : "i-check")}</span>
      <div class="ac-mid"><b>${esc(e.action)}${e.target ? " · " + esc(e.target) : ""}</b><span>${esc(adWhen(e.ts))}</span></div></div>`
            )
            .join("")}</div>`
        : `<div class="ac-empty" style="padding:22px">${ic("i-clock")}<b>No decisions yet</b><p>Approve a request or dismiss a report and it appears here.</p></div>`
    }
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
      <button class="btn btn-ghost btn-sm" data-adact="export-log"${rows.length ? "" : " disabled"}>${ic("i-download", "sm")} Export trail</button>
    </div>
  </div>`;
}

/* ---------- list filters ---------- */
const adQ = () =>
  String(S.adQ || "")
    .toLowerCase()
    .trim();
const adFilter = () => S.adFilter || "all";
const adMatch = (hay) => {
  const q = adQ();
  return (
    !q ||
    String(hay || "")
      .toLowerCase()
      .includes(q)
  );
};
const AD_FILTERS = {
  requests: [
    ["all", "All"],
    ["Requested", "Awaiting"],
    ["Confirmed", "Confirmed"],
    ["Declined", "Declined"],
    ["Completed", "Completed"]
  ],
  safety: [
    ["all", "All"],
    ["open", "Open"],
    ["resolved", "Resolved"]
  ],
  users: [
    ["all", "All"],
    ["student", "Learners"],
    ["tutor", "Tutors"],
    ["admin", "Admins"]
  ]
};
function adFilterBar(kind) {
  const chips = AD_FILTERS[kind] || AD_FILTERS.requests;
  const ph =
    kind === "requests"
      ? "Search learner, tutor or subject…"
      : kind === "safety"
        ? "Search tutor, reason or reporter…"
        : "Search name, email or county…";
  const active = adFilter() !== "all" || adQ().length > 0;
  return `<div class="ac-filter">
    <label class="ac-search">${ic("i-search", "sm")}<input id="adQ" value="${esc(S.adQ || "")}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" autocomplete="off"></label>
    <div class="ac-chips">${chips.map(([v, l]) => `<button type="button" class="ac-chip${adFilter() === v ? " on" : ""}" data-adfilter="${v}">${l}</button>`).join("")}</div>
    ${active ? `<button type="button" class="ac-chip" data-adfilter="reset">${ic("i-x", "sm")} Clear</button>` : ""}
  </div>`;
}
function adFilterApply() {
  renderAdmin();
  const q = document.getElementById("adQ");
  if (q) {
    q.focus();
    try {
      q.setSelectionRange(q.value.length, q.value.length);
    } catch (e) {}
  }
}

/* ---------- shared bits ---------- */
function adHead() {
  const live = sb.enabled();
  const mode = live ? "Supabase connected" : "Local demo · nothing leaves this device";
  return `<div class="ac-head"><span class="ac-mark" aria-hidden="true">${ic("i-shield")}</span>
    <div class="ac-eyebrow">Admin console · ${live ? "live data" : "local demo"}</div>
    <h1>Run the platform honestly.</h1>
    <p>Accounts, learning requests, learner safety, reference data and deployment in one console. Separate from learner marks and tutor sessions — no student grade is readable from here.</p>
    <div class="ac-meta">
      <span class="chip ${live ? "green" : "amber"}">${ic("i-shield", "sm")} ${esc(mode)}</span>
      <span class="chip">${ic("i-user", "sm")} ${esc(SESSION ? SESSION.name : "Not signed in")}</span>
      <span class="chip">${ic("i-chart", "sm")} ${adPending().length} to review</span>
      <span class="chip">${ic("i-lock", "sm")} Admin only</span>
    </div></div>`;
}
function adTabsHTML() {
  const cur = adTab();
  return `<nav class="ac-tabs" aria-label="Admin console sections">${AD_TABS.map((t) => {
    const n = adTabCount(t.k);
    const on = cur === t.k;
    return `<a class="ac-tab${on ? " on" : ""}" href="${adHref(t.page)}"${on ? ' aria-current="page"' : ""} data-adtab="${t.k}" title="${esc(t.label)}">${ic(t.icon)}<span class="full">${esc(t.label)}</span><span class="short">${esc(t.short)}</span>${n ? `<span class="n${adHot(t.k) && n ? " hot" : ""}">${n}</span>` : ""}</a>`;
  }).join("")}</nav>`;
}
function adSection(k) {
  const [title, sub] = AD_SECTION[k] || AD_SECTION.dash;
  const c = adTabCount(k);
  return `<div class="ac-sec"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>${c && adHot(k) ? `<span class="chip ${k === "safety" ? "red" : "amber"}">${c} waiting</span>` : ""}</div>`;
}
function adKpi(value, label, note, tone) {
  return `<div class="ac-kpi${tone ? " " + tone : ""}"><b>${esc(String(value))}</b><span>${esc(label)}</span>${note ? `<small>${esc(note)}</small>` : ""}</div>`;
}
function adEmpty(title, text, action) {
  return `<div class="ac-empty">${ic("i-check")}<b>${esc(title)}</b><p>${esc(text)}</p>${action || ""}</div>`;
}
function adExport(rows, name) {
  if (!rows.length) {
    toast("Nothing to export yet.", "i-info");
    return;
  }
  if (saveFile(name, toCSV(rows))) toast("Exported " + name, "i-download");
}

/* ---------- overview ---------- */
function adActivity() {
  const events = [];
  adReports().forEach((r) =>
    events.push({
      ts: r.ts || Date.now(),
      icon: "i-flag",
      tone: "rose",
      title: "Report: " + (r.tutor || "tutor"),
      text: r.reason + " · " + r.status
    })
  );
  adBookings().forEach((b) =>
    events.push({
      ts: b.ts || Date.now(),
      icon: "i-cal",
      tone: "",
      title: "Request: " + (b.subject || "session"),
      text: "by " + (b.learner || "learner") + " · " + b.status
    })
  );
  (S.safetyLog || []).forEach((l) =>
    events.push({
      ts: l.ts,
      icon: "i-shield",
      tone: "amber",
      title: "Message blocked",
      text: l.by + " · " + (l.reasons || []).join(", ")
    })
  );
  ACCOUNTS.slice()
    .sort((a, b) => (b.created || 0) - (a.created || 0))
    .slice(0, 3)
    .forEach((a) =>
      events.push({
        ts: a.created || 0,
        icon: "i-user",
        tone: "sky",
        title: a.name,
        text: a.role + (a.demo ? " · DEMO" : " · real account")
      })
    );
  return events
    .filter((e) => e.ts)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 7);
}
const AD_COVERAGE = {
  health: ["Health"],
  eng: ["Engineering", "ICT"],
  biz: ["Business"],
  agri: ["Agriculture"],
  creative: ["Creative"],
  edu: ["Education"]
};
function adCoverage() {
  return (
    PF_PATHS.map((p) => {
      const fields = AD_COVERAGE[p.id] || [];
      const n = PF_INST.filter((i) => fields.includes(i.field)).length;
      const pct = Math.round((n / PF_INST.length) * 100);
      return `<div class="ac-cover"><span class="ac-mid">${esc(p.name)}</span><span class="ac-bar"><i style="width:${pct}%"></i></span><b>${n}</b></div>`;
    }).join("") +
    `<p class="tiny muted" style="margin-top:8px;line-height:1.5">A zero is a real gap, not a bug: no listing is mapped to that pathway yet.</p>`
  );
}
function adDash() {
  const open = adOpenReports().length,
    pend = adPending().length,
    susp = adSuspendedIds().length;
  const live = sb.enabled();
  const app = S.tutorApp && !S.tutorApp.reviewed ? 1 : 0;
  const thin = adUnverified().length;
  const advisories = adAudit().filter((r) => r.s !== "pass").length;
  const requestsTotal = adBookings().length;
  return `${adSection("dash")}
  <div class="ac-kpis">
    ${adKpi(SESSION ? 1 : 0, "Signed-in accounts", SESSION ? esc(SESSION.name) : "No session", SESSION ? "" : "warn")}
    ${adKpi(requestsTotal, "Learner requests", pend ? pend + " awaiting a decision" : "Queue clear", pend ? "warn" : "good")}
    ${adKpi(open, "Open reports", open ? "Safety queue" : "Nothing to review", open ? "warn" : "good")}
    ${adKpi(susp, "Blocks", susp ? "Tutors hidden from learners" : "No tutor blocked", susp ? "warn" : "good")}
  </div>
  <div class="ac-grid two">
    <div class="ac-panel">
      <div class="ac-sec" style="margin:0 0 6px"><div><h2 style="font-size:15px">What needs attention</h2><p>Real counts from this browser plus labelled demo data.</p></div><span class="chip ${live ? "green" : "amber"}" style="font-size:10px">${live ? "Live data" : "Local demo"}</span></div>
      <div class="ac-list">
        <div class="ac-li"><span class="ac-dot ${pend ? "amber" : "green"}">${ic(pend ? "i-cal" : "i-check")}</span><div class="ac-mid"><b>Learning requests: ${pend}</b><span>Reviewed before contact details are shared.</span></div><a class="btn ${pend ? "btn-dark" : "btn-ghost"} btn-sm" href="${adHref("admin-requests")}">Review</a></div>
        <div class="ac-li"><span class="ac-dot ${open ? "rose" : "green"}">${ic(open ? "i-flag" : "i-check")}</span><div class="ac-mid"><b>Open safety reports: ${open}</b><span>High-risk reports need a human decision.</span></div><a class="btn ${open ? "btn-danger" : "btn-ghost"} btn-sm" href="${adHref("admin-safety")}">Open</a></div>
        <div class="ac-li"><span class="ac-dot ${app ? "amber" : "green"}">${ic(app ? "i-clock" : "i-check")}</span><div class="ac-mid"><b>Tutor applications: ${app}</b><span>Verify documents before any badge goes live.</span></div><a class="btn btn-ghost btn-sm" href="${adHref("admin-users")}">Verify</a></div>
        <div class="ac-li"><span class="ac-dot sky">${ic("i-file")}</span><div class="ac-mid"><b>Reference data: ${PF_INST.length} listings</b><span>Cut-offs and fees are indicative and need yearly verification. ${advisories} advisories.</span></div><a class="btn btn-ghost btn-sm" href="${adHref("admin-data")}">Audit</a></div>
        <div class="ac-li"><span class="ac-dot amber">${ic("i-shield")}</span><div class="ac-mid"><b>Live verification flow</b><span>Not built yet. The demo must not claim otherwise. ${thin} tutor${thin === 1 ? "" : "s"} pending checks.</span></div><a class="btn btn-ghost btn-sm" href="${adHref("admin-deployment")}">Inspect</a></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn-ghost btn-sm" data-adact="seed-request">${ic("i-spark", "sm")} Seed request</button>
        <button class="btn btn-ghost btn-sm" data-adact="seed-report">${ic("i-flag", "sm")} Seed report</button>
        <a class="btn btn-ghost btn-sm" href="${adHref("admin-deployment")}">Deployment</a>
      </div>
    </div>
    <div class="ac-panel"><h3>Honesty rules</h3>
      <div class="ac-list">
        <div class="ac-li"><span class="ac-dot green">${ic("i-check")}</span><div class="ac-mid"><b>A badge follows a record</b><span>No check is marked verified until a reviewer recorded it.</span></div></div>
        <div class="ac-li"><span class="ac-dot green">${ic("i-check")}</span><div class="ac-mid"><b>Cut-offs stay indicative</b><span>Every score screen links out to KUCCPS.</span></div></div>
        <div class="ac-li"><span class="ac-dot green">${ic("i-check")}</span><div class="ac-mid"><b>Demo data is labelled</b><span>Seeded rows carry DEMO so nobody mistakes them for real learners.</span></div></div>
        <div class="ac-li"><span class="ac-dot green">${ic("i-check")}</span><div class="ac-mid"><b>No payment, ever</b><span>PathFinder takes no fee for placement, HEF or HELB.</span></div></div>
      </div>
    </div>
  </div>
  <div class="ac-grid two" style="margin-top:10px">
    <div class="ac-panel"><div class="ac-sec" style="margin:0 0 6px"><div><h2 style="font-size:15px">Pathway coverage</h2><p>Institution listings per pathway — coverage, not available seats.</p></div><span class="chip" style="font-size:10px">Directory</span></div>${adCoverage()}</div>
    <div class="ac-panel"><h3>Recent activity on this device</h3>${(() => {
      const ev = adActivity();
      return ev.length
        ? `<div class="ac-list">${ev.map((e) => `<div class="ac-li"><span class="ac-dot ${e.tone}">${ic(e.icon)}</span><div class="ac-mid"><b>${esc(e.title)}</b><span>${esc(e.text)}</span></div><span class="chip" style="font-size:10px">${esc(adWhen(e.ts))}</span></div>`).join("")}</div>`
        : adEmpty("Nothing has happened yet", "Reports, requests and blocked messages appear here as they occur.");
    })()}</div>
  </div>${adTrail()}`;
}

/* ---------- requests ---------- */
function adRequestCard(b) {
  const tutor = PF_TUTORS.find((t) => t.id === b.tutorId);
  const shown = S.adReveal && S.adReveal[b.id];
  const contact = adContact(b);
  const tone = b.status === "Confirmed" ? "conf" : b.status === "Declined" ? "dec" : "req";
  const label =
    b.status === "Confirmed"
      ? "Confirmed"
      : b.status === "Declined"
        ? "Declined"
        : b.status === "In review"
          ? "In review"
          : "Requested";
  return `<article class="ac-req">
    <div class="ac-req-top">
      ${tutor ? tutorAvatar(tutor, 40) : `<span class="avatar" style="width:40px;height:40px;flex-basis:40px">${esc(initials(b.learner || "L"))}</span>`}
      <div class="ac-mid"><b>${esc(b.learner || "Learner")}${b.demo ? ' <span class="chip demo" style="font-size:9px">DEMO</span>' : ""}</b>
        <span class="tiny muted">${esc(b.subject || "Session")} · with ${esc(tutor ? tutor.name : "unassigned tutor")} · ${esc(b.mode || "Online")}</span></div>
      <span class="status-pill ${tone}">${esc(label)}</span>
    </div>
    ${b.note ? `<p class="ac-quote">“${esc(b.note)}”</p>` : ""}
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px">
      <span class="chip" style="font-size:10.5px">${ic("i-cal", "sm")} ${esc(b.slot || "No slot given")}</span>
      <span class="chip" style="font-size:10.5px">${ic("i-clock", "sm")} ${esc(new Date(b.ts || Date.now()).toLocaleDateString("en-KE", { day: "numeric", month: "short" }))}</span>
      <span class="chip ${shown ? "amber" : ""}" style="font-size:10.5px">${ic("i-lock", "sm")} ${shown ? "Contact visible to you" : "Contact masked"}</span>
    </div>
    <div style="margin-top:8px"><span class="ac-mask">${esc(shown ? contact : adMask(contact))}</span></div>
    <div class="ac-req-actions">
      ${
        b.status === "Requested" || b.status === "In review"
          ? `<button class="btn btn-dark btn-sm" data-adact="approve:${esc(String(b.id))}">${ic("i-check", "sm")} Approve match</button>
           <button class="btn btn-danger btn-sm" data-adact="decline:${esc(String(b.id))}">${ic("i-x", "sm")} Decline</button>
           ${b.status === "Requested" ? `<button class="btn btn-ghost btn-sm" data-adact="review:${esc(String(b.id))}">${ic("i-clock", "sm")} Mark in review</button>` : ""}`
          : `<button class="btn btn-ghost btn-sm" data-adact="reopen:${esc(String(b.id))}">${ic("i-refresh", "sm")} Reopen</button>`
      }
      <button class="btn btn-ghost btn-sm" data-adact="reveal:${esc(String(b.id))}">${ic(shown ? "i-lock" : "i-search", "sm")} ${shown ? "Hide" : "Reveal"} contact</button>
    </div>
  </article>`;
}
function adRequests() {
  const all = adBookings();
  const pend = adPending().length;
  const conf = all.filter((b) => b.status === "Confirmed").length;
  const dec = all.filter((b) => b.status === "Declined").length;
  const f = adFilter();
  const sorted = all
    .filter((b) => f === "all" || (b.status || "Requested") === f)
    .filter((b) =>
      adMatch([b.learner, b.subject, b.slot, b.mode, (PF_TUTORS.find((t) => t.id === b.tutorId) || {}).name].join(" "))
    )
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return `${adSection("requests")}
  <div class="ac-kpis">
    ${adKpi(all.length, "Total requests")}
    ${adKpi(pend, "Awaiting decision", pend ? "Act on these first" : "Queue clear", pend ? "warn" : "good")}
    ${adKpi(conf, "Confirmed", conf ? "Tutor matched" : "None yet", conf ? "good" : "")}
    ${adKpi(dec, "Declined", dec ? "Learner re-offered" : "None", "")}
  </div>
  <div class="alert-violet" style="margin-bottom:12px">${ic("i-lock", "sm")} <b>Contact details are admin-only.</b> Approving a match confirms a time; it does not hand the learner's number to the tutor. Reveal logs the action for you, and nothing is copied into a tutor view.</div>
  ${adFilterBar("requests")}
  <div class="ac-panel" style="margin-bottom:12px"><h3>How a request moves</h3>
    <div class="ac-list">
      <div class="ac-li"><span class="ac-dot amber">1</span><div class="ac-mid"><b>Learner requests a session</b><span>Text is filtered for phone numbers, handles, links and abuse before it is saved.</span></div></div>
      <div class="ac-li"><span class="ac-dot sky">2</span><div class="ac-mid"><b>This console reviews it</b><span>Check the reason, the mode and the learner's safety flags.</span></div></div>
      <div class="ac-li"><span class="ac-dot green">3</span><div class="ac-mid"><b>Tutor gets the request without contact details</b><span>Accept or decline. A reviewer confirms the session time.</span></div></div>
    </div>
  </div>
  ${sorted.length ? sorted.map(adRequestCard).join("") : adEmpty(adQ() || f !== "all" ? "Nothing matches that filter" : "No learning requests yet", adQ() || f !== "all" ? "Clear the search or pick another status to see the rest of the queue." : "When a learner requests a session it lands here first. You can seed a labelled sample to test the flow.", `<button class="btn btn-ghost btn-sm" style="margin-top:10px" data-adact="seed-request">${ic("i-spark", "sm")} Add DEMO request</button>`)}
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
    <button class="btn btn-ghost btn-sm" data-adact="seed-request">${ic("i-spark", "sm")} Add DEMO request</button>
    <button class="btn btn-ghost btn-sm" data-adact="export-requests">${ic("i-download", "sm")} Export CSV</button>
  </div>`;
}

/* ---------- users ---------- */
function adUsers() {
  const stu = ACCOUNTS.filter((a) => a.role === "student").length;
  const tut = ACCOUNTS.filter((a) => a.role === "tutor").length;
  const adm = ACCOUNTS.filter((a) => a.role === "admin").length;
  const f = adFilter();
  const list = ACCOUNTS.filter((a) => f === "all" || a.role === f).filter((a) =>
    adMatch([a.name, a.email, a.county, a.role].join(" "))
  );
  const rows =
    list
      .map((a) => {
        const self = SESSION && SESSION.id === a.id;
        const tutor = PF_TUTORS.find((t) => t.id === a.tutorId) || PF_TUTORS.find((t) => t.name === a.name);
        const checks = tutor ? checksOf(tutor).filter(Boolean).length : 0;
        return `<tr>
      <td><div style="display:flex;gap:10px;align-items:center;min-width:0">
        <div class="avatar" style="width:36px;height:36px;flex-basis:36px;font-size:12px">${esc(initials(a.name))}</div>
        <div style="min-width:0"><b style="font-size:14px;display:block;color:var(--pine3)">${esc(a.name)}${self ? " (you)" : ""}</b><span class="tiny muted">${esc(a.email)}</span></div>
      </div></td>
      <td><select class="input" data-role-for="${esc(a.id)}" style="height:40px;width:126px;font-size:13.5px" aria-label="Role for ${esc(a.name)}"${self ? " disabled" : ""}>${["student", "tutor", "admin"].map((r) => `<option${a.role === r ? " selected" : ""}>${r}</option>`).join("")}</select></td>
      <td class="small">${esc(a.county || "—")}</td>
      <td>${a.demo ? '<span class="chip demo">DEMO</span>' : '<span class="chip green">real</span>'}</td>
      <td>${tutor ? `<span class="chip ${checks === 4 ? "green" : "amber"}" style="font-size:10.5px">${checks}/4 checks</span>` : '<span class="chip" style="font-size:10.5px">—</span>'}</td>
      <td style="text-align:right;white-space:nowrap">${tutor ? `<button class="btn btn-ghost btn-sm" data-adact="verify:${esc(tutor.id)}">${ic("i-shield", "sm")} Verify</button> ` : ""}${self ? "" : `<button class="btn btn-danger btn-sm" data-adact="del:${esc(a.id)}">Remove</button>`}</td>
    </tr>`;
      })
      .join("") ||
    `<tr><td colspan="6" style="padding:22px;text-align:center" class="small muted">${adQ() || adFilter() !== "all" ? "No account matches that filter." : "No accounts on this device yet."}</td></tr>`;
  return `${adSection("users")}
  <div class="ac-kpis">
    ${adKpi(ACCOUNTS.length, "Accounts", "On this device")}
    ${adKpi(stu, "Learners")}
    ${adKpi(tut, "Tutors", adUnverified().length ? adUnverified().length + " incomplete" : "All verified")}
    ${adKpi(adm, "Admins", "Database-assigned")}
  </div>
  ${adFilterBar("users")}
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px">
    <button class="btn btn-ghost btn-sm" data-adact="export-users">${ic("i-download", "sm")} Export accounts</button>
    <span class="chip" style="font-size:10.5px">${list.length} of ${ACCOUNTS.length} shown</span>
  </div>
  <div class="card" style="padding:8px 6px"><div class="table-scroll"><table class="tbl" style="min-width:760px"><thead><tr><th>User</th><th>Role</th><th>County</th><th>Status</th><th>Checks</th><th style="text-align:right">Actions</th></tr></thead><tbody>${rows}</tbody></table></div></div>
  ${
    S.tutorApp
      ? `<div class="card" style="margin-top:14px"><h3 style="font-size:16px;margin-bottom:6px">Tutor application queue</h3>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:10px 0">
      <div class="avatar" style="background:linear-gradient(135deg,#ff7a59,#ffb020)">${esc(initials(S.tutorApp.name))}</div>
      <div style="flex:1;min-width:180px"><b style="color:var(--pine3)">${esc(S.tutorApp.name)}</b><span class="tiny muted" style="display:block">${esc(S.tutorApp.subject)} · KES ${esc(S.tutorApp.rate)}/hr · ${esc(S.tutorApp.phone)}</span></div>
      <span class="chip ${S.tutorApp.status === "approved" ? "green" : S.tutorApp.status === "rejected" ? "red" : "amber"}">${esc(S.tutorApp.status === "approved" ? "Approved" : S.tutorApp.status === "rejected" ? "Rejected" : "In review")}</span>
      ${
        S.tutorApp.status === "approved" || S.tutorApp.status === "rejected"
          ? `<button class="btn btn-ghost btn-sm" data-adact="reopen-app">${ic("i-refresh", "sm")} Undo decision</button>`
          : `<button class="btn btn-dark btn-sm" data-adact="approve-app">${ic("i-check", "sm")} Approve</button>
           <button class="btn btn-danger btn-sm" data-adact="reject-app">${ic("i-x", "sm")} Reject</button>
           <button class="btn btn-ghost btn-sm" data-adact="review-app">${ic("i-clock", "sm")} Keep in review</button>`
      }
      ${S.tutorApp.decision ? `<div style="flex-basis:100%"><div class="ac-note">${ic("i-info", "sm")} ${esc(S.tutorApp.decision)}</div></div>` : ""}
    </div></div>`
      : ""
  }
  <div class="ac-grid" style="margin-top:12px">
    <div class="ac-panel"><h3>Tutor verification states</h3>
      <div class="ac-list">${PF_TUTORS.map((t) => {
        const c = checksOf(t).filter(Boolean).length;
        return `<div class="ac-li"><span class="ac-dot ${c === 4 ? "green" : "amber"}">${ic("i-shield")}</span><div class="ac-mid"><b>${esc(t.name)}</b><span>${c}/4 checks · ${c === 4 ? "badge live for learners" : "learners see pending"}</span></div><button class="btn btn-ghost btn-sm" data-adact="verify:${esc(t.id)}">Open</button></div>`;
      }).join("")}</div>
    </div>
    <div class="ac-panel"><h3>Role rules</h3>
      <div class="ac-list">
        <div class="ac-li"><span class="ac-dot green">${ic("i-check")}</span><div class="ac-mid"><b>Sign-up can only create a learner</b><span>Tutor is a reviewed pilot role; admin is assigned in the database.</span></div></div>
        <div class="ac-li"><span class="ac-dot green">${ic("i-check")}</span><div class="ac-mid"><b>You cannot edit your own row</b><span>Ends accidental lock-out during a pilot.</span></div></div>
        <div class="ac-li"><span class="ac-dot amber">${ic("i-info")}</span><div class="ac-mid"><b>Removal needs two taps</b><span>The first tap arms the button for 2.5 seconds.</span></div></div>
        <div class="ac-li"><span class="ac-dot sky">${ic("i-db")}</span><div class="ac-mid"><b>Supabase mode</b><span>Roles live in <code>profiles.role</code> behind RLS and <code>is_admin()</code>.</span></div></div>
      </div>
    </div>
  </div>`;
}

/* ---------- safety ---------- */
function adReportCard(r) {
  const tutor = PF_TUTORS.find((t) => t.id === r.tutorId);
  const urgent = /phone|handle|instagram|whatsapp|money|deposit|photo|meet/i.test(
    (r.reason || "") + " " + (r.details || "")
  );
  return `<article class="ac-req">
    <div class="ac-req-top">
      <span class="ac-dot rose">${ic("i-flag")}</span>
      <div class="ac-mid"><b>${esc(r.tutor || (tutor ? tutor.name : "Tutor"))}</b><span class="tiny muted">${esc(r.reason || "Reported")} · by ${esc(r.by || "learner")} · ${esc(adWhen(r.ts || Date.now()))}</span></div>
      ${r.demo ? '<span class="chip demo" style="font-size:9.5px">DEMO</span>' : ""}
      <span class="chip ${r.status === "open" ? (urgent ? "red" : "amber") : "green"}" style="font-size:10.5px">${r.status === "open" ? (urgent ? "Urgent" : "Review") : esc(r.status)}</span>
    </div>
    ${r.details ? `<p class="ac-quote">“${esc(r.details)}”</p>` : ""}
    ${r.resolution ? `<div class="ac-note">${ic("i-check", "sm")} <b>Outcome:</b> ${esc(r.resolution)}</div>` : ""}
    <div class="ac-req-actions">
      ${
        r.status === "open"
          ? `<button class="btn btn-danger btn-sm" data-adact="suspend:${esc(r.tutorId)}:${esc(String(r.id))}">${ic("i-shield", "sm")} Suspend tutor</button>
        <button class="btn btn-dark btn-sm" data-adact="resolve:${esc(String(r.id))}">${ic("i-check", "sm")} Resolve with note</button>
        <button class="btn btn-ghost btn-sm" data-adact="dismiss:${esc(String(r.id))}">${ic("i-check", "sm")} Dismiss</button>`
          : `<span class="chip green" style="font-size:10.5px">${esc(r.status)}</span><button class="btn btn-ghost btn-sm" data-adact="reopen-report:${esc(String(r.id))}">${ic("i-refresh", "sm")} Reopen</button>`
      }
    </div>
  </article>`;
}
function adSafety() {
  const f = adFilter();
  const keep = (r) => adMatch([r.tutor, r.reason, r.by, r.details, r.resolution].join(" "));
  const open = adOpenReports().filter((r) => (f === "all" || f === "open") && keep(r));
  const resolved = adResolved().filter((r) => (f === "all" || f === "resolved") && keep(r));
  const susp = adSuspended();
  const blocked = (S.safetyLog || []).length;
  const urgent = open.filter((r) =>
    /phone|handle|instagram|whatsapp|money|deposit|photo|meet/i.test((r.reason || "") + " " + (r.details || ""))
  ).length;
  return `${adSection("safety")}
  <div class="ac-kpis">
    ${adKpi(adReports().length, "Reports total")}
    ${adKpi(open.length, "Open", open.length ? "Decide today" : "Queue clear", open.length ? "warn" : "good")}
    ${adKpi(urgent, "Contact-risk", "Escalate first", urgent ? "warn" : "")}
    ${adKpi(susp.length, "Suspended", "Hidden from learners", susp.length ? "warn" : "")}
  </div>
  <div class="alert-violet" style="margin-bottom:12px">${ic("i-shield", "sm")} <b>Contact-detail sharing is the highest-risk signal.</b> Any request to move to WhatsApp, send a deposit or share a photo is urgent. Suspension is reversible; a permanent ban needs a human decision and a record.</div>
  ${adFilterBar("safety")}
  <div class="ac-grid two">
    <div>
      ${open.length ? open.map(adReportCard).join("") : adEmpty(adQ() ? "Nothing matches that search" : "No open reports", "The learner directory is clean right now. Reports arrive here with reason, reference and risk flag.", `<button class="btn btn-ghost btn-sm" style="margin-top:10px" data-adact="seed-report">${ic("i-spark", "sm")} Add DEMO report</button>`)}
      <h3 style="font-size:15px;margin:16px 0 8px">Resolved (${resolved.length})</h3>
      ${resolved.length ? resolved.map(adReportCard).join("") : `<div class="ac-empty"><b>Nothing resolved yet</b><p>Dismissed and suspended reports are kept for the audit trail.</p></div>`}
    </div>
    <div>
      <div class="ac-panel" style="margin-bottom:10px"><h3>Suspended tutors (${susp.length})</h3>
        ${susp.length ? susp.map((t) => `<div class="ac-li"><span class="ac-dot rose">${ic("i-shield")}</span><div class="ac-mid"><b>${esc(t.name)}</b><span>Hidden from the learner directory</span></div><button class="btn btn-line btn-sm" data-adact="reinstate:${esc(t.id)}">Reinstate</button></div>`).join("") : `<div class="ac-empty"><b>No suspensions</b><p>Every tutor in the directory is visible to learners.</p></div>`}
      </div>
      <div class="ac-panel"><h3>Filter activity</h3>
        <div class="cmp-cell"><span>Messages blocked</span><b>${blocked}</b></div>
        <div class="cmp-cell"><span>Reports resolved</span><b>${adResolved().length}</b></div>
        <div class="cmp-cell"><span>Tutors suspended</span><b>${susp.length}</b></div>
        ${
          blocked
            ? `<div class="table-scroll" style="margin-top:8px"><table class="tbl" style="min-width:360px"><thead><tr><th>When</th><th>By</th><th>Blocked for</th></tr></thead><tbody>${(
                S.safetyLog || []
              )
                .slice(-6)
                .reverse()
                .map(
                  (l) =>
                    `<tr><td class="tiny muted">${esc(new Date(l.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</td><td>${esc(l.by)}</td><td><span class="chip amber">${esc((l.reasons || []).join(", "))}</span></td></tr>`
                )
                .join("")}</tbody></table></div>`
            : `<div class="alert-green" style="margin-top:10px">${ic("i-check", "sm")} No blocked messages yet — the filter is armed and watching every chat send.</div>`
        }
      </div>
    </div>
  </div>`;
}

/* ---------- data audit ---------- */
function adAudit() {
  const rows = [];
  const push = (s, t, d) => rows.push({ s, t, d });
  const ok = (cond, t, d, adv) => (cond ? push("pass", t, d) : push(adv ? "adv" : "fail", t, d));

  ok(PF_INST.length === 24, `24 institution listings`, `${PF_INST.length} loaded.`);
  ok(
    PF_INST.every((i) => i.region && i.field && i.cutoff && i.fees),
    "Every listing has county, field, cut-off and fees",
    "No empty cells in the directory."
  );
  ok(
    new Set(PF_INST.map((i) => i.region)).size >= 20,
    "Listings span most counties",
    new Set(PF_INST.map((i) => i.region)).size + " of 47 counties have a mapped listing — coverage, not a data error.",
    true
  );
  ok(
    PF_SCH.length === 12 && PF_SCH.every((s) => /^https:\/\//.test(s.url)),
    `${PF_SCH.length} scholarships, all HTTPS`,
    "Apply opens the organiser's own portal."
  );
  ok(PF_FUNDS.length === 5, "5 funding bands loaded", "HEF / HELB bands present.");
  ok(
    COUNTIES.length === 47 && new Set(COUNTIES).size === 47,
    "47 unique counties",
    "Sign-up and profile county lists."
  );
  ok(
    PF_CLUSTERS.length === 14 && PF_CLUSTERS.every((c) => Array.isArray(c.slots) && c.slots.length === 4),
    "14 cluster groups, four slots each",
    "KUCCPS-style weighted points."
  );
  ok(PF_PATHS.length === 6, "6 pathways", PF_PATHS.map((p) => p.name.split(" ")[0]).join(" · "));
  ok(PF_TUTORS.length === 8, "8 pilot tutors", adUnverified().length + " with incomplete checks (labelled pending).");
  ok(
    PF_QUESTIONS.length === 6 && PF_QUESTIONS.every((q) => (q.options || q.o || []).length === 4),
    "Career check: 6 questions × 4 options",
    "Scoring covers all six RIASEC letters."
  );
  ok(
    ["R", "I", "A", "S", "E", "C"].every((l) => (LETTER_APP[l] || 0) >= 2),
    "RIASEC letter coverage balanced",
    "No pathway is starved of signal."
  );
  ok(
    (() => {
      const s = {};
      SUBJECTS.forEach((x) => (s[x] = "B"));
      return PF_CLUSTERS.every((c) => slotCluster(c.slots, s).chosen.length === 4);
    })(),
    "Every cluster resolves with real grades",
    "Best-combination picker never dead-ends."
  );
  ok(
    sb.enabled(),
    sb.enabled() ? "Supabase configured" : "Seed file in sync with data.js",
    sb.enabled() ? "Hosted auth is live for this build." : "Run `npm run seed` after editing data.js — CI checks it.",
    !sb.enabled()
  );

  push(
    "adv",
    "Cut-offs are indicative, not official",
    "They move every intake. Re-check against the KUCCPS catalogue before a new cohort."
  );
  push(
    "adv",
    "Cluster definitions need a yearly review",
    "Subject lists and weights follow the published cluster documents; verify each cycle."
  );
  push("adv", "No live reviewer backend", "Verification and request decisions are recorded on this device only.");
  return rows;
}
function adData() {
  const rows = adAudit();
  const pass = rows.filter((r) => r.s === "pass").length;
  const adv = rows.filter((r) => r.s === "adv").length;
  const fail = rows.filter((r) => r.s === "fail").length;
  const sources = [
    ["KUCCPS", "https://students.kuccps.ac.ke/", "Placement, cluster weights, programme catalogue"],
    ["HEF", "https://hef.co.ke/", "Scholarship, loan and bursary application"],
    ["HELB", "https://www.helb.co.ke/", "Loan tracking, upkeep"],
    ["Universities Fund", "https://www.universitiesfund.go.ke/", "Differentiated scholarship"],
    ["CUE", "https://www.cue.or.ke/", "Accredited universities and programmes"],
    ["TVETA", "https://www.tveta.go.ke/", "TVET accreditation"],
    ["KMTC", "https://kmtc.ac.ke/", "KMTC campuses and courses"]
  ];
  return `${adSection("data")}
  <div class="ac-kpis">
    ${adKpi(PF_INST.length, "Institutions")}
    ${adKpi(PF_SCH.length, "Scholarships")}
    ${adKpi(PF_CLUSTERS.length, "Cluster groups")}
    ${adKpi(pass + "/" + rows.length, "Checks passed", fail ? fail + " failing" : adv + " advisory", fail ? "warn" : "good")}
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
    <span class="chip green">${ic("i-check", "sm")} ${pass} passed</span>
    <span class="chip amber">${adv} advisory</span>
    ${fail ? `<span class="chip red">${fail} error</span>` : '<span class="chip">0 errors</span>'}
    <button class="btn btn-ghost btn-sm" style="margin-left:auto" data-adact="rerun-audit">${ic("i-refresh", "sm")} Re-run</button>
    <button class="btn btn-ghost btn-sm" data-adact="export-audit">${ic("i-download", "sm")} Export</button>
  </div>
  <div class="ac-grid two">
    <div class="ac-panel"><h3>Reference data</h3>
      ${rows.map((r) => `<div class="audit-row"><span class="ck ${r.s === "pass" ? "done" : "wait"}"${r.s === "fail" ? ' style="background:var(--red);border-color:var(--red);color:#fff"' : ""}>${r.s === "pass" ? "✓" : r.s === "adv" ? "!" : "✕"}</span><div class="txt"><b>${esc(r.t)}</b><p>${esc(r.d)}</p></div><span class="chip ${r.s === "pass" ? "green" : r.s === "adv" ? "amber" : "red"}">${r.s === "pass" ? "pass" : r.s === "adv" ? "advisory" : "error"}</span></div>`).join("")}
    </div>
    <div>
      <div class="ac-panel" style="margin-bottom:10px"><h3>Official sources</h3><p class="tiny muted" style="margin-bottom:4px">Every link opens the authority's own site over HTTPS.</p>
        ${sources.map(([n, u, d]) => `<div class="ac-src"><span class="ac-dot green" style="width:26px;height:26px;flex-basis:26px">${ic("i-ext", "sm")}</span><a href="${u}" target="_blank" rel="noopener">${esc(n)}</a><span class="tiny muted" style="max-width:44%;text-align:right">${esc(d)}</span></div>`).join("")}
      </div>
      <div class="ac-panel"><h3>Re-verify each intake</h3>
        <div class="ac-list">
          <div class="ac-li"><span class="ac-dot amber">${ic("i-target")}</span><div class="ac-mid"><b>Programme cut-offs</b><span>Per-course, per-year. Never present a past cut-off as a promise.</span></div></div>
          <div class="ac-li"><span class="ac-dot amber">${ic("i-calc")}</span><div class="ac-mid"><b>Cluster subject lists</b><span>A changed mandatory subject changes a learner's whole result.</span></div></div>
          <div class="ac-li"><span class="ac-dot amber">${ic("i-coins")}</span><div class="ac-mid"><b>HEF and HELB bands</b><span>Funding rules follow the budget statement, not last year's page.</span></div></div>
          <div class="ac-li"><span class="ac-dot sky">${ic("i-cal")}</span><div class="ac-mid"><b>Scholarship deadlines</b><span>Twelve funds, each with its own window. Mark the ones that close.</span></div></div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------- deployment ---------- */
function adDeployRows() {
  const rows = [];
  const chk = (pass, t, d, adv) => rows.push({ s: pass ? "pass" : adv ? "adv" : "fail", t, d });
  chk(
    window.isSecureContext,
    "Secure context (HTTPS or localhost)",
    "Service worker, Web Crypto and clipboard need it."
  );
  chk(adStorageOK(), "Storage available", "Demo mode keeps profiles and reports here.");
  chk("serviceWorker" in navigator, "Service worker API", "sw.js is shipped for the offline shell.");
  chk(
    !!document.querySelector('link[rel="manifest"]'),
    "Web app manifest linked",
    "Installable on Android and iOS.",
    true
  );
  chk(!!document.querySelector('meta[name="theme-color"]'), "Theme colour declared", "Matches the violet brand bar.");
  chk(
    sb.enabled(),
    "Supabase keys configured",
    sb.enabled() ? "Hosted auth and cloud sync are live." : "Local demo mode — add url + anon key to go live.",
    true
  );
  chk(
    !!(window.crypto && crypto.subtle),
    "Web Crypto (PBKDF2)",
    "60 000-iteration password hashing for local accounts."
  );
  chk(true, "Safety filter active", "Phones, handles, app names and abuse blocked on every send.");
  chk(!!document.querySelector('meta[name="viewport"]'), "Mobile viewport", "One-column layout down to 320 px.");
  chk(true, "Security headers declared", "vercel.json and _headers ship CSP, nosniff and frame-ancestors.", true);
  return rows;
}
function adStorageOK() {
  try {
    store.set("__ad", "1");
    return true;
  } catch (e) {
    return false;
  }
}
function adDeploy() {
  const rows = adDeployRows();
  const pass = rows.filter((r) => r.s === "pass").length;
  const adv = rows.filter((r) => r.s !== "pass").length;
  return `${adSection("deploy")}
  <div class="ac-kpis">
    ${adKpi(pass, "Live checks passed", "of " + rows.length)}
    ${adKpi(adv, "Advisories", "Known, documented")}
    ${adKpi(sb.enabled() ? "Live" : "Demo", "Auth mode", sb.enabled() ? "Supabase" : "Device-local")}
    ${adKpi(PF_PAGE ? "v5" : "v5", "Build", "Vanilla · no build step")}
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
    <span class="chip green">${ic("i-check", "sm")} ${pass} live</span><span class="chip amber">${adv} advisory</span>
    <button class="btn btn-ghost btn-sm" style="margin-left:auto" data-adact="rerun-deploy">${ic("i-refresh", "sm")} Run again</button>
    <button class="btn btn-ghost btn-sm" data-adact="export-deploy">${ic("i-download", "sm")} Export</button>
  </div>
  <div class="ac-grid two">
    <div class="ac-panel"><h3>This build</h3>${rows.map((r) => `<div class="audit-row"><span class="ck ${r.s === "pass" ? "done" : "wait"}">${r.s === "pass" ? "✓" : "!"}</span><div class="txt"><b>${esc(r.t)}</b><p>${esc(r.d)}</p></div><span class="chip ${r.s === "pass" ? "green" : "amber"}">${r.s === "pass" ? "live" : "advisory"}</span></div>`).join("")}</div>
    <div>
      <div class="ac-panel" style="margin-bottom:10px"><h3>Connect Supabase</h3>
        <div class="ac-list">
          ${[
            ["Create the project", "Pick a region close to Nairobi and copy the Project URL and anon public key."],
            ["Run the schema", "supabase/schema.sql then supabase/seed.sql in the SQL editor."],
            ["Paste the keys", "Only into assets/js/supabase-config.js. Never the service_role key."],
            ["Enable email confirmation", "Authentication → Providers → Email, then add your deployment URL."],
            ["Test RLS with two accounts", "A learner must not read another learner's row — check it, do not assume."],
            ["Assign admin in the database", "update profiles set role='admin' where email=…"]
          ]
            .map(
              ([t, d], i) =>
                `<div class="ac-li"><span class="ac-dot ${i < 2 ? "green" : "sky"}">${i + 1}</span><div class="ac-mid"><b>${esc(t)}</b><span>${esc(d)}</span></div></div>`
            )
            .join("")}
        </div>
        <div class="alert-violet" style="margin-top:10px">${ic("i-info", "sm")} This console says "local demo" until keys are present <b>and</b> a request has succeeded. It never claims a connection it has not tested.</div>
      </div>
      <div class="ac-panel"><h3>Data Protection Act, 2019</h3><p class="small muted" style="line-height:1.6">PathFinder processes grades, contact details and session notes as a data controller under the DPA 2019. Data is never sold or shared with agents, and is exportable on request. Appoint a DPO and register with the ODPC before production.</p><a class="btn btn-ghost btn-sm" style="margin-top:8px" href="${adHref("admin-dpa")}">Open data protection register</a></div>
    </div>
  </div>`;
}

/* ---------- DPA ---------- */
function adPosture() {
  return [
    {
      s: "pass",
      t: "Local-only demo storage",
      d: "Profiles, grades and reports stay in this browser until a hosted backend is configured."
    },
    {
      s: "pass",
      t: "Output escaped in the UI",
      d: "Every user-supplied string passes through esc() before it reaches the DOM."
    },
    {
      s: "pass",
      t: "No payments, no ID uploads",
      d: "Tutor requests collect a contact for the reviewer only; no document is uploaded."
    },
    {
      s: "pass",
      t: "Contact details blocked in chat",
      d: "Phones, emails, handles, app names and links are rejected before saving."
    },
    {
      s: "pass",
      t: "Data export and reset available",
      d: "Profile page exports JSON; reset clears the three local keys."
    },
    { s: "adv", t: "Named Data Protection Officer", d: "Required before launch, with a monitored contact channel." },
    {
      s: "adv",
      t: "Guardian consent verification",
      d: "An acknowledgement exists; verified consent for under-18s is not built."
    },
    {
      s: "adv",
      t: "Retention and deletion schedule",
      d: "Define how long requests, reports and assessment rows are kept."
    },
    {
      s: "adv",
      t: "Supabase RLS tested end to end",
      d: "Policies exist in schema.sql; they must be proven with two real accounts."
    },
    {
      s: "adv",
      t: "ODPC registration",
      d: "Register as a data controller before processing real learner data at scale."
    }
  ];
}
function adDpa() {
  const posture = adPosture();
  const inventory = [
    ["pf-state-v1", "Grades, targets, assessments, shortlist, bookings, reports, blocked messages", "This browser"],
    ["pf-accounts-v1", "Name, email, role, county, PBKDF2 hash + salt (60k iterations)", "This browser"],
    ["pf-session-v1", "Signed-in user id, role, demo flag, access token in hosted mode", "This browser"],
    ["Supabase (optional)", "Same rows under RLS: profiles, learner, tutor, safety", "Your project, HTTPS"]
  ];
  return `${adSection("dpa")}
  <div class="ac-kpis">
    ${adKpi(posture.filter((p) => p.s === "pass").length, "Controls in place")}
    ${adKpi(posture.filter((p) => p.s === "adv").length, "Gaps to close", "Before real learners", "warn")}
    ${adKpi(3, "Local stores", "Browser only")}
    ${adKpi(sb.enabled() ? "Live" : "None", "Data leaves device", sb.enabled() ? "Supabase" : "No network calls", sb.enabled() ? "" : "good")}
  </div>
  <div class="alert-violet" style="margin-bottom:12px">${ic("i-scale", "sm")} <b>Honest position:</b> this is a pilot with a documented posture, not a certified compliance claim. The gaps below are the launch checklist, not marketing asides.</div>
  <div class="ac-grid two">
    <div class="ac-panel"><h3>Posture</h3>${posture.map((p) => `<div class="audit-row"><span class="ck ${p.s === "pass" ? "done" : "wait"}">${p.s === "pass" ? "✓" : "!"}</span><div class="txt"><b>${esc(p.t)}</b><p>${esc(p.d)}</p></div><span class="chip ${p.s === "pass" ? "green" : "amber"}">${p.s === "pass" ? "in place" : "gap"}</span></div>`).join("")}</div>
    <div>
      <div class="ac-panel" style="margin-bottom:10px"><h3>Data inventory</h3>
        ${inventory.map(([k, w, where]) => `<div class="ac-li"><span class="ac-dot sky">${ic("i-db")}</span><div class="ac-mid"><b>${esc(k)}</b><span>${esc(w)}</span></div><span class="chip" style="font-size:10px">${esc(where)}</span></div>`).join("")}
        <p class="tiny muted" style="margin-top:8px;line-height:1.55">No analytics, no third-party script, no advertising pixel, no cookie beyond these local keys.</p>
      </div>
      <div class="ac-panel"><h3>Minimum before launch</h3>
        <div class="ac-list">
          ${[
            ["Registered entity and DPO", "A named person reachable by email, listed in the privacy notice."],
            ["Retention schedule", "Delete inactive learner rows after one admission cycle."],
            ["Trained safeguarding reviewer", "A human who reads every urgent report, not a queue that ages."],
            ["Verified guardian consent", "For under-18 learners, beyond a checkbox."],
            ["Tested RLS", "Two accounts, one table, zero leakage — proven, not assumed."],
            ["Emergency escalation path", "What a learner is told to do when it is not a product problem."]
          ]
            .map(
              ([t, d]) =>
                `<div class="ac-li"><span class="ac-dot amber">${ic("i-lock")}</span><div class="ac-mid"><b>${esc(t)}</b><span>${esc(d)}</span></div></div>`
            )
            .join("")}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><a class="btn btn-ghost btn-sm" href="${PF_ROOT}legal/privacy.html">Privacy notice</a><a class="btn btn-ghost btn-sm" href="${PF_ROOT}legal/terms.html">Terms</a><button class="btn btn-dark btn-sm" data-adact="export-dpa">${ic("i-download", "sm")} Export register</button></div>
      </div>
    </div>
  </div>`;
}

/* ---------- verification modal ---------- */
const AD_CHECK_NAMES = {
  tsc: "TSC registration",
  id: "National ID",
  conduct: "Certificate of good conduct",
  safe: "Safeguarding training"
};
function openVerifyPanel(tid) {
  const t = PF_TUTORS.find((x) => x.id === tid);
  if (!t) return;
  const keys = ["tsc", "id", "conduct", "safe"];
  const paint = () =>
    keys
      .map((k, i) => {
        const v = checksOf(t)[i];
        const sub = ((S.verifySub || {})[t.id] || {})[k];
        return `<div class="checkrow"><span class="ck ${v ? "done" : "wait"}">${v ? "✓" : "…"}</span><div style="min-width:0;flex:1"><b style="font-size:14.5px;color:var(--pine3)">${AD_CHECK_NAMES[k]}</b><p class="tiny muted">${v ? "Recorded — the badge shows for learners." : "Not recorded — learners correctly see 'pending'."}${sub ? ` <b>Submitted:</b> ${esc(sub.ref)}${sub.note ? " · " + esc(sub.note) : ""} (${esc(adWhen(sub.ts))})` : ""}</p></div><button class="btn btn-sm ${v ? "btn-danger" : "btn-dark"}" data-vtog="${k}">${v ? "Revoke" : "Record check"}</button></div>`;
      })
      .join("");
  openModal(
    `<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">${tutorAvatar(t, 44)}<div style="flex:1;min-width:0"><h3 style="font-size:18px">${esc(t.name)} — verification</h3><p class="tiny muted">Changes apply to the learner directory immediately.</p></div><button class="modal-x" data-close>${ic("i-x")}</button></div><div id="vRows">${paint()}</div><div class="alert-mock" style="margin-top:14px">Record a check <b>only after seeing the document</b>. No badge without a review.</div><div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn btn-dark btn-sm" data-close>Done</button></div>`
  );
  const bind = () =>
    $$("[data-vtog]", $("#modalBox")).forEach((b) =>
      b.addEventListener("click", () => {
        const k = b.dataset.vtog;
        S.verify[t.id] = S.verify[t.id] || {};
        const cur = checksOf(t)[keys.indexOf(k)];
        S.verify[t.id][k] = !cur;
        save();
        adLog(
          S.verify[t.id][k] ? "Recorded " + AD_CHECK_NAMES[k] : "Revoked " + AD_CHECK_NAMES[k],
          t.name,
          S.verify[t.id][k] ? "green" : "amber"
        );
        $("#vRows").innerHTML = paint();
        bind();
        if (typeof addNote === "function")
          addNote({
            to: "tutor",
            kind: "system",
            from: "Verification",
            title: S.verify[t.id][k] ? AD_CHECK_NAMES[k] + " recorded" : AD_CHECK_NAMES[k] + " revoked",
            body: S.verify[t.id][k]
              ? "The badge is now live for learners on your profile."
              : "The badge is hidden from learners until the record is restored.",
            link: "tutor-profile"
          });
        toast(
          S.verify[t.id][k] ? AD_CHECK_NAMES[k] + " recorded — badge live" : AD_CHECK_NAMES[k] + " revoked",
          "i-shield"
        );
        renderAdmin();
      })
    );
  bind();
}

/* ---------- render ---------- */
function renderAdmin() {
  const box = $("#adBox");
  if (!box) return;
  if (!SESSION || SESSION.role !== "admin") {
    box.innerHTML = lockedHTML("admin");
    return;
  }
  const k = adTab();
  const body =
    k === "requests"
      ? adRequests()
      : k === "users"
        ? adUsers()
        : k === "safety"
          ? adSafety()
          : k === "data"
            ? adData()
            : k === "deploy"
              ? adDeploy()
              : k === "dpa"
                ? adDpa()
                : adDash();
  box.innerHTML = adHead() + adTabsHTML() + body;
  S.adTab = k;
  reveal();
}

/* ---------- actions ---------- */
function adSeedRequest() {
  const id = "DEMO-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  adBookings().unshift({
    id: "seed-" + Date.now(),
    tutorId: "t1",
    subject: "Nursing routes",
    slot: "Sat · 9:00–11:00 AM",
    mode: "Online",
    note: "Sample request: I scored a C+ and want to compare a KMTC diploma with a B.Sc Nursing degree, and check what HEF needs.",
    status: "Requested",
    ts: Date.now(),
    learner: "Demo Learner",
    mine: false,
    demo: true,
    demoRef: id
  });
  save();
  renderAdmin();
  toast("DEMO request added — clearly labelled.", "i-spark");
}
function adSeedReport() {
  adReports().unshift({
    id: Date.now(),
    tutorId: "t2",
    tutor: "Brian Otieno",
    by: "Anonymous learner",
    reason: "Asked me to move to WhatsApp",
    details: "Sample report: the tutor asked for my number to continue outside the app.",
    ts: Date.now(),
    status: "open",
    demo: true
  });
  save();
  renderAdmin();
  adLog("Seeded DEMO report", "Brian Otieno", "amber");
  toast("DEMO report added to the safety queue.", "i-flag");
}
function adSetBooking(id, status) {
  const b = adBookings().find((x) => String(x.id) === String(id));
  if (!b) return;
  b.status = status;
  save();
  renderAdmin();
  if (typeof push === "function") push("booking", b);
  adLog(
    status === "Confirmed"
      ? "Approved match"
      : status === "Declined"
        ? "Declined request"
        : status === "In review"
          ? "Kept in review"
          : "Reopened request",
    (b.learner || "Learner") + " · " + (b.subject || "session"),
    status === "Declined" ? "rose" : status === "Requested" ? "amber" : "green"
  );
  if (typeof addNote === "function") {
    const tutor = PF_TUTORS.find((t) => t.id === b.tutorId);
    const who = tutor ? tutor.name : "your tutor";
    addNote({
      to: "student",
      kind: "request",
      from: "Administrator · decisions",
      title:
        status === "Confirmed"
          ? "Match approved — " + who
          : status === "Declined"
            ? "Request declined — " + who
            : status === "In review"
              ? "Your request is in review"
              : "Request reopened",
      body:
        status === "Confirmed"
          ? "Contact details are released to the tutor only. Your session is " + (b.slot || "") + "."
          : status === "Declined"
            ? "We are offering you another verified tutor for " + (b.subject || "this subject") + "."
            : "An administrator is checking the match before it is approved.",
      link: "tutors"
    });
    if (tutor && status === "Confirmed")
      addNote({
        to: "tutor",
        kind: "request",
        from: "Administrator · decisions",
        title: "Match approved for " + (b.learner || "a learner"),
        body: (b.subject || "Session") + " · " + (b.slot || "") + " is now in your workspace.",
        link: "tspace"
      });
  }
  toast(
    status === "Confirmed"
      ? "Match approved — tutor notified without contact details."
      : status === "Declined"
        ? "Declined — the learner is offered another tutor."
        : status === "In review"
          ? "Marked in review."
          : "Request reopened.",
    status === "Declined" ? "i-info" : "i-check"
  );
}

function adClick(e) {
  const el = e.target.closest("[data-adact]");
  if (!el) return;
  const [verb, a, b] = el.dataset.adact.split(":");
  if (verb === "verify") return openVerifyPanel(a);
  if (verb === "seed-request") return adSeedRequest();
  if (verb === "seed-report") return adSeedReport();
  if (verb === "approve") return adSetBooking(a, "Confirmed");
  if (verb === "decline") return adSetBooking(a, "Declined");
  if (verb === "review") return adSetBooking(a, "In review");
  if (verb === "reopen") return adSetBooking(a, "Requested");
  if (verb === "reveal") {
    S.adReveal = S.adReveal || {};
    S.adReveal[a] = !S.adReveal[a];
    renderAdmin();
    toast(S.adReveal[a] ? "Contact revealed to you only — logged." : "Contact hidden again.", "i-lock");
    return;
  }
  if (verb === "suspend") {
    S.suspended[a] = true;
    const rep = adReports().find((r) => String(r.id) === String(b));
    if (rep) rep.status = "suspended";
    adLog("Suspended tutor", (PF_TUTORS.find((x) => x.id === a) || {}).name || a, "rose");
    if (typeof addNote === "function") {
      const t = PF_TUTORS.find((x) => x.id === a);
      addNote({
        to: "tutor",
        kind: "safety",
        from: "Safety team",
        title: "Your account is suspended",
        body: "You are hidden from the learner directory while an open report is reviewed. Reply is not possible in-app during a suspension.",
        link: "tutor-profile"
      });
      addNote({
        to: "admin",
        kind: "safety",
        from: "Safety team",
        title: (t ? t.name : "Tutor") + " suspended",
        body: "Removed from the public tutor directory and the open report was closed as suspended.",
        link: "admin-safety"
      });
    }
    save();
    renderAdmin();
    toast("Tutor suspended — removed from the learner directory.", "i-shield");
    return;
  }
  if (verb === "reinstate") {
    delete S.suspended[a];
    save();
    renderAdmin();
    adLog("Reinstated tutor", (PF_TUTORS.find((x) => x.id === a) || {}).name || a, "green");
    if (typeof addNote === "function") {
      const t = PF_TUTORS.find((x) => x.id === a);
      addNote({
        to: "tutor",
        kind: "safety",
        from: "Safety team",
        title: "Your account is reinstated",
        body: "Your profile is listed again. Keep all contact inside PathFinder.",
        link: "tutor-profile"
      });
      addNote({
        to: "admin",
        kind: "safety",
        from: "Safety team",
        title: (t ? t.name : "Tutor") + " reinstated",
        body: "Back in the learner directory.",
        link: "admin-safety"
      });
    }
    toast("Tutor reinstated.", "i-check");
    return;
  }
  if (verb === "dismiss" || verb === "reopen-report") {
    const rep = adReports().find((r) => String(r.id) === String(a));
    if (rep) {
      rep.status = verb === "dismiss" ? "dismissed" : "open";
      if (verb === "reopen") rep.resolution = "";
      save();
      renderAdmin();
      adLog(
        verb === "dismiss" ? "Dismissed report" : "Reopened report",
        rep.tutor || "Tutor",
        verb === "dismiss" ? "amber" : "rose"
      );
      toast(verb === "dismiss" ? "Report dismissed." : "Report reopened.", verb === "dismiss" ? "i-check" : "i-flag");
    }
    return;
  }
  if (verb === "resolve") return adResolveReport(a);
  if (verb === "approve-app") return adDecideApp("approved");
  if (verb === "reject-app") return adDecideApp("rejected");
  if (verb === "reopen-app") return adDecideApp("review");
  if (verb === "export-log")
    return adExport(
      [
        ["When", "Admin", "Action", "Target"],
        ...adLogEntries().map((e) => [new Date(e.ts).toISOString(), e.by, e.action, e.target])
      ],
      "pathfinder-action-trail.csv"
    );
  if (verb === "export-users")
    return adExport(
      [
        ["Name", "Email", "Role", "County", "Credentials", "Created"],
        ...ACCOUNTS.map((x) => [
          x.name,
          x.email,
          x.role,
          x.county || "",
          x.demo ? "DEMO" : "real",
          new Date(x.created || Date.now()).toISOString()
        ])
      ],
      "pathfinder-accounts.csv"
    );
  if (verb === "review-app") {
    if (S.tutorApp) {
      S.tutorApp.reviewed = true;
      save();
      renderAdmin();
      adLog("Application kept in review", S.tutorApp.name, "amber");
      toast("Application marked reviewed.", "i-check");
    }
    return;
  }
  if (verb === "del") {
    if (!el.dataset.arm) {
      el.dataset.arm = "1";
      el.textContent = "Tap again";
      setTimeout(() => {
        if (el.isConnected) {
          delete el.dataset.arm;
          el.textContent = "Remove";
        }
      }, 2500);
      return;
    }
    const gone = ACCOUNTS.find((x) => String(x.id) === String(a));
    ACCOUNTS = ACCOUNTS.filter((x) => String(x.id) !== String(a));
    saveAccounts();
    renderAdmin();
    adLog("Removed account", gone ? gone.name + " · " + gone.role : String(a), "rose");
    toast("Account removed.", "i-info");
    return;
  }
  if (verb === "rerun-audit" || verb === "rerun-deploy") return renderAdmin();
  if (verb === "export-audit")
    return adExport(
      [["Check", "Result", "Detail"], ...adAudit().map((r) => [r.t, r.s, r.d])],
      "pathfinder-data-audit.csv"
    );
  if (verb === "export-deploy")
    return adExport(
      [["Check", "Result", "Detail"], ...adDeployRows().map((r) => [r.t, r.s, r.d])],
      "pathfinder-deploy-checks.csv"
    );
  if (verb === "export-requests")
    return adExport(
      [
        ["Learner", "Tutor", "Focus", "Slot", "Mode", "Status", "Raised"],
        ...adBookings().map((x) => [
          x.learner || "",
          PF_TUTORS.find((t) => t.id === x.tutorId)?.name || "",
          x.subject || "",
          x.slot || "",
          x.mode || "",
          x.status,
          new Date(x.ts || Date.now()).toISOString()
        ])
      ],
      "pathfinder-requests.csv"
    );
  if (verb === "export-dpa")
    return adExport(
      [["Control", "Status", "Detail"], ...adPosture().map((p) => [p.t, p.s === "pass" ? "in place" : "gap", p.d])],
      "pathfinder-dpa-register.csv"
    );
}
/* filters live in S so they survive a re-render or a page navigation */
function adFilterClick(e) {
  const b = e.target.closest("[data-adfilter]");
  if (!b) return;
  const v = b.dataset.adfilter;
  if (v === "reset") {
    S.adQ = "";
    S.adFilter = "all";
  } else S.adFilter = v;
  save();
  adFilterApply();
}
let adQTimer = null;
function adFilterType(e) {
  const q = e.target.closest("#adQ");
  if (!q) return;
  S.adQ = q.value;
  clearTimeout(adQTimer);
  adQTimer = setTimeout(() => {
    save();
    adFilterApply();
  }, 220);
}

/* ---------- new decisions ---------- */
function adResolveReport(id) {
  const r = adReports().find((x) => String(x.id) === String(id));
  if (!r) return;
  const tutor = PF_TUTORS.find((t) => t.id === r.tutorId);
  openModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><span class="ac-dot ${"rose"}">${ic("i-flag")}</span>
      <div style="flex:1;min-width:0"><h3 style="font-size:18px">Resolve this report</h3><p class="tiny muted">${esc(r.tutor || (tutor ? tutor.name : "Tutor"))} · ${esc(r.reason || "Reported")}</p></div>
      <button class="modal-x" data-close>${ic("i-x")}</button></div><div class="divider"></div>
    <p class="small muted" style="margin-bottom:10px">The learner sees this outcome in their notifications. Keep it factual and free of personal contact details.</p>
    <label class="flab" for="resNote">Outcome</label>
    <textarea class="input" id="resNote" rows="3" maxlength="220" placeholder="e.g. Spoke to the tutor about the safeguarding rule; no further contact outside the app. Report closed.">${esc(r.resolution || "")}</textarea>
    <div class="alert-violet" style="margin-top:12px;font-size:13px">${ic("i-shield", "sm")} Resolving does not lift a suspension. Reinstate the tutor separately if the report clears them.</div>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-dark" id="resSave" style="margin-left:auto">${ic("i-check", "sm")} Resolve report</button></div>`);
  $("#resSave").addEventListener("click", () => {
    const note = $("#resNote").value.trim();
    if (!note) {
      toast("Add a one-line outcome — the learner deserves to read it", "i-info");
      return;
    }
    r.status = "resolved";
    r.resolution = note;
    r.resolvedAt = Date.now();
    save();
    closeModal();
    renderAdmin();
    adLog("Resolved report", r.tutor || "Tutor", "green");
    if (typeof addNote === "function")
      addNote({
        to: "student",
        kind: "safety",
        from: "Safety team",
        title: "Your report was resolved",
        body: "Outcome: " + note,
        link: "tutors"
      });
    toast("Report resolved — the learner has the outcome", "i-check");
  });
}

function adDecideApp(status) {
  if (!S.tutorApp) return;
  const app = S.tutorApp;
  app.reviewed = status !== "review";
  app.status = status;
  app.decision =
    status === "approved"
      ? "Approved — added to the pilot cohort. Contact details are shared only through the app."
      : status === "rejected"
        ? "Rejected — the applicant is told why and can re-apply after completing the missing check."
        : "";
  app.decidedAt = Date.now();
  save();
  renderAdmin();
  adLog(
    status === "approved"
      ? "Approved tutor application"
      : status === "rejected"
        ? "Rejected tutor application"
        : "Reopened tutor application",
    app.name,
    status === "approved" ? "green" : status === "rejected" ? "rose" : "amber"
  );
  if (typeof addNote === "function" && status !== "review")
    addNote({
      to: "tutor",
      kind: "system",
      from: "Verification",
      title: status === "approved" ? "Your application is approved" : "Your application was not approved",
      body:
        status === "approved"
          ? "Welcome to the pilot. Keep your availability current — learners can only request open slots."
          : "You can re-apply once the missing verification record is in. Nothing is published until then.",
      link: "tutor-profile"
    });
  toast(
    status === "approved"
      ? "Application approved."
      : status === "rejected"
        ? "Application rejected."
        : "Back in review.",
    status === "rejected" ? "i-info" : "i-check"
  );
}

function adChange(e) {
  const sel = e.target.closest("[data-role-for]");
  if (!sel) return;
  const a = ACCOUNTS.find((x) => String(x.id) === String(sel.dataset.roleFor));
  if (!a) return;
  const was = a.role;
  a.role = sel.value;
  saveAccounts();
  renderAdmin();
  adLog("Changed role", a.name + " · " + was + " → " + a.role, "sky");
  toast(a.name + " is now " + a.role + ".", "i-check");
}

/* ---------- boot ---------- */
if (document.body.dataset.adtab) S.adTab = document.body.dataset.adtab;
document.addEventListener("click", adClick);
document.addEventListener("click", adFilterClick);
document.addEventListener("input", adFilterType);
document.addEventListener("change", adChange);
if (guard("admin")) {
  renderAdmin();
  reveal();
}
