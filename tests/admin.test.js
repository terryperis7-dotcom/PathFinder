#!/usr/bin/env node
/* Admin console behaviour: boots each of the nine tabs in jsdom, drives the real
   buttons, and asserts that the console changes state instead of only looking
   right. Requires jsdom (dev dependency, same as tools/render_check.js):

     npm install --no-save jsdom && npm run test:admin
*/
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs"),
  path = require("path");
const ROOT = path.resolve(__dirname, "..");

const ADMIN = {
  id: "demo-adm",
  name: "Terry P.",
  email: "admin@demo.pathfinder.ke",
  role: "admin",
  county: "Nairobi",
  demo: true
};
const STUDENT = {
  id: "demo-stu",
  name: "Wanjiku Muthoni",
  email: "student@demo.pathfinder.ke",
  role: "student",
  county: "Nakuru",
  demo: true
};

const SEED = {
  bookings: [
    {
      id: 1700000000001,
      tutorId: "t1",
      subject: "Nursing routes",
      slot: "Sat · 9:00–11:00 AM",
      mode: "Online",
      note: "I scored a C+ and want to compare a KMTC diploma with a B.Sc Nursing degree.",
      status: "Requested",
      ts: 1700000000001,
      learner: "Wanjiku Muthoni",
      mine: true
    },
    {
      id: 1700000000002,
      tutorId: "t2",
      subject: "Physics revision",
      slot: "Wed · 4:00–6:00 PM",
      mode: "In-person",
      note: "Momentum questions keep costing me marks.",
      status: "Confirmed",
      ts: 1700000000002,
      learner: "Guest learner",
      mine: false
    }
  ],
  reports: [
    {
      id: 1700000000003,
      tutorId: "t2",
      tutor: "Brian Otieno",
      by: "Anonymous learner",
      reason: "Asked me to move to WhatsApp",
      details: "He asked for my number and said we should talk outside the app.",
      ts: 1700000000003,
      status: "open"
    }
  ]
};

function inline(page) {
  const dir = path.dirname(path.join(ROOT, page));
  let html = fs.readFileSync(path.join(ROOT, page), "utf8").replace(/<link[^>]*fonts\.(googleapis|gstatic)[^>]*>/g, "");
  return html.replace(
    /<script src="([^"]+)"><\/script>/g,
    (m, src) =>
      "<script>" + fs.readFileSync(path.resolve(dir, src), "utf8").replace(/<\/script>/g, "<\\/script>") + "</script>"
  );
}

function load(page, session, state) {
  return new Promise((resolve) => {
    const errs = [];
    const vc = new VirtualConsole();
    vc.on("jsdomError", (e) => {
      const m = e.message || String(e);
      if (!/Not implemented/.test(m)) errs.push("jsdomError: " + m.slice(0, 240));
    });
    vc.on("error", (...a) => errs.push("console.error: " + a.map(String).join(" ").slice(0, 240)));
    const dom = new JSDOM(inline(page), {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      virtualConsole: vc,
      url: "http://localhost/" + page,
      beforeParse(w) {
        w.localStorage.setItem("pf-session-v1", JSON.stringify(session));
        w.localStorage.setItem("pf-state-v1", JSON.stringify(Object.assign({ tutorSeeded: true }, state || {})));
      }
    });
    const w = dom.window;
    w.addEventListener("error", (e) => errs.push("window.error: " + (e.message || "").slice(0, 240)));
    setTimeout(() => resolve({ w, d: w.document, errs }), 260);
  });
}

// accept both (window, selector) and (selector, window)
const pick = (a, b) => (a && a.document ? [a, b] : [b, a]);
const $ = (a, b) => {
  const [w, sel] = pick(a, b);
  return w.document.querySelector(sel);
};
const $$ = (a, b) => {
  const [w, sel] = pick(a, b);
  return Array.from(w.document.querySelectorAll(sel));
};
function clickAct(w, act) {
  const el = $(w, `[data-adact="${act}"]`);
  if (!el) return false;
  el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  return true;
}
const state = (w) => JSON.parse(w.localStorage.getItem("pf-state-v1") || "{}");

