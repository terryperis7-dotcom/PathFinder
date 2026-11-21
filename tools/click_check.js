#!/usr/bin/env node
/* Click sweep: boots every signed-in page in jsdom and presses every control a
   person could reach (buttons, console actions, page actions), closing any modal
   that opens in between. It asserts nothing about the outcome — the unit and
   role suites do that — it only proves that pressing things never throws.

   Run:  npm run test:clicks        (needs jsdom: npm i --no-save jsdom)
*/
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const path = require("path");
const ROOT = __dirname + "/..";

function inline(p) {
  var dir = path.dirname(path.join(ROOT, p));
  var h = fs.readFileSync(path.join(ROOT, p), "utf8").replace(/<link[^>]*fonts\.(googleapis|gstatic)[^>]*>/g, "");
  return h.replace(/<script src="([^"]+)"><\/script>/g, function (m, s) {
    return (
      "<script>" + fs.readFileSync(path.resolve(dir, s), "utf8").replace(/<\/script>/g, "<\\/script>") + "</script>"
    );
  });
}
const ADMIN = { id: "demo-adm", name: "Terry P.", role: "admin", demo: true };
const STU = { id: "demo-stu", name: "Wanjiku Muthoni", role: "student", county: "Nakuru", demo: true };
const TUT = { id: "demo-tut", name: "Brian Otieno", role: "tutor", tutorId: "t1", demo: true };
const grades = {
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
const now = Date.now();
const STU_STATE = {
  grades,
  targets: { Mathematics: "A-" },
  result: { paths: [{ id: "health", match: 78 }] },
  shortlist: ["uon"],
  compare: ["uon", "jkuat"],
  assessments: [{ id: 1, subj: "Mathematics", score: 52, date: "2026-08-04", ts: now - 9e7 }],
  bookings: [
    {
      id: 5,
      tutorId: "t1",
      subject: "Physics",
      slot: "Sat 9–11",
      mode: "Online",
      note: "",
      status: "Requested",
      ts: now - 1e6,
      learner: "Wanjiku Muthoni",
      mine: true
    },
    {
      id: 6,
      tutorId: "t2",
      subject: "Maths",
      slot: "Wed 4–6",
      mode: "Online",
      note: "",
      status: "Completed",
      ts: now - 2e6,
      completedAt: now - 1e6,
      learner: "Wanjiku Muthoni",
      mine: true
    }
  ],
  reviews: [],
  tutTab: "sessions",
  sessions: {}
};
const TUT_STATE = {
  tutorSeeded: true,
  bookings: [
    {
      id: 7,
      tutorId: "t1",
      subject: "Physics",
      slot: "Sat 9–11",
      mode: "Online",
      note: "hi",
      status: "Confirmed",
      ts: now - 1e6,
      learner: "Wanjiku Muthoni"
    },
    {
      id: 8,
      tutorId: "t1",
      subject: "Maths",
      slot: "Wed 4–6",
      mode: "Online",
      note: "hi",
      status: "Requested",
      ts: now - 1e6,
      learner: "Otieno K."
    }
  ]
};
const ADM_STATE = {
  bookings: [
    {
      id: 9,
      tutorId: "t1",
      subject: "Physics",
      slot: "Sat",
      mode: "Online",
      note: "",
      status: "Requested",
      ts: now - 1e6,
      learner: "Wanjiku Muthoni"
    }
  ],
  reports: [
    {
      id: 10,
      tutorId: "t2",
      tutor: "Brian Otieno",
      by: "Learner",
      reason: "WhatsApp",
      details: "",
      ts: now - 1e6,
      status: "open"
    }
  ],
  tutorApp: { name: "Mercy Njeri", subject: "Chemistry", rate: 420, phone: "x" }
};
const PAGES = [
  ["student/dashboard.html", STU, STU_STATE],
  ["student/tutors.html", STU, STU_STATE],
  ["student/tracker.html", STU, STU_STATE],
  ["student/profile.html", STU, STU_STATE],
  ["student/institutions.html", STU, STU_STATE],
  ["student/funding.html", STU, STU_STATE],
  ["student/cluster.html", STU, STU_STATE],
  ["student/quiz.html", STU, STU_STATE],
  ["tutor/dashboard.html", TUT, TUT_STATE],
  ["tutor/students.html", TUT, TUT_STATE],
  ["tutor/schedule.html", TUT, TUT_STATE],
  ["tutor/sessions.html", TUT, TUT_STATE],
  ["tutor/profile.html", TUT, TUT_STATE],
  ["admin/dashboard.html", ADMIN, ADM_STATE],
  ["admin/requests.html", ADMIN, ADM_STATE],
  ["admin/users.html", ADMIN, ADM_STATE],
  ["admin/safety.html", ADMIN, ADM_STATE],
  ["admin/data.html", ADMIN, ADM_STATE],
  ["admin/deployment.html", ADMIN, ADM_STATE],
  ["admin/dpa.html", ADMIN, ADM_STATE]
];
function run(page, sess, state) {
  return new Promise((res) => {
    const errs = [];
    const vc = new VirtualConsole();
    vc.on("jsdomError", (e) => {
      const m = e.message || String(e);
      if (!/Not implemented|navigation/i.test(m)) errs.push(m.slice(0, 140));
    });
    vc.on("error", (...a) => {
      const t = a.map(String).join(" ");
      if (!/Not implemented/.test(t)) errs.push(t.slice(0, 140));
    });
    const dom = new JSDOM(inline(page), {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      virtualConsole: vc,
      url: "http://localhost/" + page,
      beforeParse(w) {
        w.localStorage.setItem("pf-session-v1", JSON.stringify(sess));
        w.localStorage.setItem("pf-state-v1", JSON.stringify(state));
      }
    });
    setTimeout(() => {
      const w = dom.window,
        d = w.document;
      const els = [
        ...d.querySelectorAll(
          "#viewBody button, #viewBody [data-adact], #adBox button, #adBox [data-adact], #tsBox button, #tutorBox button, #trackerBox button, #dashBox button"
        )
      ];
      let clicked = 0;
      els.slice(0, 60).forEach((el) => {
        if (el.closest("#modalBox")) return;
        try {
          el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
          clicked++;
        } catch (e) {
          errs.push("click throw " + e.message.slice(0, 80));
        }
        const close = d.querySelector("#modalBox [data-close]");
        if (close) close.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
      });
      res({ page, clicked, errs });
    }, 400);
  });
}
(async () => {
  let total = 0,
    bad = 0;
  for (const [p, s, st] of PAGES) {
    const r = await run(p, s, st);
    total += r.clicked;
    if (r.errs.length) {
      bad++;
      console.log("ERR", p, "| clicked", r.clicked, "|", r.errs.slice(0, 3).join(" || "));
    } else console.log("ok ", p, "| clicked", r.clicked);
  }
  console.log(`\n${PAGES.length - bad}/${PAGES.length} pages click-clean · ${total} controls exercised`);
  process.exit(bad ? 1 : 0);
})();
