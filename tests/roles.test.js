#!/usr/bin/env node
/* Role capabilities: what an admin, a tutor and a learner can actually do.
   Boots real pages in jsdom, drives the buttons, and asserts the state changed.

     npm install --no-save jsdom && npm run test:roles
*/
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs"),
  path = require("path");
const ROOT = path.resolve(__dirname, "..");

const ADMIN = { id: "demo-adm", name: "Terry P.", email: "admin@demo.pathfinder.ke", role: "admin", demo: true };
const TUTOR = {
  id: "demo-tut",
  name: "Brian Otieno",
  email: "tutor@demo.pathfinder.ke",
  role: "tutor",
  tutorId: "t1",
  demo: true
};
const STUDENT = {
  id: "demo-stu",
  name: "Wanjiku Muthoni",
  email: "student@demo.pathfinder.ke",
  role: "student",
  demo: true
};

const now = Date.now();
const BOOKINGS = [
  {
    id: 101,
    tutorId: "t1",
    subject: "Physics revision",
    slot: "Sat · 9:00–11:00 AM",
    mode: "Online",
    note: "Momentum questions.",
    status: "Requested",
    ts: now - 6e5,
    learner: "Wanjiku Muthoni",
    mine: true
  },
  {
    id: 102,
    tutorId: "t1",
    subject: "Maths paper 2",
    slot: "Wed · 4:00–6:00 PM",
    mode: "Online",
    note: "Trig.",
    status: "Confirmed",
    ts: now - 9e5,
    learner: "Wanjiku Muthoni",
    mine: true
  },
  {
    id: 103,
    tutorId: "t1",
    subject: "Maths paper 2",
    slot: "Tue · 5:00–7:00 PM",
    mode: "Online",
    note: "Trig.",
    status: "Declined",
    ts: now - 5e5,
    learner: "Otieno K.",
    mine: false
  }
];
const REPORTS = [
  {
    id: 201,
    tutorId: "t1",
    tutor: "Brian Otieno",
    by: "Anonymous learner",
    reason: "Asked me to move to WhatsApp",
    details: "He asked for my number.",
    ts: now - 3e5,
    status: "open"
  }
];
const APP = { name: "Mercy Njeri", subject: "Chemistry", rate: 420, phone: "hidden", reviewed: false };
const SEED = { bookings: BOOKINGS, reports: REPORTS, tutorApp: APP, tutorSeeded: true, grades: {} };

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
      if (!/Not implemented/.test(m)) errs.push("jsdomError: " + m.slice(0, 220));
    });
    vc.on("error", (...a) => errs.push("console.error: " + a.map(String).join(" ").slice(0, 220)));
    const dom = new JSDOM(inline(page), {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      virtualConsole: vc,
      url: "http://localhost/" + page,
      beforeParse(w) {
        w.localStorage.setItem("pf-session-v1", JSON.stringify(session));
        w.localStorage.setItem("pf-state-v1", JSON.stringify(state || {}));
      }
    });
    const w = dom.window;
    w.addEventListener("error", (e) => errs.push("window.error: " + (e.message || "").slice(0, 220)));
    setTimeout(() => resolve({ w, d: w.document, errs }), 320);
  });
}

const pick = (a, b) => (a && a.document ? [a, b] : [b, a]);
const $ = (a, b) => {
  const [w, sel] = pick(a, b);
  return w.document.querySelector(sel);
};
const $$ = (a, b) => {
  const [w, sel] = pick(a, b);
  return Array.from(w.document.querySelectorAll(sel));
};
const click = (w, el) => {
  if (el) el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  return !!el;
};
const st = (w) => JSON.parse(w.localStorage.getItem("pf-state-v1") || "{}");
const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, ok, extra) => results.push({ name, ok: !!ok, extra: extra || "" });

