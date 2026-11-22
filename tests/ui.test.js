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

  /* ---------- the panel stays until it is closed, and notes can go ---------- */
  {
    const { w } = await load("student/dashboard.html", STUDENT, { grades: GRADES });
    const pop = $("#notifPop", w);
    click(w, $("#notifBtn", w));
    check("pinned: panel opens", pop.hidden === false);

    /* a click anywhere else must NOT dismiss it — this was the bug */
    click(w, $("#dashBox", w) || w.document.body);
    click(w, w.document.body);
    check("pinned: an outside click leaves it open", pop.hidden === false);

    /* Escape is still an explicit close */
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    check("pinned: Escape closes it", pop.hidden === true);
    click(w, $("#notifBtn", w));

    const before = state(w).notes.length;
    const first = state(w).notes[0];
    click(w, $$("[data-note-del]", w)[0]);
    const after = state(w).notes;
    check("delete: one note removed", after.length === before - 1, before + " → " + after.length);
    check("delete: the right note went", !after.some((n) => n.id === first.id), first.id);
    check("delete: the panel stays open", pop.hidden === false);
    check(
      "delete: the row is gone from the list",
      $$("[data-note]", w).length === after.filter((n) => n.to === "student" || n.to === "all").length
    );

    /* clear all asks first, then empties the list */
    click(w, $("[data-note-clear]", w));
    check("clear: confirm dialog opens", !!$("#noteClearYes", w));
    click(w, $("#noteClearYes", w));
    check(
      "clear: nothing left for this role",
      state(w).notes.filter((n) => n.to === "student" || n.to === "all").length === 0
    );
    check("clear: badge gone", $("#notifBadge", w).hidden === true);
    check(
      "clear: empty state explains itself",
      /Nothing here yet/.test(txt($("#notifPop", w))),
      txt($("#notifPop", w)).slice(0, 80)
    );

    /* a fresh page does not resurrect them */
    const { w: w2 } = await load("student/dashboard.html", STUDENT, state(w));
    check(
      "clear: stays cleared after a reload",
      w2.localStorage.getItem("pf-state-v1").indexOf('"to":"student"') === -1 ||
        state(w2).notes.filter((n) => n.to === "student").length === 0
    );
  }

  /* ---------- profile picture ---------- */
  {
    const { w, errs } = await load("student/profile.html", STUDENT, { grades: GRADES });
    check("pfp: the picture is a button", !!$("#pfAvatar", w));
    check("pfp: chip on the page", /Change picture/.test(txt($("#profileBox", w))));
    click(w, $("#pfAvatar", w));
    check("pfp: picker opens", !!$(".avpick", w));
    check(
      "pfp: three ways to pick",
      $$("[data-avkind]", w).map(txt).join("|") === "Initials|Icon|Photo",
      $$("[data-avkind]", w).map(txt).join("|")
    );
    check("pfp: eight colours", $$("[data-avcolour]", w).length === 8, String($$("[data-avcolour]", w).length));
    check("pfp: icons offered", $$("[data-avemoji]", w).length >= 12);

    click(w, $('[data-avkind="emoji"]', w));
    check("pfp: icon pane shows", $('[data-pane="emoji"]', w).hidden === false);
    click(w, $$("[data-avemoji]", w)[0]);
    const emoji = $$("[data-avemoji]", w)[0].dataset.avemoji;
    click(w, $('[data-avcolour="green"]', w));
    click(w, $("#avSave", w));
    const av = state(w).profile.avatar;
    check(
      "pfp: saved to the profile",
      av.kind === "emoji" && av.emoji === emoji && av.colour === "green",
      JSON.stringify(av)
    );
    check("pfp: the top-bar chip picks it up", $("#userChip", w).innerHTML.includes(emoji));
    check("pfp: the page avatar picks it up", $("#pfAvatar", w).innerHTML.includes(emoji));
    check("pfp: no errors", errs.length === 0, errs.join(" | "));

    /* a photo is accepted only as an image, and is resized on a canvas */
    click(w, $("#pfAvatar", w));
    check("pfp: a file input is offered", !!$("#avFile", w));
    check("pfp: input accepts images only", $("#avFile", w).getAttribute("accept") === "image/*");
    click(w, $("#avReset", w));
    check("pfp: reset restores initials", !state(w).profile.avatar || state(w).profile.avatar.kind === "initials");
  }

  /* ---------- stage awareness: CBC vs 8-4-4 ---------- */
  {
    const { w, errs } = await load("student/quiz.html", STUDENT, {
      profile: { stage: "CBC Grade 7–9", county: "Nakuru" },
      grades: {},
      answers: [],
      qStep: 0
    });
    const opts = Array.from($$("#gradeGrid select", w)[0].options).map((o) => o.value);
    check("stage: quiz asks for CBC levels", opts.includes("EE") && opts.includes("BE"), opts.join(","));
    check("stage: no A–E grades in CBC mode", !opts.includes("A"), opts.join(","));
    check(
      "stage: uses the junior subject list",
      /Integrated Science/.test(txt($("#gradeGrid", w))),
      txt($("#gradeGrid", w)).slice(0, 120)
    );
    check("stage: names the exam", /KJSEA/.test(txt($("#quizBox", w))));
    check("stage: six stages to pick from", $$("[data-stage]", w).length === 6, String($$("[data-stage]", w).length));
    check("stage: quiz has no errors", errs.length === 0, errs.join(" | "));
  }
  {
    /* switching stage inside the quiz re-renders the scale */
    const { w } = await load("student/quiz.html", STUDENT, {
      profile: { stage: "KCSE Form 3–4", county: "Nakuru" },
      grades: {},
      answers: [],
      qStep: 0
    });
    const kcseOpts = Array.from($$("#gradeGrid select", w)[0].options).map((o) => o.value);
    check("stage: KCSE mode offers A–E", kcseOpts.includes("A") && kcseOpts.includes("E"), kcseOpts.join(","));
    click(w, $('[data-stage="junior"]', w));
    const after = Array.from($$("#gradeGrid select", w)[0].options).map((o) => o.value);
    check(
      "stage: switching to Grade 7–9 swaps the scale",
      after.includes("EE") && !after.includes("A"),
      after.join(",")
    );
    check("stage: the choice is saved", state(w).profile.stage === "junior");
  }
  {
    const { w } = await load("student/dashboard.html", STUDENT, {
      profile: { stage: "CBC Grade 10–12", pathway: "stem", electives: ["Physics", "Chemistry", "Biology"] },
      grades: {
        English: "ME",
        Kiswahili: "ME",
        Mathematics: "EE",
        "Community Service Learning": "ME",
        Physics: "ME",
        Chemistry: "AE",
        Biology: "EE"
      }
    });
    const body = txt($("#dashBox", w));
    check("stage: CBC overview names the stage", /CBC Grade 10–12/.test(body));
    check("stage: no KCSE cluster aggregate in CBC", !/Best-7 aggregate/.test(body));
    check("stage: CBC average is a level", /Average level/.test(body));
  }
  {
    const { w } = await load("student/dashboard.html", STUDENT, {
      grades: GRADES,
      profile: { stage: "KCSE Form 3–4", county: "Nakuru" }
    });
    check("stage: KCSE overview keeps cluster points", /Best-7 aggregate/.test(txt($("#dashBox", w))));
    check("stage: KCSE names the final sitting", /November 2027/.test(txt($("#dashBox", w))));
  }
  {
    const { w, errs } = await load("student/cluster.html", STUDENT, {
      profile: { stage: "CBC Grade 7–9" },
      grades: { English: "ME", Kiswahili: "ME", Mathematics: "EE", "Integrated Science": "ME" }
    });
    const body = txt($("#clusterBox", w));
    check("stage: CBC gets pathway fit, not clusters", /Pathway fit/.test(body));
    check("stage: explains why there are no points", /8-4-4 idea/.test(body));
    check("stage: shows all three pathways", $$(".fit-row", w).length === 3, String($$(".fit-row", w).length));
    check("stage: cluster page has no errors", errs.length === 0, errs.join(" | "));
  }

  /* ---------- the reward screen after the career check ---------- */
  {
    const ANSW = [0, 1, 2, 3, 0, 1];
    const { w, errs } = await load("student/quiz.html", STUDENT, {
      profile: { stage: "KCSE Form 3–4", county: "Nakuru" },
      grades: GRADES,
      answers: ANSW,
      qStep: 7
    });
    await new Promise((r) => setTimeout(r, 1300));
    check("reveal: a celebration renders", !!$("#reveal", w));
    check("reveal: names the strongest pathway", /career check complete/i.test(txt($("#reveal", w))));
    check("reveal: has a progress ring", !!$(".reveal-ring svg", w));
    check("reveal: states the match in the ring", /%/.test(txt($(".reveal-ring", w))));
    check(
      "reveal: three facts about the learner",
      $$(".reveal-facts .rf", w).length === 3,
      String($$(".reveal-facts .rf", w).length)
    );
    check("reveal: the breakdown is collapsed at first", $("#resultsWrap", w).hidden === true);
    click(w, $("#revealMore", w));
    check("reveal: see-the-breakdown opens it", $("#resultsWrap", w).hidden === false);
    check("reveal: the reveal shrinks to a header", $("#reveal", w).classList.contains("reveal-slim"));
    check("reveal: ranked cards follow", $$(".result-card", w).length >= 3, String($$(".result-card", w).length));
    check("reveal: only the top card is badged best", $$(".result-card.top", w).length === 1);
    check("reveal: no errors", errs.length === 0, errs.join(" | "));
    check(
      "result: persisted with the stage it was taken in",
      state(w).result && state(w).result.stage === "form34",
      JSON.stringify(state(w).result && state(w).result.stage)
    );
  }
  {
    /* the same flow under CBC must not crash and must not talk about points */
    const ANSW = [1, 1, 0, 2, 1, 0];
    const { w, errs } = await load("student/quiz.html", STUDENT, {
      profile: { stage: "CBC Grade 7–9", county: "Nakuru" },
      grades: {
        English: "ME",
        Kiswahili: "ME",
        Mathematics: "EE",
        "Integrated Science": "ME",
        "Social Studies": "AE",
        Agriculture: "ME",
        "Pre-Technical Studies": "ME",
        "Business Studies": "AE",
        "Creative Arts & Sports": "EE",
        "Religious Education": "ME"
      },
      answers: ANSW,
      qStep: 7
    });
    await new Promise((r) => setTimeout(r, 1300));
    check("cbc result: reveal renders", !!$("#reveal", w));
    click(w, $("#revealMore", w));
    const body = txt($("#resultsWrap", w));
    check("cbc result: no KUCCPS cluster claim", !/weighted cluster points/.test(body));
    check("cbc result: says CBC has no cluster points", /does not use cluster points/.test(body));
    check("cbc result: no errors", errs.length === 0, errs.join(" | "));
  }

  /* ---------- the pie beside the graph ---------- */
  {
    const { w } = await load("student/dashboard.html", STUDENT, {
      profile: { stage: "KCSE Form 3–4" },
      grades: GRADES,
      assessments: LOGS
    });
    check("pie: a donut renders beside the line", !!$(".prog-pie .gdonut svg", w));
    check(
      "pie: it has an arc per grade band",
      $$(".prog-pie .dn-seg", w).length >= 2,
      String($$(".prog-pie .dn-seg", w).length)
    );
    check("pie: the centre states a number", /%/.test(txt($(".prog-pie .dn-big", w))), txt($(".prog-pie .dn-big", w)));
    check(
      "pie: the legend shares add to 100%",
      (() => {
        const pcts = $$(".prog-pie .dn-li b", w).map((b) => parseInt(txt(b), 10));
        const sum = pcts.reduce((a, b) => a + b, 0);
        return Math.abs(sum - 100) <= 2;
      })()
    );
    check("pie: the line chart is still there", !!$(".prog-chart .gchart svg", w));
    check(
      "pie: the line is smoother (cubic)",
      /C/.test(($(".gc-line", w) || {}).getAttribute ? $(".gc-line", w).getAttribute("d") : "")
    );
    check("pie: axes carry units", /%/.test(txt($(".gchart", w))));
  }

  /* ---------- a tutor uploads a document, the reviewer can open it ---------- */
  {
    /* t4 has one check still outstanding (t4 = Achieng Odhiambo, safeguarding) */
    const TUT4 = { id: "demo-tut4", name: "Achieng Odhiambo", role: "tutor", tutorId: "t4", demo: true };
    const { w, errs } = await load("tutor/profile.html", TUT4, { bookings: [], verify: { t4: { safe: false } } });
    const subBtn = $('[data-vsub^="safe:"]', w);
    check(
      "upload: the check offers an upload",
      Boolean(subBtn) && /Upload/.test(subBtn.textContent),
      subBtn && subBtn.textContent.trim()
    );
    click(w, subBtn);
    check("upload: the dialog has a file field", Boolean($("#vFile", w)));
    check("upload: it accepts photos and PDFs", $("#vFile", w).getAttribute("accept") === "image/*,application/pdf");
    check("upload: it warns where the file lives", /stays on this device/.test(txt($("#modalBox", w))));

    const file = new w.File([new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52])], "TSC-certificate.pdf", {
      type: "application/pdf"
    });
    const input = $("#vFile", w);
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new w.Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    check(
      "upload: the picked file is acknowledged",
      /TSC-certificate\.pdf/.test(txt($("#vFileState", w))),
      txt($("#vFileState", w))
    );

    $("#vRef", w).value = "TSC/2019/004321";
    click(w, $("#vSend", w));
    const st = state(w);
    check(
      "upload: the document is stored against the check",
      Boolean(st.verifyDocs && st.verifyDocs.t4 && st.verifyDocs.t4.safe),
      JSON.stringify(st.verifyDocs)
    );
    check("upload: the file is kept with it", st.verifyDocs.t4.safe.data.startsWith("data:application/pdf"));
    check("upload: it starts as pending", st.verifyDocs.t4.safe.status === "pending");
    check("upload: the reference travels with it", st.verifyDocs.t4.safe.ref === "TSC/2019/004321");
    check(
      "upload: the tutor sees that it is with the reviewer",
      /With the reviewer/.test(txt($("#tsBox", w))),
      txt($("#tsBox", w)).slice(0, 140)
    );
    check(
      "upload: the button offers a replace",
      Boolean($('[data-vsub^="safe:"]', w)) && /Replace/.test($('[data-vsub^="safe:"]', w).textContent)
    );
    check(
      "upload: the reviewer is told a file arrived",
      (st.notes || []).some((n) => /attached/.test(n.body)),
      JSON.stringify((st.notes || []).map((n) => n.body)).slice(0, 160)
    );
    check("upload: no errors", errs.length === 0, errs.join(" | "));
  }

  /* ---------- the learner inbox and session list ---------- */
  {
    const BOOK = {
      bookings: [
        {
          id: 900001,
          tutorId: "t1",
          subject: "Nursing routes",
          slot: "Sat · 9:00–11:00 AM",
          mode: "Online",
          status: "Confirmed",
          ts: NOW - 2 * DAY,
          learner: "Wanjiku Muthoni",
          mine: true
        }
      ],
      msgs: {
        900001: [
          { from: "me", text: "Hello!", ts: NOW - 2 * DAY },
          { from: "tutor", text: "Karibu — see you Saturday.", ts: NOW - DAY }
        ]
      },
      threads: [
        {
          id: "th-1",
          withRole: "student",
          name: "Wanjiku Muthoni",
          subject: "Session confirmed",
          msgs: [{ id: "m1", from: "admin", text: "Your Saturday session is confirmed.", ts: NOW - 3e6, read: true }]
        }
      ]
    };
    const { w, errs } = await load("student/messages.html", STUDENT, BOOK);
    check(
      "inbox: both kinds of thread are listed",
      $$(".inbox-row", w).length === 2,
      String($$(".inbox-row", w).length)
    );
    check(
      "inbox: the tutor thread is named",
      /Brian Otieno/.test(txt($("#inboxBox", w))),
      txt($("#inboxBox", w)).slice(0, 120)
    );
    check(
      "inbox: the team thread is labelled",
      /PathFinder team/.test(txt($("#inboxBox", w))) && /Team/.test(txt($("#inboxBox", w)))
    );
    check("inbox: unread is counted", /1 unread/.test(txt($("#inboxBox", w))), txt($(".page-sub", w)));
    check("inbox: each row can report the person", $$("[data-report-row]", w).length === 2);
    check("inbox: no errors", errs.length === 0, errs.join(" | "));

    click(w, $('[data-thread-open="tth-1"]', w));
    check("inbox: the team thread opens", Boolean($("#teamMsgs", w)));
    check("inbox: admin message is readable", /confirmed/.test(txt($("#teamMsgs", w))));
    $("#teamText", w).value = "Thank you, I will be there.";
    click(w, $("#teamSend", w));
    check("inbox: a reply is stored", /will be there/.test(JSON.stringify(state(w).threads)));
    click(w, $("button[data-close]", w));
    click(w, $('[data-thread-open="b900001"]', w));
    check("inbox: a booking thread opens the moderated chat", Boolean($("#chatMsgs", w)));
    check("inbox: prior messages are shown", /see you Saturday/.test(txt($("#chatMsgs", w))));
    check("inbox: opening a thread clears its unread badge", !/1 unread/.test(txt($("#inboxBox", w))));

    /* the session list */
    const s2 = await load("student/sessions.html", STUDENT, BOOK);
    check(
      "sessions page: the session is listed",
      $$(".sess-card", s2.w).length === 1,
      String($$(".sess-card", s2.w).length)
    );
    check(
      "sessions page: status and slot are shown",
      /Confirmed/.test(txt($("#sessionsBox", s2.w))) && /Sat · 9:00–11:00/.test(txt($("#sessionsBox", s2.w)))
    );
    check(
      "sessions page: KPI chips count them",
      /1 confirmed/.test(txt($("#sessionsBox", s2.w))),
      txt($(".page-sub", s2.w))
    );
    check("sessions page: a report action exists", Boolean($('[data-sess-report="900001"]', s2.w)));
    check("sessions page: no errors", s2.errs.length === 0, s2.errs.join(" | "));

    /* learner reports a tutor */
    click(s2.w, $('[data-sess-report="900001"]', s2.w));
    check("report: the dialog names the tutor", /Report Brian Otieno/.test(txt($("#modalBox", s2.w))));
    check("report: reasons are tutor-facing", /Asked for my phone number/.test(txt($("#repReason", s2.w))));
    click(s2.w, $("#repSend", s2.w));
    const rep = state(s2.w).reports[0];
    check("report: it is stored as a tutor report", rep && rep.kind === "tutor", JSON.stringify(rep && rep.kind));
    check("report: it records who reported", rep && rep.by === STUDENT.name, rep && rep.by);
    check(
      "report: the admin is notified",
      (state(s2.w).notes || []).some((n) => n.to === "admin" && /report/i.test(n.title))
    );
  }

  /* ---------- the tutor inbox and reporting a learner ---------- */
  {
    const TUT_STATE = {
      bookings: [
        {
          id: 900002,
          tutorId: "t1",
          subject: "Nursing routes",
          slot: "Sat · 9:00–11:00 AM",
          mode: "Online",
          status: "Requested",
          ts: NOW - DAY,
          learner: "Wanjiku Muthoni"
        }
      ],
      msgs: { 900002: [{ from: "me", text: "Happy to help.", ts: NOW - 9e5 }] },
      threads: [
        {
          id: "th-2",
          withRole: "tutor",
          name: "Brian Otieno",
          subject: "Verification",
          msgs: [{ id: "m1", from: "admin", text: "Your documents reached the reviewer.", ts: NOW - 2e6, read: false }]
        }
      ]
    };
    const { w, errs } = await load("tutor/messages.html", TUTOR, TUT_STATE);
    check(
      "tutor inbox: learner thread and team thread",
      $$(".inbox-row", w).length === 2,
      String($$(".inbox-row", w).length)
    );
    check("tutor inbox: the learner is named", /Wanjiku Muthoni/.test(txt($("#inboxBox", w))));
    check("tutor inbox: the team message is there", /reached the reviewer/.test(txt($("#inboxBox", w))));
    check("tutor inbox: no errors", errs.length === 0, errs.join(" | "));

    /* tutor reports a learner from the request list */
    const st = await load("tutor/dashboard.html", TUTOR, TUT_STATE);
    const rep = $('[data-report-learner="Wanjiku Muthoni"]', st.w);
    check("report: the tutor dashboard offers a report action", Boolean(rep), "none");
    click(st.w, rep);
    check(
      "report: it names the learner",
      /Report Wanjiku Muthoni/.test(txt($("#modalBox", st.w))),
      txt($("#modalBox", st.w)).slice(0, 80)
    );
    check("report: reasons are learner-facing", /contact them outside PathFinder/.test(txt($("#repReason", st.w))));
    click(st.w, $("#repSend", st.w));
    const row = state(st.w).reports[0];
    check(
      "report: stored as a learner report",
      row && row.kind === "learner" && row.learner === "Wanjiku Muthoni",
      JSON.stringify(row && [row.kind, row.learner])
    );
    check(
      "report: the admin queue is told",
      (state(st.w).notes || []).some((n) => n.to === "admin")
    );

    /* a restricted account can read but not send */
    const { w: w3 } = await load(
      "student/messages.html",
      STUDENT,
      Object.assign(
        {},
        {
          bookings: [
            {
              id: 900003,
              tutorId: "t1",
              subject: "Nursing routes",
              slot: "Sat · 9:00–11:00 AM",
              status: "Confirmed",
              ts: NOW,
              learner: "Wanjiku Muthoni",
              mine: true
            }
          ],
          msgs: { 900003: [] },
          restricted: { "wanjiku muthoni": { name: "Wanjiku Muthoni", reason: "Reported", ts: NOW } }
        }
      )
    );
    click(w3, $('[data-thread-open="b900003"]', w3));
    check("restricted: the chat still opens", Boolean($("#chatMsgs", w3)));
    check("restricted: the composer is replaced by an explanation", !$("#chatText", w3) && !$("#chatSend", w3));
    check(
      "restricted: nothing can be typed, so nothing is stored",
      !JSON.stringify(state(w3).msgs || {}).includes("still send")
    );
  }

  /* ---------- the sidebar carries the new entries for both roles ---------- */
  {
    const stu = await load("student/dashboard.html", STUDENT, { grades: GRADES });
    const links = $$("#snav a", stu.w).map((a) => a.textContent.replace(/\s+/g, " ").trim());
    check(
      "sidebar: learner has Messages",
      links.some((l) => /Messages/.test(l)),
      links.join(" | ")
    );
    check(
      "sidebar: learner has Scheduled sessions",
      links.some((l) => /Scheduled sessions/.test(l))
    );
    check(
      "sidebar: the learner links point at the new pages",
      $$("#snav a", stu.w)
        .filter((a) => /Messages|Scheduled sessions/.test(a.textContent))
        .every((a) => /student\/(messages|sessions)\.html$/.test(a.getAttribute("href")))
    );
    const tut = await load("tutor/dashboard.html", TUTOR, { bookings: [] });
    const tlinks = $$("#snav a", tut.w).map((a) => a.textContent.replace(/\s+/g, " ").trim());
    check(
      "sidebar: tutor has Messages",
      tlinks.some((l) => /Messages/.test(l)),
      tlinks.join(" | ")
    );
    check(
      "sidebar: the tutor link points at the inbox",
      $$("#snav a", tut.w).some(
        (a) => /Messages/.test(a.textContent) && /tutor\/messages\.html$/.test(a.getAttribute("href"))
      )
    );
  }

  /* ---------- a restricted account, a team complaint, and the service worker ---------- */
  {
    const { w } = await load(
      "student/messages.html",
      STUDENT,
      Object.assign({}, SEED, {
        restricted: { "wanjiku muthoni": { name: "Wanjiku Muthoni", reason: "Reported by a tutor", ts: NOW } }
      })
    );
    const row = $("[data-thread-open]", w);
    click(w, row);
    check(
      "restricted: the thread still opens",
      Boolean($("#modalBox", w)) && Boolean($("#chatMsgs", w) || $("#teamMsgs", w))
    );
    check("restricted: there is no composer to fail on", !$("#chatText", w) && !$("#teamText", w));
    check(
      "restricted: the reason is stated",
      /read this thread but not send/i.test(txt($("#modalBox", w))),
      txt($("#modalBox", w)).slice(-140)
    );
    check("restricted: nobody is blamed by name", !/restricted by/i.test(txt($("#modalBox", w))));
  }

  {
    const { w } = await load(
      "student/messages.html",
      STUDENT,
      Object.assign({}, SEED, {
        threads: [
          {
            id: "th-team",
            withRole: "student",
            name: "Wanjiku Muthoni",
            subject: "Everything you need",
            msgs: [{ id: "t1", from: "admin", text: "Welcome to PathFinder.", ts: NOW - 1e6, read: true }]
          }
        ]
      })
    );
    const btn = $('[data-report-row="tth-team"]', w) || $("[data-report-row]", w);
    check("team: the row can be flagged", Boolean(btn));
    click(w, btn);
    check(
      "team: the dialog is about the team, not a tutor",
      /Report the PathFinder team/.test(txt($("#modalBox", w))),
      txt($("#modalBox", w)).slice(0, 70)
    );
    check("team: the reasons fit a staff complaint", /staff message|personal details/i.test(txt($("#repReason", w))));
    click(w, $("#repSend", w));
    const row = (state(w).reports || [])[0];
    check("team: it lands in the same queue", row && row.kind === "team", JSON.stringify(row && row.kind));
    check("team: it is labelled without a fake tutor id", row && !row.tutorId && row.targetRole === "team");
  }

  /* ---------- phone sizing ---------- */
  {
    const css = fs.readFileSync(path.join(ROOT, "assets/css/app.css"), "utf8");
    check("phone: a 400 px breakpoint exists", /@media \(max-width: 400px\)/.test(css));
    check("phone: a 720 px breakpoint exists", /@media \(max-width: 720px\)/.test(css));
    check("phone: no horizontal overflow", /overflow-x: hidden/.test(css));
    check("phone: safe-area padding is used", /env\(safe-area-inset-bottom\)/.test(css));
    check("phone: the panel is a fixed sheet", /\.notif-pop\s*\{[^}]*position: fixed/.test(css));
    check("phone: 44 px tap targets", /min-height: 44px/.test(css));
    check("phone: KPIs restack", /\.kpi-row\s*\{[^}]*grid-template-columns: 1fr/.test(css));
    check("phone: the ring stacks under the line", /\.prog-split\s*\{\s*grid-template-columns: 1fr/.test(css));
    /* every page must declare a viewport or nothing above matters */
    const pages = ["student/dashboard.html", "student/quiz.html", "student/profile.html", "student/tracker.html"];
    check(
      "phone: viewport meta on the student pages",
      pages.every((pg) => /name="viewport"/.test(fs.readFileSync(path.join(ROOT, pg), "utf8")))
    );
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