const results = [];
const check = (name, ok, extra) => results.push({ name, ok: !!ok, extra: extra || "" });

(async () => {
  /* ---------- shell: nine tabs, one per page ---------- */
  const PAGES = [
    ["admin/dashboard.html", "dash", "Overview"],
    ["admin/requests.html", "requests", "Requests"],
    ["admin/sessions.html", "sessions", "Scheduled sessions"],
    ["admin/messages.html", "messages", "Messaging"],
    ["admin/users.html", "users", "Users & roles"],
    ["admin/safety.html", "safety", "Safety"],
    ["admin/data.html", "data", "Data audit"],
    ["admin/deployment.html", "deploy", "Deployment"],
    ["admin/dpa.html", "dpa", "Data protection"]
  ];
  let allErrors = [];
  for (const [page, tab, label] of PAGES) {
    const { w, d, errs } = await load(page, ADMIN, SEED);
    allErrors = allErrors.concat(errs);
    check(`${label}: page boots without errors`, errs.length === 0, errs.join(" | "));
    check(
      `${label}: console head renders`,
      d.querySelector(".ac-head h1")?.textContent.includes("Run the platform honestly")
    );
    const tabs = $$(w, ".ac-tab");
    check(`${label}: nine tabs`, tabs.length === 9, String(tabs.length));
    check(
      `${label}: correct tab is active`,
      $(w, ".ac-tab.on")?.dataset.adtab === tab,
      $(w, ".ac-tab.on")?.dataset.adtab
    );
    check(
      `${label}: tabs link to real pages`,
      tabs.every((t) => /admin\/[a-z]+\.html$/.test(t.getAttribute("href")))
    );
  }

  /* ---------- console chrome: groups, order, footer, sheets ---------- */
  {
    const { w } = await load("admin/dashboard.html", ADMIN, SEED);
    const groups = $$(w, "#snav h5").map((h) => h.textContent.trim());
    check(
      "chrome: three sidebar groups",
      groups.join("|") === "Admin console|Operations|Public surface",
      groups.join("|")
    );
    const labels = $$(w, "#snav a").map((a) => a.textContent.replace(/\s+/g, " ").trim());
    const want = [
      "Platform overview",
      "User control",
      "Learning requests",
      "Safety reports",
      "Reference audit",
      "Deployment centre",
      "Data protection"
    ].every((l) => labels.some((x) => x.startsWith(l)));
    check("chrome: every console link present", want, labels.join(" / "));
    check(
      "chrome: public surface links",
      labels.some((x) => x.startsWith("Institution directory")) && labels.some((x) => x.startsWith("Public homepage"))
    );
    check("chrome: no duplicate public homepage", labels.filter((x) => x.startsWith("Public homepage")).length === 1);

    const foot = $$(w, "#sideFoot .foot-link, #sideFoot a").map((a) => a.textContent.trim());
    check("chrome: footer rows", foot.join("|") === "Account & workspace|Safety centre|Sign out", foot.join("|"));

    const order = $$(w, ".ac-tab")
      .map((t) => t.dataset.adtab)
      .join(",");
    check("chrome: tab order", order === "dash,users,requests,sessions,messages,safety,data,deploy,dpa", order);
    check(
      "chrome: head says local demo",
      $(".ac-eyebrow", w).textContent.includes("local demo"),
      $(".ac-eyebrow", w).textContent
    );
    check("chrome: shield watermark", Boolean($(".ac-mark svg", w)));

    // account & workspace
    $(w, "#sideFoot [data-account]").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    const accHtml = $("#modalBox", w).textContent;
    check("account sheet: opens", $("#modalBg", w).classList.contains("open"));
    check(
      "account sheet: names the account",
      accHtml.includes("Terry P.") && accHtml.includes("admin@demo.pathfinder.ke")
    );
    check("account sheet: storage mode stated", accHtml.includes("Local demo mode"));
    check("account sheet: counters", accHtml.includes("Learning requests") && accHtml.includes("Safety reports"));
    check(
      "account sheet: export + sign out offered",
      Boolean($("#modalBox [data-account-export]", w)) && Boolean($("#modalBox [data-signout]", w))
    );

    // safety centre from inside the account sheet
    $(w, "#modalBox [data-safety-centre]").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    const safeHtml = $("#modalBox", w).textContent;
    check("safety centre: opens from the account sheet", safeHtml.includes("Safety centre"));
    check("safety centre: six rules", $$(w, "#modalBox .ac-li").length >= 6, String($$(w, "#modalBox .ac-li").length));
    check("safety centre: contact blocking explained", safeHtml.includes("Contact details blocked"));
    check("safety centre: lists your reports", safeHtml.includes("Reports you have filed"));
    check("safety centre: emergency route stated", safeHtml.includes("In an emergency"));

    $(w, "#modalBox [data-close]").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    check("modal closes again", !$("#modalBg", w).classList.contains("open"));
  }

  /* ---------- overview ---------- */
  {
    const { w, d } = await load("admin/dashboard.html", ADMIN, SEED);
    check("overview: four KPI tiles", $$(w, ".ac-kpi").length === 4, String($$(w, ".ac-kpi").length));
    const txt = $("#adBox", w).textContent;
    check("overview: signed-in accounts tile", txt.includes("Signed-in accounts"));
    check("overview: learner requests tile", txt.includes("Learner requests"));
    check("overview: open reports tile", txt.includes("Open reports"));
    check("overview: blocks tile", txt.includes("Blocks"));
    check("overview: pending request counted", txt.includes("Learning requests: 1"), txt.slice(0, 0));
    check("overview: open report counted", txt.includes("Open safety reports: 1"));
    check("overview: reference data row", txt.includes("Reference data: 24 listings"));
    check("overview: live verification flow row", txt.includes("Live verification flow"));
    check(
      "overview: seed actions present",
      $$(w, '[data-adact="seed-request"]').length >= 1 && $$(w, '[data-adact="seed-report"]').length >= 1
    );
    check("overview: local demo badge", txt.includes("Local demo"));
    check("overview: activity feed has seeded events", $$(w, "#adBox .ac-li").length >= 6);
    check("overview: pathway coverage listed", txt.includes("Pathway coverage") && txt.includes("Health & Medicine"));
    check("overview: honesty rules shown", txt.includes("A badge follows a record"));
  }

  /* ---------- requests: approve, reveal, decline, seed ---------- */
  {
    const { w, d } = await load("admin/requests.html", ADMIN, SEED);
    check("requests: one card per booking", $$(w, ".ac-req").length === 2, String($$(w, ".ac-req").length));
    check("requests: contact is masked by default", $("#adBox", w).textContent.includes("•"), "no mask");
    check(
      "requests: masked contact hides the real address",
      !$("#adBox", w).textContent.includes("student@demo.pathfinder.ke")
    );

    clickAct(w, "reveal:1700000000001");
    check("requests: reveal shows the real contact", $("#adBox", w).textContent.includes("student@demo.pathfinder.ke"));
    clickAct(w, "reveal:1700000000001");
    check("requests: hide masks it again", !$("#adBox", w).textContent.includes("student@demo.pathfinder.ke"));

    clickAct(w, "approve:1700000000001");
    check(
      "requests: approve persists Confirmed",
      state(w).bookings.find((b) => b.id === 1700000000001).status === "Confirmed"
    );
    check("requests: approved card offers Reopen", $(w, '[data-adact="reopen:1700000000001"]') !== null);
    clickAct(w, "reopen:1700000000001");
    check(
      "requests: reopen returns to Requested",
      state(w).bookings.find((b) => b.id === 1700000000001).status === "Requested"
    );

    clickAct(w, "review:1700000000001");
    check(
      "requests: in-review status persists",
      state(w).bookings.find((b) => b.id === 1700000000001).status === "In review"
    );
    clickAct(w, "decline:1700000000001");
    check("requests: decline persists", state(w).bookings.find((b) => b.id === 1700000000001).status === "Declined");

    const before = state(w).bookings.length;
    clickAct(w, "seed-request");
    const seeded = state(w).bookings[0];
    check("requests: seed adds a labelled DEMO row", state(w).bookings.length === before + 1 && seeded.demo === true);
    check("requests: seeded row is Requested", seeded.status === "Requested", seeded.status);
  }

  /* ---------- users: role change, verify modal, self-protection ---------- */
  {
    const { w, d } = await load("admin/users.html", ADMIN, SEED);
    const rows = $$(w, "#adBox tbody tr");
    check("users: every account is listed", rows.length >= 3, String(rows.length));
    check("users: verification states listed", $("#adBox", w).textContent.includes("Tutor verification states"));
    const selfSelect = $(w, `[data-role-for="${ADMIN.id}"]`);
    check("users: own role select is disabled", selfSelect && selfSelect.disabled);

    const other = ACCOUNTS_SELECT(w);
    if (other) {
      other.value = "tutor";
      other.dispatchEvent(new w.Event("change", { bubbles: true }));
      const saved = JSON.parse(w.localStorage.getItem("pf-accounts-v1") || "[]").find(
        (a) => a.id === other.dataset.roleFor
      );
      check("users: role change persists", saved && saved.role === "tutor", saved && saved.role);
    } else {
      check("users: role change persists", false, "no non-self row");
    }

    const verifyBtn = $(w, '[data-adact^="verify:"]');
    check("users: verify button present", Boolean(verifyBtn));
    if (verifyBtn) {
      verifyBtn.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
      const modal = $("#modalBox", w);
      check(
        "users: verify modal opens with four checks",
        modal.innerHTML.includes("National ID") && modal.querySelectorAll("[data-vtog]").length === 4
      );
      const toggle = modal.querySelector('[data-vtog="conduct"]');
      const before = toggle.textContent.trim();
      toggle.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
      const v = state(w).verify || {};
      const after = $("#modalBox", w).querySelector('[data-vtog="conduct"]').textContent.trim();
      check(
        "users: a check toggle persists an override",
        Boolean(v.t1) && typeof v.t1.conduct === "boolean",
        JSON.stringify(v)
      );
      check("users: the button flips to the opposite action", before !== after, before + " → " + after);
    }
  }

  /* ---------- safety: suspend, reinstate, dismiss ---------- */
  {
    const { w } = await load("admin/safety.html", ADMIN, SEED);
    check("safety: report card rendered", $$(w, ".ac-req").length >= 1);
    check("safety: learner quote shown", $("#adBox", w).textContent.includes("outside the app"));

    clickAct(w, "dismiss:1700000000003");
    check(
      "safety: dismiss closes the report",
      state(w).reports.find((r) => r.id === 1700000000003).status === "dismissed"
    );
    check("safety: reopen control appears", $(w, '[data-adact="reopen-report:1700000000003"]') !== null);

    clickAct(w, "reopen-report:1700000000003");
    check("safety: reopen restores the queue", state(w).reports.find((r) => r.id === 1700000000003).status === "open");

    clickAct(w, "suspend:t2:1700000000003");
    const st = state(w);
    check("safety: suspend hides the tutor", st.suspended && st.suspended.t2 === true);
    check("safety: report marked suspended", st.reports.find((r) => r.id === 1700000000003).status === "suspended");
    check("safety: reinstate control appears", $(w, '[data-adact="reinstate:t2"]') !== null);
    clickAct(w, "reinstate:t2");
    check("safety: reinstate clears the flag", !state(w).suspended.t2);

    const before = state(w).reports.length;
    clickAct(w, "seed-report");
    check(
      "safety: seed adds a labelled DEMO report",
      state(w).reports.length === before + 1 && state(w).reports[0].demo === true
    );
  }

  /* ---------- data audit ---------- */
  {
    const { w } = await load("admin/data.html", ADMIN, SEED);
    const rows = $$(w, "#adBox .audit-row");
    check("data: audit rows rendered", rows.length >= 12, String(rows.length));
    check("data: no failing checks", !$("#adBox", w).textContent.includes(">error<"));
    const links = $$(w, "#adBox a[href^='https://']");
    check(
      "data: official sources are HTTPS",
      links.length >= 7 && links.every((a) => a.href.startsWith("https://")),
      String(links.length)
    );
    check(
      "data: KUCCPS linked",
      links.some((a) => /kuccps/.test(a.href))
    );
    check("data: re-verify list present", $("#adBox", w).textContent.includes("Re-verify each intake"));
  }

  /* ---------- deployment ---------- */
  {
    const { w } = await load("admin/deployment.html", ADMIN, SEED);
    check("deploy: live checks rendered", $$(w, "#adBox .audit-row").length >= 9);
    const t = $("#adBox", w).textContent;
    check("deploy: demo mode is stated honestly", t.includes("Local demo") || t.includes("local demo"));
    check("deploy: supabase steps listed", t.includes("supabase-config.js"));
  }

  /* ---------- dpa ---------- */
  {
    const { w } = await load("admin/dpa.html", ADMIN, SEED);
    const t = $("#adBox", w).textContent;
    check("dpa: posture rows", $$(w, "#adBox .audit-row").length >= 9, String($$(w, "#adBox .audit-row").length));
    check("dpa: data inventory named", t.includes("pf-state-v1") && t.includes("pf-accounts-v1"));
    check("dpa: launch gaps listed", t.includes("Minimum before launch"));
    check("dpa: no false compliance claim", t.includes("not a certified compliance claim"));
  }

  /* ---------- access control ---------- */
  {
    const { w } = await load("admin/requests.html", STUDENT, SEED);
    const t = $("#viewBody", w).textContent;
    check("guard: a student cannot read the console", !t.includes("Run the platform honestly."), t.slice(0, 60));
    check("guard: locked panel explains why", /admin console needs an admin account/i.test(t));
    check("guard: the console tabs are not rendered", $$(w, ".ac-tab").length === 0);

    // the one-click demo tour must land in the console without a reload
    const demo = $(w, '[data-demo="admin"]');
    check("guard: demo button offered", Boolean(demo));
    demo.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    check("guard: demo sign-in renders the console in place", Boolean($(w, ".ac-head")), "no console head");
    check("guard: all nine tabs after sign-in", $$(w, ".ac-tab").length === 9, String($$(w, ".ac-tab").length));
    check(
      "guard: active tab kept",
      $(w, ".ac-tab.on")?.dataset.adtab === "requests",
      $(w, ".ac-tab.on")?.dataset.adtab
    );
  }

  /* ---------- uploaded verification documents reach the reviewer ---------- */
  {
    const DOC = {
      verify: { t1: { tsc: false } },
      verifyDocs: {
        t1: {
          tsc: {
            name: "TSC-certificate.pdf",
            mime: "application/pdf",
            size: 184320,
            data: "data:application/pdf;base64,JVBERi0xLjQK",
            ts: 1700000005000,
            status: "pending",
            ref: "TSC/2019/004321"
          },
          id: {
            name: "national-id.jpg",
            mime: "image/jpeg",
            size: 96400,
            data: "data:image/jpeg;base64,/9j/4AAQ",
            ts: 1700000004000,
            status: "pending",
            ref: "ID-998877"
          },
          conduct: {
            name: "good-conduct.pdf",
            mime: "application/pdf",
            size: 2.4e6,
            data: "",
            ts: 1700000003000,
            status: "pending",
            note: "over the device limit — details saved, file not kept"
          }
        }
      }
    };
    const { w, errs } = await load("admin/users.html", ADMIN, Object.assign({}, SEED, DOC));
    check("docs: the uploads table renders", /Documents tutors have uploaded/.test($(w, "#adBox").textContent));
    check(
      "docs: a row per openable file",
      $$(w, "[data-docview]").length === 2,
      String($$(w, "[data-docview]").length)
    );
    check("docs: the tutor row is badged with a count", /3 docs/.test($(w, "#adBox").textContent));
    check("docs: KPI counts what needs review", /Docs to review/.test($(w, "#adBox").textContent));
    check("docs: no page errors with documents attached", errs.length === 0, errs.join(" | "));

    clickAct(w, "verify:t1");
    const panel = $(w, "#modalBox").textContent;
    check(
      "docs: the panel has one row per check",
      $$(w, "#vRows .vrow").length === 4,
      String($$(w, "#vRows .vrow").length)
    );
    check("docs: the panel names the uploaded file", /TSC-certificate\.pdf/.test(panel), panel.slice(0, 160));
    check("docs: it says when it was uploaded", /uploaded/.test(panel));
    check("docs: a missing file says so instead of pretending", /details saved, file not kept/.test(panel));
    check("docs: the footer counts the documents", /3 documents uploaded/.test(panel), panel.slice(-220));

    $(w, '[data-docview="t1:id"]').dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    check("docs: the viewer opens the image", Boolean($(w, ".docimg")), "no .docimg");
    check("docs: the viewer names the check", /National ID/.test($(w, "#modalBox").textContent));
    check("docs: there is a download link", Boolean($(w, '.modal a[download="national-id.jpg"]')));

    /* back to the panel: the viewer closed over it */
    clickAct(w, "verify:t1");
    $$(w, "[data-vtog]")[0].dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    const after = state(w);
    check(
      "docs: recording sets the verification record",
      after.verify && after.verify.t1 && after.verify.t1.tsc === true,
      JSON.stringify(after.verify)
    );
    check(
      "docs: the document is marked checked",
      after.verifyDocs.t1.tsc.status === "checked",
      after.verifyDocs.t1.tsc.status
    );
    check("docs: the row now reads Checked", /Checked/.test($(w, "#vRows").textContent));

    $$(w, "[data-vtog]")[0].dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    check("docs: revoking marks the document sent back", state(w).verifyDocs.t1.tsc.status === "rejected");
    check("docs: the document itself is still there", Boolean(state(w).verifyDocs.t1.tsc.name));
  }

  /* ---------- scheduled sessions ---------- */
  {
    const { w, errs } = await load("admin/sessions.html", ADMIN, SEED);
    const body = $(w, "#adBox").textContent;
    check("sessions: its own console tab", Boolean($(w, ".ac-tab.on[data-adtab='sessions']")));
    check("sessions: the section head renders", /Scheduled sessions/.test(body));
    check("sessions: KPIs count the diary", /Confirmed/.test(body) && /Booked value/.test(body));
    check(
      "sessions: a column per day of the week",
      $$(w, ".diary-day").length === 7,
      String($$(w, ".diary-day").length)
    );
    check(
      "sessions: every booking is listed",
      $$(w, "#adBox tbody tr").length >= 2,
      String($$(w, "#adBox tbody tr").length)
    );
    check(
      "sessions: the pending one offers a decision",
      Boolean($(w, '[data-adact^="approve:"]')) && Boolean($(w, '[data-adact^="decline:"]'))
    );
    check("sessions: no page errors", errs.length === 0, errs.join(" | "));

    clickAct(w, "approve:1700000000001");
    check(
      "sessions: approving confirms the booking",
      (state(w).bookings.find((b) => b.id === 1700000000001) || {}).status === "Confirmed"
    );
    check(
      "sessions: the confirmed session enters the diary",
      $$(w, ".diary-slot").length >= 1,
      String($$(w, ".diary-slot").length)
    );
    check("sessions: it now offers Mark done", Boolean($(w, '[data-adact^="complete:"]')));
    clickAct(w, "complete:1700000000001");
    check(
      "sessions: marking done completes it",
      (state(w).bookings.find((b) => b.id === 1700000000001) || {}).status === "Completed"
    );
    check("sessions: the fee shows for a completed session", /KES \d/.test($(w, "#adBox").textContent));
    check(
      "sessions: the filter chips cover every state",
      $$(w, "[data-adfilter]").length === 5,
      String($$(w, "[data-adfilter]").length)
    );
  }

  /* ---------- admin messaging ---------- */
  {
    const { w, errs } = await load("admin/messages.html", ADMIN, SEED);
    const body = $(w, "#adBox").textContent;
    check("messages: its own console tab", Boolean($(w, ".ac-tab.on[data-adtab='messages']")));
    check(
      "messages: threads render",
      $$(w, ".ac-threads .thread").length === 2,
      String($$(w, ".ac-threads .thread").length)
    );
    check("messages: seeded rows are labelled DEMO", $$(w, ".ac-threads .chip.demo").length === 2);
    check("messages: unread is highlighted", /new/.test(body));
    check("messages: it explains the filter", /rejected before a message is saved/.test(body));
    check("messages: no page errors", errs.length === 0, errs.join(" | "));

    clickAct(w, "thread-new");
    check("messages: new-message dialog opens", Boolean($(w, "#thWho")));
    check(
      "messages: it offers learners and tutors",
      $$(w, "#thWho option").length >= 3,
      String($$(w, "#thWho option").length)
    );
    $(w, "#thWho").value = $$(w, "#thWho option")[0].value;
    $(w, "#thSubj").value = "Saturday session";
    $(w, "#thBody").value = "Please bring the mock paper you mentioned.";
    $(w, "#thCreate").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    check("messages: a thread is created", state(w).threads.length === 3, String(state(w).threads.length));
    check("messages: the message is stored", /mock paper/.test(JSON.stringify(state(w).threads[0].msgs)));

    const before = state(w).threads.length;
    clickAct(w, "thread-new");
    $(w, "#thWho").value = $$(w, "#thWho option")[0].value;
    $(w, "#thBody").value = "call me on 0712 345 678";
    $(w, "#thCreate").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    check("messages: contact details are refused", state(w).threads.length === before, String(state(w).threads.length));

    $('[data-thread="th-demo-1"]', w).dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    check("messages: the thread opens", Boolean($(w, "#thText")));
    check(
      "messages: prior messages are shown",
      /certificate|Saturday|confirmed/i.test($(w, "#thMsgs").textContent),
      $(w, "#thMsgs").textContent.slice(0, 100)
    );
    $(w, "#thText").value = "It reached the reviewer, thank you.";
    $(w, "#thSend").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    check("messages: the reply is saved", /reached the reviewer/.test(JSON.stringify(state(w).threads)));
    check(
      "messages: the other side is notified",
      (state(w).notes || []).some((n) => n.kind === "message")
    );
  }

  /* ---------- the sidebar carries both ---------- */
  {
    const { w } = await load("admin/dashboard.html", ADMIN, SEED);
    const nav = $$(w, "#snav a");
    const links = nav.map((a) => a.textContent.replace(/\s+/g, " ").trim());
    check(
      "sidebar: Messaging is there",
      links.some((l) => /Messaging/.test(l)),
      links.join(" | ")
    );
    check(
      "sidebar: Scheduled sessions is there",
      links.some((l) => /Scheduled sessions/.test(l)),
      links.join(" | ")
    );
    check(
      "sidebar: both point at real pages",
      nav
        .filter((a) => /Messaging|Scheduled sessions/.test(a.textContent))
        .every((a) => /admin\/(messages|sessions)\.html$/.test(a.getAttribute("href")))
    );
  }

  /* ---------- reports against learners, and restrictions ---------- */
  {
    const SEED2 = Object.assign({}, SEED, {
      reports: [
        {
          id: 1700000009001,
          kind: "learner",
          learner: "Wanjiku Muthoni",
          targetName: "Wanjiku Muthoni",
          targetRole: "learner",
          by: "Brian Otieno",
          byRole: "tutor",
          reason: "Asked me to contact them outside PathFinder",
          details: "They shared a phone number in the chat.",
          ts: 1700000000009,
          status: "open"
        }
      ].concat(SEED.reports)
    });
    const { w, errs } = await load("admin/safety.html", ADMIN, SEED2);
    const body = $(w, "#adBox").textContent;
    check("reports: a learner report is in the queue", /Wanjiku Muthoni/.test(body));
    check("reports: the kind is labelled", /Learner/.test(body) && /reported by Brian Otieno \(tutor\)/.test(body));
    check(
      "reports: it offers a restriction, not a suspension",
      Boolean($(w, '[data-adact^="restrict:"]')) && !$(w, '[data-adact="suspend:undefined:1700000009001"]')
    );
    check("reports: KPIs separate the two kinds", /Against learners/.test(body));
    check("reports: nobody restricted yet", /Restricted accounts \(0\)/.test(body));
    check("reports: no page errors", errs.length === 0, errs.join(" | "));

    clickAct(w, "restrict:1700000009001");
    const st = state(w);
    check(
      "restrict: the account is restricted",
      Boolean(st.restricted && st.restricted["wanjiku muthoni"]),
      JSON.stringify(st.restricted)
    );
    check(
      "restrict: the reason is kept",
      /outside PathFinder/.test((st.restricted["wanjiku muthoni"] || {}).reason || "")
    );
    check(
      "restrict: the report is marked resolved",
      (st.reports.find((r) => r.id === 1700000009001) || {}).status === "restricted"
    );
    check(
      "restrict: the reporter is told",
      (st.notes || []).some((n) => n.to === "tutor" && /restricted/i.test(n.title))
    );
    check("restrict: it appears in the restricted list", /Restricted accounts \(1\)/.test($(w, "#adBox").textContent));

    clickAct(w, "unrestrict:wanjiku muthoni");
    check("restrict: it can be lifted", !(state(w).restricted || {})["wanjiku muthoni"]);
    check("restrict: the list empties again", /Restricted accounts \(0\)/.test($(w, "#adBox").textContent));
  }

  /* ---------- the learner and tutor sidebars carry messaging + sessions ---------- */
  {
    const STU = {
      id: "demo-stu",
      name: "Wanjiku Muthoni",
      email: "student@demo.pathfinder.ke",
      role: "student",
      county: "Nakuru",
      demo: true
    };
    const { w } = await load("student/dashboard.html", STU, SEED);
    const links = $$(w, "#snav a");
    check(
      "sidebar: learner Messages",
      links.some((a) => /Messages/.test(a.textContent))
    );
    check(
      "sidebar: learner Scheduled sessions",
      links.some((a) => /Scheduled sessions/.test(a.textContent))
    );
    check(
      "sidebar: both resolve to real pages",
      links
        .filter((a) => /Messages|Scheduled sessions/.test(a.textContent))
        .every((a) => /student\/(messages|sessions)\.html$/.test(a.getAttribute("href")))
    );
    const TUT = { id: "demo-tut", name: "Brian Otieno", role: "tutor", tutorId: "t1", demo: true };
    const { w: tw } = await load("tutor/dashboard.html", TUT, SEED);
    check("sidebar: tutor Messages", $$(w, "#snav a") && $$(tw, "#snav a").some((a) => /Messages/.test(a.textContent)));
  }

  /* ---------- a complaint about the team itself ---------- */
  {
    const SEED3 = Object.assign({}, SEED, {
      reports: [
        {
          id: 1700000009010,
          kind: "team",
          targetName: "PathFinder team",
          targetRole: "team",
          by: "Wanjiku Muthoni",
          byRole: "student",
          reason: "A staff message was rude or unhelpful",
          details: "The reply I got was dismissive.",
          ts: 1700000000010,
          status: "open"
        }
      ]
    });
    const { w } = await load("admin/safety.html", ADMIN, SEED3);
    const body = $(w, "#adBox").textContent;
    check("team: the complaint is in the queue", /PathFinder team/.test(body));
    check("team: it is labelled as a team report", /Team/.test(body));
    check(
      "team: there is no suspend or restrict button for it",
      !$(w, '[data-adact^="suspend:undefined"]') && !$(w, '[data-adact="restrict:1700000009010"]')
    );
    check("team: it can still be resolved", Boolean($(w, '[data-adact="resolve:1700000009010"]')));
  }

  check("no page logged an error", allErrors.length === 0, allErrors.slice(0, 3).join(" | "));

  const bad = results.filter((r) => !r.ok);
  results.forEach((r) =>
    console.log(`${r.ok ? "  ok  " : "FAIL  "}${r.name}${r.ok || !r.extra ? "" : "  → " + r.extra}`)
  );
  console.log(
    bad.length
      ? `\n${bad.length} of ${results.length} admin checks failed`
      : `\n✓ all ${results.length} admin checks passed`
  );
  process.exit(bad.length ? 1 : 0);
})();

function ACCOUNTS_SELECT(w) {
  return $$(w, "[data-role-for]").find((s) => !s.disabled) || null;
}
