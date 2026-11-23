#!/usr/bin/env node
/* Safety onboarding: the gate, the age maths, guardian consent, the documents
   and the signature — plus the fact that a picture, a profile and a signature
   belong to one account and not to the device.

     npm install --no-save jsdom && npm run test:onboarding
*/
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs"),
  path = require("path");
const ROOT = path.resolve(__dirname, "..");

const NEW_STU = {
  id: "u700",
  name: "Achieng Odhiambo",
  email: "a@b.ke",
  role: "student",
  county: "Kisumu",
  needsOnboarding: true
};
const NEW_TUT = {
  id: "u701",
  name: "Kevin Otieno",
  email: "t@b.ke",
  role: "tutor",
  county: "Nairobi",
  needsOnboarding: true
};
const KID = {
  id: "u702",
  name: "Brian Kimani",
  email: "k@b.ke",
  role: "student",
  county: "Nairobi",
  needsOnboarding: true
};
const DEMO_STU = {
  id: "demo-stu",
  name: "Wanjiku Muthoni",
  role: "student",
  demo: true,
  email: "student@demo.pathfinder.ke"
};
const DEMO_TUT = {
  id: "demo-tut",
  name: "Brian Otieno",
  role: "tutor",
  demo: true,
  tutorId: "t1",
  email: "tutor@demo.pathfinder.ke"
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
function load(page, session, state, accounts) {
  return new Promise((resolve) => {
    const errs = [];
    const vc = new VirtualConsole();
    vc.on("jsdomError", (e) => {
      const m = e.message || String(e);
      if (!/Not implemented/.test(m)) errs.push(m.slice(0, 200));
    });
    const dom = new JSDOM(inline(page), {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      virtualConsole: vc,
      url: "http://localhost/" + page,
      beforeParse(w) {
        w.localStorage.setItem("pf-session-v1", JSON.stringify(session || null));
        w.localStorage.setItem("pf-state-v1", JSON.stringify(state || {}));
        if (accounts) w.localStorage.setItem("pf-accounts-v1", JSON.stringify(accounts));
      }
    });
    setTimeout(() => resolve({ w: dom.window, errs }), 300);
  });
}
const $ = (w, s) => w.document.querySelector(s);
const $$ = (w, s) => Array.from(w.document.querySelectorAll(s));
const txt = (n) => (n ? n.textContent.replace(/\s+/g, " ").trim() : "");
const click = (w, el) => el && el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const fire = (w, el, type) => el && el.dispatchEvent(new w.Event(type, { bubbles: true }));
const state = (w) => JSON.parse(w.localStorage.getItem("pf-state-v1") || "{}");
const results = [];
const check = (name, ok, extra) => results.push({ name, ok: !!ok, extra: extra || "" });

(async () => {
  /* ---------- the gate ---------- */
  {
    const { w } = await load("student/dashboard.html", NEW_STU, {}, [NEW_STU]);
    const gate = w.document.documentElement.getAttribute("data-onb-gate") || "";
    check("gate: an unsigned account is sent to the welcome page", /student\/welcome\.html/.test(gate), gate);

    const tut = await load("tutor/dashboard.html", NEW_TUT, {}, [NEW_TUT]);
    check(
      "gate: a tutor is sent to the tutor flow",
      /tutor\/welcome\.html/.test(tut.w.document.documentElement.getAttribute("data-onb-gate") || "")
    );

    const demo = await load("student/dashboard.html", DEMO_STU, {}, [DEMO_STU]);
    check(
      "gate: an account that already signed is not blocked",
      !demo.w.document.documentElement.getAttribute("data-onb-gate")
    );

    const adm = await load("admin/dashboard.html", { id: "demo-adm", name: "Terry P.", role: "admin", demo: true }, {});
    check("gate: an admin is never gated", !adm.w.document.documentElement.getAttribute("data-onb-gate"));
  }

  /* ---------- the learner flow: rules, details, sign, profile ---------- */
  {
    const { w, errs } = await load("student/welcome.html", NEW_STU, {}, [NEW_STU]);
    check(
      "flow: it opens on the safety documents",
      /Read this, then tick it/.test(txt($(w, "#welcomeBox"))),
      txt($(w, "#welcomeBox")).slice(0, 60)
    );
    check("flow: no page errors", errs.length === 0, errs.join(" | "));
    check(
      "flow: setup has no sidebar, no top bar and no bottom nav",
      !$(w, "#sidebar") && !$(w, ".topbar") && !$(w, "#bottomNav")
    );
    check(
      "flow: the rail shows where you are",
      $$(w, ".onb-rail li").length >= 3,
      String($$(w, ".onb-rail li").length)
    );
    check("flow: there is a progress bar", Boolean($(w, ".onb-prog i")));
    check(
      "flow: a learner reads three documents",
      $$(w, "[data-doc-open]").length === 3,
      String($$(w, "[data-doc-open]").length)
    );
    click(w, $$(w, "[data-doc-open]")[0]);
    check("flow: a document opens", !$$(w, ".doc-body")[0].hasAttribute("hidden"));

    /* the next button refuses until every document is ticked */
    click(w, $(w, "#onbNext"));
    check("flow: documents cannot be skipped", /Read this, then tick it/.test(txt($(w, "#welcomeBox"))));
    check(
      "flow: and the reason is stated",
      /Tick every document/.test(txt($(w, "#toastWrap"))),
      txt($(w, "#toastWrap"))
    );

    for (const t of $$(w, "[data-doc-tick]")) {
      t.checked = true;
      fire(w, t, "change");
    }
    check(
      "flow: all three can be ticked",
      /3\/3 read/.test(txt($(w, "#welcomeBox"))),
      txt($(w, "#welcomeBox")).match(/\d\/\d read/)
    );

    click(w, $(w, "#onbNext"));
    check("flow: the details come next", /Who you are/.test(txt($(w, "#welcomeBox"))));

    /* the date of birth is a dd/mm/yyyy text field: digits in, slashes added */
    check("flow: the date field asks for dd/mm/yyyy", $(w, "#onbDob").getAttribute("placeholder") === "dd/mm/yyyy");
    check("flow: it is a text field, not a native date picker", $(w, "#onbDob").getAttribute("type") === "text");
    for (const digits of ["0", "02", "0204", "02042001"]) {
      $(w, "#onbDob").value = digits;
      fire(w, $(w, "#onbDob"), "input");
    }
    check("flow: typing digits formats itself", $(w, "#onbDob").value === "02/04/2001", $(w, "#onbDob").value);
    check(
      "flow: age is computed from the date of birth",
      /\b2[0-9] years\b/.test(txt($(w, "#welcomeBox"))),
      txt($(w, "#welcomeBox")).match(/\d+ years/)
    );
    check("flow: an adult needs no guardian", !$$(w, ".onb-rail li").some((li) => /Guardian/.test(li.textContent)));

    /* backspace with the caret just after a slash deletes the digit behind it
       instead of doing nothing */
    const dob = $(w, "#onbDob");
    dob.value = "02/04/";
    dob.setSelectionRange(6, 6);
    dob.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }));
    check("flow: backspace at a slash deletes a digit", dob.value.length < 6, dob.value);
    dob.value = "02042001";
    fire(w, dob, "input");
    check("flow: and the field is whole again", dob.value === "02/04/2001", dob.value);

    $(w, "#onbName").value = "Achieng Odhiambo";
    fire(w, $(w, "#onbName"), "input");
    click(w, $(w, "#onbNext"));
    check("flow: the signature step summarises what was agreed", /Sign it/.test(txt($(w, "#welcomeBox"))));
    const mid = state(w);
    check(
      "flow: the record is kept per account",
      !!mid.onboarding && !!mid.onboarding["u700"],
      JSON.stringify(Object.keys(mid.onboarding || {}))
    );
    check(
      "flow: the date of birth is stored as a real date",
      mid.onboarding["u700"].dob === "2001-04-02",
      mid.onboarding["u700"].dob
    );

    $(w, "#onbSignName").value = "Achieng Odhiambo";
    $(w, "#onbAgree").checked = true;
    click(w, $(w, "#onbFinish"));
    const done = state(w);
    const rec = done.onboarding["u700"];
    check("flow: the check is completed", rec && rec.completed === true);
    check(
      "flow: the signature carries a name and a version",
      rec.signed && rec.signed.name === "Achieng Odhiambo" && rec.signed.version,
      JSON.stringify(rec.signed)
    );
    check("flow: the documents read are recorded", rec.signed.docs.length === 3, JSON.stringify(rec.signed.docs));
    check(
      "flow: the profile picks up the name",
      done.profile && done.profile.name === "Achieng Odhiambo",
      done.profile && done.profile.name
    );
    check(
      "flow: the account no longer needs onboarding",
      !(JSON.parse(w.localStorage.getItem("pf-accounts-v1")) || []).find((a) => a.id === "u700").needsOnboarding
    );
    check(
      "flow: signing lands on the profile card, not the app",
      /Set up your profile/.test(txt($(w, "#welcomeBox"))),
      txt($(w, "#welcomeBox")).slice(0, 80)
    );
    check(
      "flow: the profile step offers a picture",
      Boolean($(w, "#onbAv")) && /Choose your picture/.test(txt($(w, "#welcomeBox")))
    );
    click(w, $(w, "#onbSkipProfile"));
    check("flow: skipping it still opens the app", Boolean($(w, "#onbSkipProfile")));
  }

  /* ---------- a minor cannot sign without a guardian ---------- */
  {
    const { w } = await load("student/welcome.html", KID, {}, [KID]);
    for (const t of $$(w, "[data-doc-tick]")) {
      t.checked = true;
      fire(w, t, "change");
    }
    click(w, $(w, "#onbNext"));
    $(w, "#onbDob").value = "05052011";
    fire(w, $(w, "#onbDob"), "input");
    check(
      "minor: the rail grows a guardian step",
      $$(w, ".onb-rail li").some((li) => /Guardian/.test(li.textContent))
    );
    check(
      "minor: the hint says a guardian is needed",
      /under 18|guardian/i.test(txt($(w, "#onbDobHint"))),
      txt($(w, "#onbDobHint"))
    );
    $(w, "#onbName").value = "Brian Kimani";
    fire(w, $(w, "#onbName"), "input");
    click(w, $(w, "#onbNext"));
    check("minor: the guardian step comes next", /A guardian has to agree/.test(txt($(w, "#welcomeBox"))));
    click(w, $(w, "#onbNext"));
    check("minor: it will not move on without a guardian", /A guardian has to agree/.test(txt($(w, "#welcomeBox"))));
    $(w, "#onbGuardianName").value = "Mary Kimani";
    fire(w, $(w, "#onbGuardianName"), "input");
    $(w, "#onbGuardianPhone").value = "0722000111";
    fire(w, $(w, "#onbGuardianPhone"), "input");
    $(w, "#onbGuardianAck").checked = true;
    fire(w, $(w, "#onbGuardianAck"), "change");
    click(w, $(w, "#onbNext"));
    check(
      "minor: with a guardian it continues to the signature",
      /Sign it/.test(txt($(w, "#welcomeBox"))),
      txt($(w, "#welcomeBox")).slice(0, 60)
    );
    const g = state(w).onboarding["u702"].guardian;
    check(
      "minor: the guardian is stored with the record",
      g && g.name === "Mary Kimani" && g.ack === true,
      JSON.stringify(g)
    );
  }

  /* ---------- tutors: 18+, papers skippable, conduct included ---------- */
  {
    const { w } = await load("tutor/welcome.html", NEW_TUT, {}, [NEW_TUT]);
    check(
      "tutor: the flow is labelled for tutors",
      /Tutor setup|Get verified|Your papers/.test(txt($(w, "#welcomeBox"))),
      txt($(w, "#welcomeBox")).slice(0, 50)
    );
    check(
      "tutor: papers are a step",
      $$(w, ".onb-rail li").some((li) => /Papers/.test(li.textContent))
    );

    for (const t of $$(w, "[data-doc-tick]")) {
      t.checked = true;
      fire(w, t, "change");
    }
    check(
      "tutor: the conduct document is included",
      $$(w, "[data-doc-open]").length === 4,
      String($$(w, "[data-doc-open]").length)
    );
    click(w, $(w, "#onbNext"));

    $(w, "#onbDob").value = "01012009";
    fire(w, $(w, "#onbDob"), "input");
    $(w, "#onbName").value = "Kevin Otieno";
    fire(w, $(w, "#onbName"), "input");
    $(w, "#onbPhone").value = "0712345678";
    fire(w, $(w, "#onbPhone"), "input");
    click(w, $(w, "#onbNext"));
    check("tutor: under 18 cannot proceed", /Who you are/.test(txt($(w, "#welcomeBox"))));

    $(w, "#onbDob").value = "01011996";
    fire(w, $(w, "#onbDob"), "input");
    click(w, $(w, "#onbNext"));
    check("tutor: an adult reaches the papers", /Your papers/.test(txt($(w, "#welcomeBox"))));
    check("tutor: papers can be uploaded right here", Boolean($(w, "#pap-file-tsc")) && Boolean($(w, "#pap-cam-tsc")));
    check("tutor: papers can be skipped", Boolean($(w, "#onbSkipDocs")));

    /* the upload lands in this tutor's own record, not a shared one */
    const input = $(w, "#pap-file-tsc");
    const pdf = new w.File([new Uint8Array([37, 80, 68, 70])], "tsc.pdf", { type: "application/pdf" });
    Object.defineProperty(input, "files", { value: [pdf], configurable: true });
    fire(w, input, "change");
    await new Promise((r) => setTimeout(r, 350));
    const docs = state(w).verifyDocs || {};
    check(
      "tutor: the upload is stored against this account",
      !!(docs["tx-u701"] && docs["tx-u701"].tsc),
      JSON.stringify(Object.keys(docs))
    );
    check(
      "tutor: the file name is shown back",
      /tsc\.pdf/.test(txt($(w, "#welcomeBox"))),
      txt($(w, ".paper")).slice(0, 80)
    );

    click(w, $(w, "#onbSkipDocs"));
    check("tutor: skipping lands on the signature", /Sign it/.test(txt($(w, "#welcomeBox"))));
    check("tutor: skipping is recorded", state(w).onboarding["u701"].docsSkipped === true);
  }

  /* ---------- what is signed stays with the account ---------- */
  {
    const seed = {
      onboarding: {
        "demo-stu": {
          completed: true,
          signed: { name: "Wanjiku Muthoni", ts: Date.now() - 9e8, version: "2026-11", docs: [] }
        }
      }
    };
    const stu = await load("student/profile.html", DEMO_STU, seed, [DEMO_STU, DEMO_TUT]);
    check(
      "record: the learner's profile shows the signature",
      /Signed by Wanjiku Muthoni/.test(txt(stu.w.document.body)),
      txt($(stu.w, "#profileBox")).slice(0, 120)
    );
    const tut = await load("tutor/profile.html", DEMO_TUT, JSON.parse(JSON.stringify(seed)), [DEMO_STU, DEMO_TUT]);
    check("record: the tutor is not credited with it", !/Signed by Wanjiku/.test(txt($(tut.w, "#tsBox"))), "leaked");
    check("record: the tutor is asked to finish their own", /Safety check not finished/.test(txt(tut.w.document.body)));
  }

  /* ---------- pictures are per account ---------- */
  {
    const seed = {
      profiles: {
        "demo-stu": { name: "Wanjiku Muthoni", avatar: { kind: "art", art: "a6", frame: "ring", colour: "ocean" } }
      }
    };
    const one = await load("student/profile.html", DEMO_STU, seed, [DEMO_STU, DEMO_TUT]);
    check("picture: the learner sees their own", /assets\/avatars\/a6\.jpg/.test($(one.w, "#userChip").innerHTML));
    const two = await load("tutor/dashboard.html", DEMO_TUT, JSON.parse(JSON.stringify(seed)), [DEMO_STU, DEMO_TUT]);
    check(
      "picture: the tutor does not inherit it",
      !/assets\/avatars\/a6\.jpg/.test($(two.w, "#userChip").innerHTML),
      $(two.w, "#userChip").innerHTML.slice(0, 60)
    );
    check("picture: the tutor gets their own initials", /BO/.test($(two.w, "#userChip").innerHTML));
  }

  let bad = 0;
  for (const r of results) {
    if (r.ok) console.log("  ok   " + r.name);
    else {
      bad++;
      console.log("  FAIL " + r.name + (r.extra ? "  → " + r.extra : ""));
    }
  }
  console.log(
    "\n" + (bad ? "✗ " + bad + " failed of " + results.length : "✓ all " + results.length + " onboarding checks passed")
  );
  process.exit(bad ? 1 : 0);
})();
