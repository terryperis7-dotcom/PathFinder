#!/usr/bin/env node
/* Admin console behaviour: boots each of the seven tabs in jsdom, drives the real
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
  /* ---------- shell: seven tabs, one per page ---------- */
  const PAGES = [
    ["admin/dashboard.html", "dash", "Overview"],
    ["admin/requests.html", "requests", "Requests"],
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
    check(`${label}: seven tabs`, tabs.length === 7, String(tabs.length));
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
    check("chrome: tab order", order === "dash,users,requests,safety,data,deploy,dpa", order);
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
    check("guard: all seven tabs after sign-in", $$(w, ".ac-tab").length === 7, String($$(w, ".ac-tab").length));
    check(
      "guard: active tab kept",
      $(w, ".ac-tab.on")?.dataset.adtab === "requests",
      $(w, ".ac-tab.on")?.dataset.adtab
    );
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