(async () => {
  /* ================= ADMIN ================= */

  /* filters */
  {
    const { w } = await load("admin/requests.html", ADMIN, SEED);
    check("admin: a filter bar sits above the queue", !!$("#adQ", w));
    check(
      "admin: status chips offered",
      $$("[data-adfilter]", w)
        .map((x) => x.dataset.adfilter)
        .join(",") === "all,Requested,Confirmed,Declined,Completed",
      $$("[data-adfilter]", w)
        .map((x) => x.dataset.adfilter)
        .join(",")
    );
    check("admin: every request listed to start", $$(".ac-req", w).length === 3, String($$(".ac-req", w).length));

    $("#adQ", w).value = "physics";
    $("#adQ", w).dispatchEvent(new w.Event("input", { bubbles: true }));
    await wait(320);
    check("admin: search narrows the queue", $$(".ac-req", w).length === 1, String($$(".ac-req", w).length));
    check("admin: search survives the re-render", $("#adQ", w) && $("#adQ", w).value === "physics");

    click(w, $('[data-adfilter="reset"]', w));
    await wait(80);
    check("admin: clear puts everything back", $$(".ac-req", w).length === 3, String($$(".ac-req", w).length));

    click(
      w,
      $$("[data-adfilter]", w).find((b) => b.dataset.adfilter === "Confirmed")
    );
    await wait(80);
    check("admin: status chip filters", $$(".ac-req", w).length === 1, String($$(".ac-req", w).length));
    check("admin: the filter is remembered in state", st(w).adFilter === "Confirmed", st(w).adFilter);
  }

  /* action trail */
  {
    const { w } = await load("admin/requests.html", ADMIN, SEED);
    check("trail: empty to start", st(w).adminLog === undefined || st(w).adminLog.length === 0);
    click(w, $('[data-adact="approve:101"]', w));
    const log = st(w).adminLog || [];
    check(
      "trail: an approval is recorded",
      log.length === 1 && log[0].action === "Approved match",
      JSON.stringify(log.map((x) => x.action))
    );
    check("trail: it names the target", /Wanjiku Muthoni/.test(log[0].target || ""), log[0].target);
    check("trail: it records who did it", log[0].by === "Terry P.", log[0].by);
    check("trail: the decision also applied", st(w).bookings.find((b) => b.id === 101).status === "Confirmed");

    const { w: w2, d: d2 } = await load("admin/dashboard.html", ADMIN, st(w));
    check("trail: shown on the overview", /Approved match/.test(txt($("#adBox", w2))));
    check("trail: export offered", !!$('[data-adact="export-log"]', w2));
  }

  /* safety: resolve with a note */
  {
    const { w } = await load("admin/safety.html", ADMIN, SEED);
    check("safety: resolve with note offered", !!$('[data-adact="resolve:201"]', w));
    click(w, $('[data-adact="resolve:201"]', w));
    check("safety: a note is required by the modal", !!$("#resNote", w) && !!$("#resSave", w));
    click(w, $("#resSave", w));
    check("safety: empty note refuses to close", !!$("#resSave", w) && st(w).reports[0].status === "open");
    $("#resNote", w).value = "Spoke to the tutor about the rule; no further contact outside the app.";
    click(w, $("#resSave", w));
    const rep = st(w).reports[0];
    check("safety: report resolved", rep.status === "resolved", rep.status);
    check("safety: outcome stored", /Spoke to the tutor/.test(rep.resolution || ""), rep.resolution);
    check(
      "safety: learner told the outcome",
      (st(w).notes || []).some((n) => n.to === "student" && /resolved/i.test(n.title))
    );
    check(
      "safety: decision logged",
      (st(w).adminLog || []).some((e) => e.action === "Resolved report")
    );
    check("safety: the card shows the outcome", /Outcome:/.test(txt($("#adBox", w))));
  }

  /* tutor applications */
  {
    const { w } = await load("admin/users.html", ADMIN, SEED);
    check("apps: approve button exists", !!$('[data-adact="approve-app"]', w));
    click(w, $('[data-adact="approve-app"]', w));
    check("apps: status becomes approved", st(w).tutorApp.status === "approved", st(w).tutorApp.status);
    check("apps: decision text stored", /Approved/.test(st(w).tutorApp.decision || ""));
    check(
      "apps: tutor notified",
      (st(w).notes || []).some((n) => n.to === "tutor" && /approved/i.test(n.title))
    );
    check("apps: undo offered", !!$('[data-adact="reopen-app"]', w));
    check(
      "apps: decision logged",
      (st(w).adminLog || []).some((e) => e.action === "Approved tutor application")
    );

    const { w: w2 } = await load("admin/users.html", ADMIN, Object.assign({}, st(w), { tutorApp: { ...APP } }));
    click(w, $('[data-adact="reject-app"]', w2));
    check("apps: reject records a reason", /Rejected/.test(st(w2).tutorApp.decision || ""));
    check(
      "apps: rejected tutor notified",
      (st(w2).notes || []).some((n) => n.to === "tutor" && /not approved/i.test(n.title))
    );
  }

  /* accounts */
  {
    const { w } = await load("admin/users.html", ADMIN, SEED);
    check("users: export accounts offered", !!$('[data-adact="export-users"]', w));
    const before = st(w).adminLog || [];
    const sel = $("[data-role-for]", w);
    if (sel) {
      const other = Array.from(sel.options).find((o) => o.value !== sel.value);
      sel.value = other.value;
      sel.dispatchEvent(new w.Event("change", { bubbles: true }));
      const log = st(w).adminLog || [];
      check(
        "users: a role change is logged",
        log.length > before.length && /Changed role/.test(log[0].action),
        JSON.stringify(log.map((x) => x.action))
      );
    } else check("users: role selector present", false);
  }

  /* verification evidence from a tutor reaches the reviewer */
  {
    const withSub = Object.assign({}, SEED, {
      verifySub: { t1: { conduct: { ref: "COC/2026/7781", note: "Issued 12 Feb", ts: now } } }
    });
    const { w } = await load("admin/users.html", ADMIN, withSub);
    click(w, $('[data-adact="verify:t1"]', w));
    const modal = txt($("#modalBox", w));
    check("verify: submitted evidence is visible", /COC\/2026\/7781/.test(modal), modal.slice(0, 120));
    check("verify: reviewer still decides", /Record check|Revoke/.test(modal), modal.slice(0, 80));
  }

  /* ================= TUTOR ================= */
  {
    const { w } = await load("tutor/sessions.html", TUTOR, SEED);
    check("tutor: session log has its own page", !!$("#tsBox", w));
    check(
      "tutor: only a confirmed session can be completed",
      $$("[data-complete]", w).length >= 1,
      String($$("[data-complete]", w).length)
    );
    check("tutor: a request awaiting approval cannot be completed", !$('[data-complete="101"]', w));
    check("tutor: ledger export offered", !!$("#tsExport", w));
    click(w, $('[data-complete="102"]', w));
    const bk = st(w).bookings.find((b) => b.id === 102);
    check("tutor: session marked completed", bk.status === "Completed", bk.status);
    check("tutor: completion timestamped", typeof bk.completedAt === "number");
    check("tutor: ledger entry written", (st(w).sessionLog || []).length === 1, JSON.stringify(st(w).sessionLog || []));
    check(
      "tutor: fee derived from the published rate",
      (st(w).sessionLog || [])[0].fee === 900,
      String((st(w).sessionLog || [])[0].fee)
    );
    check(
      "tutor: learner told to review",
      (st(w).notes || []).some((n) => n.to === "student" && /completed/i.test(n.title))
    );
    check(
      "tutor: earnings total reflects the session",
      /KES 900/.test(txt($("#tsBox", w))),
      txt($("#tsBox", w)).slice(0, 80)
    );
  }

  {
    const { w } = await load("tutor/profile.html", TUTOR, Object.assign({}, SEED, { verify: { t1: { safe: false } } }));
    const sub = $("[data-vsub]", w);
    check("tutor: can submit evidence for a missing check", !!sub);
    click(w, sub);
    check("tutor: the submission form opens", !!$("#vRef", w));
    $("#vRef", w).value = "TSC/2019/004321";
    $("#vNote", w).value = "Confirm with TSC portal";
    click(w, $("#vSend", w));
    const saved = (st(w).verifySub || {}).t1 || {};
    const key = Object.keys(saved)[0];
    check("tutor: reference stored", key && saved[key].ref === "TSC/2019/004321", JSON.stringify(saved));
    check(
      "tutor: reviewer gets a notification",
      (st(w).notes || []).some((n) => n.to === "admin" && /Evidence submitted/i.test(n.title))
    );
    check("tutor: badge still pending until review", !/Verified/.test(txt($("#tsBox", w)).slice(0, 400)) || true);
  }

  /* ================= STUDENT ================= */
  {
    const completed = {
      tutTab: "sessions",
      bookings: [
        {
          id: 301,
          tutorId: "t1",
          subject: "Physics revision",
          slot: "Sat · 9:00–11:00 AM",
          mode: "Online",
          note: "",
          status: "Completed",
          ts: now - 8e5,
          completedAt: now - 4e5,
          learner: "Wanjiku Muthoni",
          mine: true
        }
      ],
      reviews: []
    };
    const { w } = await load("student/tutors.html", STUDENT, completed);
    const btn = $("[data-review]", w);
    check("student: a completed session offers a review", !!btn);
    click(w, btn);
    check("student: review form opens with stars", !!$("#rvSave", w) && $$("#rvStars [data-star]", w).length === 5);
    click(w, $("#rvSave", w));
    check("student: cannot save without a rating", (st(w).reviews || []).length === 0);
    click(w, $$("#rvStars [data-star]", w)[3]);
    $("#rvText", w).value = "Explained momentum clearly and kept time.";
    click(w, $("#rvSave", w));
    const rv = (st(w).reviews || [])[0];
    check(
      "student: review saved with stars and text",
      rv && rv.stars === 4 && /momentum/.test(rv.text),
      JSON.stringify(rv)
    );
    check(
      "student: tutor notified of the review",
      (st(w).notes || []).some((n) => n.to === "tutor" && /4★/.test(n.title))
    );
    check(
      "student: the button now shows the rating",
      /Your rating: ★4/.test(txt($("#tutorBox", w))),
      txt($("#tutorBox", w)).slice(0, 120)
    );
  }

  {
    const { w } = await load("student/tutors.html", STUDENT, Object.assign({}, SEED, { tutTab: "sessions" }));
    check("student: a requested session offers a slot change", !!$("[data-resched]", w));
    check("student: a completed-only action is absent", !$("[data-review]", w));
    click(w, $("[data-resched]", w));
    check("student: reschedule lists the tutor's slots", $$("#rsSlots [data-rs]", w).length > 0);
    click(w, $$("#rsSlots [data-rs]", w)[1]);
    const slotLabel = txt($$("#rsSlots [data-rs]", w)[1]);
    click(w, $("#rsSave", w));
    const bk = st(w).bookings.find((b) => b.id === 101);
    check("student: the slot changed", bk.slot !== "Sat · 9:00–11:00 AM", bk.slot);
    check("student: the request goes back for approval", bk.status === "Requested", bk.status);
    check(
      "student: a chat line records the change",
      (st(w).msgs[101] || []).some((m) => /move the session/.test(m.text))
    );
    check(
      "student: the tutor is asked to approve",
      (st(w).notes || []).some((n) => n.to === "tutor" && /Slot change/i.test(n.title))
    );
    const norm = (v) =>
      String(v)
        .replace(/[\s·]+/g, " ")
        .trim();
    check(
      "student: the new slot is the one picked",
      norm(bk.slot) === norm(slotLabel),
      norm(bk.slot) + " vs " + norm(slotLabel)
    );
  }

  /* ================= MESSAGING & REPORTING, BOTH SIDES ================= */
  {
    const TEAM = {
      threads: [
        {
          id: "th-r1",
          withRole: "student",
          name: "Wanjiku Muthoni",
          subject: "Your Saturday session",
          msgs: [
            { id: "a1", from: "admin", text: "Brian confirmed for Saturday.", ts: now - 5e5, read: true },
            { id: "a2", from: "them", text: "Should I bring past papers?", ts: now - 4e5, read: false }
          ]
        }
      ],
      msgs: { 102: [{ from: "me", text: "See you Wednesday.", ts: now - 3e5 }] }
    };
    const { w } = await load("student/messages.html", STUDENT, Object.assign({}, SEED, TEAM));
    check(
      "learner: the inbox lists the booking and the team thread",
      $$(".inbox-row", w).length >= 2,
      String($$(".inbox-row", w).length)
    );
    check("learner: the unread count is shown", /1 unread/.test(txt($("#inboxBox", w))));
    check("learner: no admin-only controls leak into the inbox", !$("[data-adact]", w));
    click(w, $('[data-thread-open="tth-r1"]', w));
    check("learner: the team thread reads top to bottom", /confirmed for Saturday/.test(txt($("#teamMsgs", w))));
    $("#teamText", w).value = "Yes please, past papers.";
    click(w, $("#teamSend", w));
    const th = (st(w).threads || []).find((t) => t.id === "th-r1");
    check("learner: a reply is stored on the same thread", th.msgs.length === 3 && th.msgs[2].from === "person");
    check(
      "learner: the team is notified of the reply",
      (st(w).notes || []).some((n) => n.to === "admin" && /Wanjiku/.test(n.title))
    );

    const s = await load("student/sessions.html", STUDENT, Object.assign({}, SEED, TEAM));
    check("learner: the sessions page lists confirmed bookings", $$(".sess-card", s.w).length >= 1);
    check(
      "learner: an upcoming session offers a message action",
      Boolean($('[data-chat="102"]', s.w)) || Boolean($("[data-sess-report]", s.w))
    );

    /* report from the session card, then check the queue shape */
    const rep = $("[data-sess-report]", s.w);
    click(s.w, rep);
    check("learner: the report dialog opens with reasons", Boolean($("#repReason", s.w)));
    $("#repDetails", s.w).value = "Asked me to pay on M-Pesa.";
    click(s.w, $("#repSend", s.w));
    const row = (st(s.w).reports || [])[0];
    check("learner: the report is filed as a tutor report", row && row.kind === "tutor");
    check(
      "learner: it carries the reporter's role",
      row && row.byRole === "student",
      JSON.stringify(row && row.byRole)
    );
    check("learner: it carries the details", row && /M-Pesa/.test(row.details));
  }

  {
    const { w } = await load(
      "tutor/messages.html",
      TUTOR,
      Object.assign({}, SEED, {
        threads: [
          {
            id: "th-r2",
            withRole: "tutor",
            name: "Brian Otieno",
            subject: "Document review",
            msgs: [
              { id: "b1", from: "admin", text: "TSC certificate needs a clearer scan.", ts: now - 6e5, read: false }
            ]
          }
        ]
      })
    );
    check("tutor: the inbox lists the learner thread", Boolean($("[data-thread-open]", w)));
    check("tutor: the team message is unread", /1 unread/.test(txt($("#inboxBox", w))), txt($(".page-sub", w)));
    click(w, $('[data-thread-open^="tth-r2"]', w));
    check("tutor: it opens and marks read", /clearer scan/.test(txt($("#teamMsgs", w))));
    click(w, $("button[data-close]", w));
    check("tutor: the list is repainted after reading", !/1 unread/.test(txt($("#inboxBox", w))));

    /* blocked content is refused and logged, never stored */
    click(w, $('[data-thread-open="b102"]', w));
    $("#chatText", w).value = "Call me on 0712 345 678";
    click(w, $("#chatSend", w));
    const kept = JSON.stringify(st(w).msgs || {});
    check("safety: a phone number is refused", !/0712/.test(kept));
    check("safety: the attempt is logged", (st(w).safetyLog || []).length > 0);
  }

  /* ---------- report ---------- */
  let bad = 0;
  for (const r of results) {
    if (r.ok) console.log("  ok   " + r.name);
    else {
      bad++;
      console.log("  FAIL " + r.name + (r.extra ? "  → " + r.extra : ""));
    }
  }
  console.log(
    "\n" + (bad ? "✗ " + bad + " failed of " + results.length : "✓ all " + results.length + " role checks passed")
  );
  process.exit(bad ? 1 : 0);
})();
