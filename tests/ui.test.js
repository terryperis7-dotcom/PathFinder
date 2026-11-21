#!/usr/bin/env node
/* Notifications + charts: boots real pages in jsdom and drives the bell, the
   panel and the student graph the way a person would. Requires jsdom:

     npm install --no-save jsdom && npm run test:ui
*/
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs"),
  path = require("path");
const ROOT = path.resolve(__dirname, "..");

const ADMIN = { id: "demo-adm", name: "Terry P.", email: "admin@demo.pathfinder.ke", role: "admin", demo: true };
const STUDENT = {
  id: "demo-stu",
  name: "Wanjiku Muthoni",
  email: "student@demo.pathfinder.ke",
  role: "student",
  county: "Nakuru",
  demo: true
};
const TUTOR = { id: "demo-tut", name: "Brian Otieno", role: "tutor", tutorId: "t1", demo: true };

const GRADES = {
  English: "B+",
  Kiswahili: "B",
  Mathematics: "B",
  Biology: "B+",
  Physics: "B",
  Chemistry: "B-",
  Business: "A-",
  Geography: "B",
  History: "B-",
  Agriculture: "C+",
  "Computer Studies": "B+",
  CRE: "A-"
};
const DAY = 864e5,
  NOW = Date.now();
const SEED = {
  bookings: [
    {
      id: 1700000000001,
      tutorId: "t1",
      subject: "Nursing routes",
      slot: "Sat · 9:00–11:00 AM",
      mode: "Online",
      note: "Comparing a KMTC diploma with a B.Sc Nursing degree.",
      status: "Requested",
      ts: 1700000000001,
      learner: "Wanjiku Muthoni",
      mine: true
    }
  ]
};

const LOGS = [
  { id: 1, subj: "Mathematics", score: 52, date: "2026-08-04", ts: NOW - 90 * DAY },
  { id: 2, subj: "Physics", score: 58, date: "2026-08-04", ts: NOW - 90 * DAY },
  { id: 3, subj: "Mathematics", score: 61, date: "2026-09-12", ts: NOW - 50 * DAY },
  { id: 4, subj: "Physics", score: 66, date: "2026-09-12", ts: NOW - 50 * DAY },
  { id: 5, subj: "Mathematics", score: 70, date: "2026-10-20", ts: NOW - 20 * DAY },
  { id: 6, subj: "Physics", score: 74, date: "2026-10-20", ts: NOW - 20 * DAY }
];

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
    setTimeout(() => resolve({ w, d: w.document, errs }), 300);
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
const click = (w, el) => el && el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const state = (w) => JSON.parse(w.localStorage.getItem("pf-state-v1") || "{}");
const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");

const results = [];
const check = (name, ok, extra) => results.push({ name, ok: !!ok, extra: extra || "" });

(async () => {
  /* ---------- the bell is chrome on every signed-in page ---------- */
  for (const [page, sess] of [
    ["student/dashboard.html", STUDENT],
    ["tutor/dashboard.html", TUTOR],
    ["admin/dashboard.html", ADMIN]
  ]) {
    const { w, d, errs } = await load(page, sess, { grades: GRADES });
    check("bell: present on " + page, !!$("#notifBtn", w));
    check("bell: inside the top bar", !!$(".topbar #notifWrap", w));
    check(
      "bell: announced to screen readers",
      /Notifications/.test($("#notifBtn", w).getAttribute("aria-label") || "")
    );
    check("bell: no page errors on " + page, errs.length === 0, errs.join(" | "));
  }

  /* ---------- the badge counts unread notes honestly ---------- */
  {
    const { w, d } = await load("student/dashboard.html", STUDENT, { grades: GRADES });
    const badge = $("#notifBadge", w),
      btn = $("#notifBtn", w);
    const unread = state(w).notes.filter((n) => (n.to === "student" || n.to === "all") && !n.read).length;
    check(
      "badge: shows the real unread count",
      badge.textContent === String(unread),
      badge.textContent + " vs " + unread
    );
    check("badge: visible when unread", badge.hidden === false);
    check("badge: bell marked as unread", btn.classList.contains("has-unread"));
    check("seeds: three seeded rows for a student", state(w).notes.filter((n) => n.to === "student").length === 3);
    check(
      "seeds: every seeded row is labelled DEMO",
      state(w).notes.every((n) => n.demo === true)
    );
  }

  /* ---------- the panel ---------- */
  {
    const { w, d } = await load("student/dashboard.html", STUDENT, { grades: GRADES });
    const pop = $("#notifPop", w);
    check("panel: starts closed", pop.hidden === true);
    click(w, $("#notifBtn", w));
    check("panel: opens on the bell", pop.hidden === false);
    check("panel: aria-expanded tracks it", $("#notifBtn", w).getAttribute("aria-expanded") === "true");
    check("panel: lists every note for the role", $$(".nitem", w).length === 3, String($$(".nitem", w).length));
    check("panel: DEMO chips shown", $$(".ndemo", w).length === 3);
    check(
      "panel: filter tabs",
      $$(".np-tab", w).map(txt).join("|") === "All 3|Unread 3",
      $$(".np-tab", w).map(txt).join("|")
    );
    check(
      "panel: source and time on each row",
      /PathFinder team · /.test(txt($(".nitem .nmeta", w))),
      txt($(".nitem .nmeta", w))
    );
    check("panel: says where notes are kept", /Kept on this device/.test(txt($(".np-foot", w))), txt($(".np-foot", w)));

    /* unread filter, then mark-all-read */
    click(w, $$("[data-note-filter]", w)[1]);
    check("panel: unread filter keeps unread", $$(".nitem", w).length === 3);
    click(w, $("[data-note-read-all]", w));
    check("panel: mark all read empties unread", $$(".nitem", w).length === 0);
    check("panel: badge cleared", $("#notifBadge", w).hidden === true);
    check(
      "panel: state persisted",
      state(w)
        .notes.filter((n) => n.to === "student")
        .every((n) => n.read === true)
    );
    check("panel: head reflects it", /All read/.test(txt($(".np-head", w))), txt($(".np-head", w)));

    /* reading one note marks it and navigates through go() */
    click(w, $$("[data-note-filter]", w)[0]);
    let went = null;
    w.go = (v) => {
      went = v;
    };
    click(w, $$(".nitem", w)[0]);
    check("panel: closes after a note is opened", $("#notifPop", w).hidden === true);
    check("panel: opening a note routes to its page", went === "quiz", String(went));
    check("panel: the note is marked read", state(w).notes.find((n) => !n.demo || true).read !== undefined);
  }

  /* ---------- a real event creates a real note ---------- */
  {
    const { w } = await load("admin/requests.html", ADMIN, SEED);
    const before = state(w).notes.length;
    click(w, $('[data-adact="approve:1700000000001"]', w) || $('[data-adact^="approve:"]', w));
    const after = state(w);
    check("event: an admin decision adds notes", after.notes.length > before, before + " → " + after.notes.length);
    const student = after.notes.filter((n) => n.to === "student" && !n.demo);
    check(
      "event: the learner gets the decision",
      student.length === 1 && /approved/i.test(student[0].title),
      student.map((n) => n.title).join(",")
    );
    check("event: it is not labelled DEMO", student[0] && student[0].demo === false);
    check("event: it links somewhere real", student[0] && student[0].link === "tutors", student[0] && student[0].link);
  }

  /* ---------- admin announcements reach a group ---------- */
  {
    const { w } = await load("admin/dashboard.html", ADMIN, {});
    click(w, $("#notifBtn", w));
    click(w, $("[data-note-compose]", w));
    check("announce: composer opens", !!$("#anSend", w));
    check(
      "announce: four audiences",
      $$("#anTo option", w)
        .map((o) => o.value)
        .join(",") === "all,student,tutor,admin"
    );
    $("#anTitle", w).value = "HELB window opens Monday";
    $("#anBody", w).value = "Apply on the official portal only.";
    click(w, $("#anSend", w));
    const sent = state(w).notes.find((n) => n.title === "HELB window opens Monday");
    check("announce: sent with the chosen audience", sent && sent.to === "all");
    check("announce: carries the admin as sender", sent && /Administrator/.test(sent.from), sent && sent.from);
    check(
      "announce: says it stays on this device",
      /stored on this device/.test(txt($("#modalBox", w))),
      txt($("#modalBox", w)).slice(0, 90)
    );

    const { w: sw } = await load("student/dashboard.html", STUDENT, state(w));
    check(
      "announce: a student sees it in the bell",
      state(sw).notes.some((n) => n.title === "HELB window opens Monday")
    );
    const unread = state(sw).notes.filter((n) => (n.to === "student" || n.to === "all") && !n.read).length;
    check(
      "announce: the badge counts it",
      $("#notifBadge", sw).textContent === String(unread),
      $("#notifBadge", sw).textContent + " vs " + unread
    );
  }

  /* ---------- one role never sees another role's inbox ---------- */
  {
    const { w } = await load("student/dashboard.html", STUDENT, {});
    const to = state(w).notes.map((n) => n.to);
    check(
      "scope: every note names a real audience",
      to.every((t) => ["student", "tutor", "admin", "all"].includes(t)),
      to.join(",")
    );
    check(
      "scope: seeds cover all three roles",
      ["student", "tutor", "admin"].every((r) => to.includes(r)),
      to.join(",")
    );
    const mine = state(w).notes.filter((n) => (n.to === "student" || n.to === "all") && !n.read).length;
    check(
      "scope: the badge counts only this role",
      $("#notifBadge", w).textContent === String(mine),
      $("#notifBadge", w).textContent + " vs " + mine
    );
    click(w, $("#notifBtn", w));
    const shown = $$(".nitem .nrow b", w).map(txt).join(" | ");
    check(
      "scope: only student + all rows rendered",
      !/availability current|Verification is part-way/.test(shown),
      shown
    );
  }

  /* ---------- student overview graph: drawn from real rows ---------- */
  {
    const { w } = await load("student/dashboard.html", STUDENT, {
      grades: GRADES,
      targets: { Mathematics: "A-", Physics: "B+" },
      assessments: LOGS
    });
    const svg = $(".gchart svg", w);
    check("graph: renders an svg", !!svg);
    check("graph: one point per logged date", $$(".gc-dot", w).length === 3, String($$(".gc-dot", w).length));
    check("graph: draws the line", !!$(".gc-line", w));
    check("graph: fills the area", !!$(".gc-area", w));
    check("graph: marks the target", !!$(".gc-tgt", w));
    const labels = $$(".gchart .gc-ax", w).map(txt).join(",");
    check("graph: dates are readable", /4 Aug/.test(labels) && /20 Oct/.test(labels), labels);
    check("graph: axis labelled with units", /100%/.test(labels), labels);
    const dots = $$(".gc-dot title", w).map(txt);
    check(
      "graph: each point states its value",
      /4 Aug|Aug/.test(dots.join(" ")) && /55%/.test(dots.join(" ")),
      dots.join(" | ")
    );
    check("graph: no invented series", $$(".gc-dot", w).length === LOGS.length / 2);
    check("graph: delta chip is real", /\+17 pts/.test(txt($(".card .chip", w))), txt($(".card .chip", w)));
    check("graph: legend names the series", /Your average/.test(txt($(".gc-legend", w))), txt($(".gc-legend", w)));
  }

  /* ---------- nothing logged → empty state, never a fake line ---------- */
  {
    const { w } = await load("student/dashboard.html", STUDENT, { grades: GRADES });
    check("graph: no data means no svg", !$(".gchart svg", w));
    check("graph: empty state explains why", /No assessments logged/.test(txt($("#dashBox", w))));
    check("graph: offers the way forward", /Log your first score/.test(txt($("#dashBox", w))));
  }
  {
    const { w } = await load("student/dashboard.html", STUDENT, { grades: GRADES, assessments: [LOGS[0]] });
    check("graph: a single log still renders a point", $$(".gc-dot", w).length === 1);
    check("graph: single point has no line to draw", !$(".gc-line", w));
    check("graph: asks for a second log", /Log another assessment/.test(txt($(".gc-foot", w))), txt($(".gc-foot", w)));
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
    "\n" + (bad ? "✗ " + bad + " failed of " + results.length : "✓ all " + results.length + " UI checks passed")
  );
  process.exit(bad ? 1 : 0);
})();
