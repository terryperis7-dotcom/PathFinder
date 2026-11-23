/* ============================================================
   The profile card — the one place your own account lives.

   The top-bar picture is the button: tapping it opens a small card under the
   chip with who you are, what is saved, and an edit form that writes to the
   account you are signed in as (and to Supabase when a token is live). Nothing
   here is a separate page, and nothing here is invented: every line comes from
   S.profile, SESSION or S.onboarding.
   ============================================================ */

const PF_CARD_FIELDS = ["name", "county", "school", "stage", "bio", "phone"];

function pfCardOpen() {
  const pop = document.getElementById("profPop");
  const chip = document.getElementById("userChip");
  return !!(pop && pop.classList.contains("show") && chip);
}
function pfCardRefresh() {
  const pop = document.getElementById("profPop");
  if (!pop) return;
  const editing = pop.dataset.mode === "edit";
  pop.innerHTML = editing ? pfCardEditHTML() : pfCardViewHTML();
  if (editing) pfCardWireEdit();
  const chip = document.getElementById("userChip");
  if (chip) chip.setAttribute("aria-expanded", pop.classList.contains("show") ? "true" : "false");
}
function pfOpenProfileCard() {
  if (!SESSION) {
    if (typeof go === "function") go("signin");
    return;
  }
  let pop = document.getElementById("profPop");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "profPop";
    pop.className = "prof-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "Your profile");
    (document.body || document.documentElement).appendChild(pop);
  }
  if (pfCardOpen()) {
    pfCloseProfileCard();
    return;
  }
  pop.dataset.mode = "view";
  pop.innerHTML = pfCardViewHTML();
  pop.classList.add("show");
  /* a floating card should take focus so Escape and Tab behave */
  pop.setAttribute("tabindex", "-1");
  try {
    pop.focus({ preventScroll: true });
  } catch (e) {}
  const chip = document.getElementById("userChip") || document.getElementById("pubUser");
  if (chip) {
    chip.setAttribute("aria-expanded", "true");
    chip.setAttribute("aria-controls", "profPop");
  }
  pfCardWireView();
}
function pfCloseProfileCard() {
  const pop = document.getElementById("profPop");
  if (pop) pop.classList.remove("show");
  [document.getElementById("userChip"), document.getElementById("pubUser")].forEach((chip) => {
    if (chip) chip.setAttribute("aria-expanded", "false");
  });
}

/* ---------- who you are ---------- */
function pfCardRoleLine() {
  const role = (SESSION && SESSION.role) || "student";
  if (role === "admin") return "Administrator";
  if (role === "tutor") return "Tutor";
  const st = (S.profile && S.profile.stage) || "";
  return st ? "Student · " + st : "Student";
}
function pfCardSafetyLine() {
  if (typeof onbState !== "function") return { done: false, text: "Not checked" };
  const r = onbState();
  if (r && r.completed && r.signed)
    return {
      done: true,
      text: "Signed " + pfCardWhen(r.signed.ts) + " · v" + esc(r.signed.version || SAFETY_VERSION)
    };
  if (r && r.completed && r.legacy) return { done: true, text: "Signed on an earlier version" };
  return { done: false, text: "Not finished — finish it before booking" };
}
function pfCardWhen(ts) {
  if (!ts) return "just now";
  try {
    return new Date(ts).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return "recently";
  }
}

function pfCardViewHTML() {
  const p = S.profile || {};
  const who = (SESSION && SESSION.name) || p.name || "Guest";
  const safety = pfCardSafetyLine();
  const mode =
    typeof sb !== "undefined"
      ? sb.live()
        ? "Supabase live"
        : sb.enabled()
          ? "Configured · local"
          : "Local demo"
      : "Local";
  const tutor = SESSION && SESSION.role === "tutor";
  const role = (SESSION && SESSION.role) || "student";
  const rows = [];
  rows.push([
    "i-pin",
    tutor ? "Teaching area" : "County",
    esc((tutor && (p.county || "")) || p.county || (SESSION && SESSION.county) || "Not set")
  ]);
  rows.push([
    tutor ? "i-award" : "i-cap",
    tutor ? "Subjects" : "School",
    esc((tutor ? p.subjects || p.school : p.school) || "Not set")
  ]);
  if (tutor) rows.push(["i-coins", "Rate", "KES " + esc(String(S.tutorRate || 450)) + "/hr — recorded, never charged"]);
  return `<div class="pp-head">
      <button class="pp-av" data-pp-photo aria-label="Change your picture">${genAvatar(who, 54)}<span class="pp-av-b">${ic("i-camera", "sm")}</span></button>
      <div class="pp-who"><b>${esc(who)}</b><span>${esc(pfCardRoleLine())}</span>
        <div class="pp-chips"><span class="chip ${safety.done ? "green" : "amber"}">${ic(safety.done ? "i-shield" : "i-info", "sm")} ${esc(safety.done ? "Safety check signed" : "Safety check due")}</span>${
          SESSION && SESSION.demo ? '<span class="chip demo">DEMO</span>' : ""
        }</div>
      </div>
      <button class="pp-x" data-pp-close aria-label="Close the profile card">${ic("i-x")}</button>
    </div>
    <div class="pp-rows">
      ${rows.map((r) => `<div class="pp-row"><span class="pp-ic">${ic(r[0], "sm")}</span><span class="pp-k">${esc(r[1])}</span><b>${r[2]}</b></div>`).join("")}
      <div class="pp-row"><span class="pp-ic">${ic(safety.done ? "i-check" : "i-flag", "sm")}</span><span class="pp-k">Safety</span><b class="${safety.done ? "" : "pp-warn"}">${esc(safety.text)}</b></div>
      <div class="pp-row"><span class="pp-ic">${ic("i-db", "sm")}</span><span class="pp-k">Data</span><b>${esc(mode)}</b></div>
    </div>
    <div class="pp-acts">
      <button class="btn btn-lime btn-sm" data-pp-edit>${ic("i-pencil", "sm")} Edit profile</button>
      <button class="btn btn-line btn-sm" data-pp-photo>${ic("i-camera", "sm")} Photo</button>
      <button class="btn btn-ghost btn-sm" data-safety-centre>${ic("i-shield", "sm")} Safety</button>
      <button class="btn btn-ghost btn-sm" data-account-export>${ic("i-download", "sm")} Export</button>
      <a class="btn btn-ghost btn-sm" href="${
        typeof urlFor === "function" ? urlFor(role === "tutor" ? "tutor-profile" : "profile") : "#"
      }">${ic("i-user", "sm")} ${role === "tutor" ? "Verification" : "Full profile"}</a>
      <button class="btn btn-ghost btn-sm pp-out" data-signout>${ic("i-logout", "sm")} Sign out</button>
    </div>
    <p class="pp-note">${ic("i-lock", "sm")} Your picture is kept on this device. Name, county, school and stage save to ${
      typeof sb !== "undefined" && sb.live() ? "your Supabase profile" : "this browser"
    }.</p>`;
}

function pfCardEditHTML() {
  const p = S.profile || {};
  const role = SESSION ? SESSION.role : "student";
  const tutor = role === "tutor";
  return `<div class="pp-head pp-head-edit">
      <div class="pp-who"><b>Edit your details</b><span>These are the details a tutor or a reviewer sees.</span></div>
      <button class="pp-x" data-pp-close aria-label="Close the profile card">${ic("i-x")}</button>
    </div>
    <label class="flab" for="ppName">Full name</label>
    <input class="input" id="ppName" maxlength="60" value="${esc((SESSION && SESSION.name) || p.name || "")}" autocomplete="name">
    <div class="pp-two">
      <div><label class="flab" for="ppCounty">County</label>
        <select class="input" id="ppCounty">${COUNTIES.map((c) => `<option${(p.county || (SESSION && SESSION.county)) === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
      ${
        tutor
          ? `<div><label class="flab" for="ppPhone">Phone</label><input class="input" id="ppPhone" inputmode="tel" value="${esc(p.phone || "")}" placeholder="07xx xxx xxx"></div>`
          : `<div><label class="flab" for="ppSchool">School</label><input class="input" id="ppSchool" value="${esc(p.school || "")}" placeholder="e.g. Nakuru High"></div>`
      }
    </div>
    ${
      tutor
        ? `<label class="flab" style="margin-top:10px" for="ppBio">Short bio</label>
           <textarea class="input" id="ppBio" rows="2" maxlength="180" placeholder="How you teach, and what you are strongest at.">${esc(p.bio || "")}</textarea>`
        : `<label class="flab" style="margin-top:10px" for="ppStage">Stage</label>
           <select class="input" id="ppStage">${PF_STAGES.map((x) => `<option value="${esc(x.label)}"${(p.stage || "") === x.label ? " selected" : ""}>${esc(x.label)} — ${x.system === "cbc" ? "CBC" : "8-4-4"}</option>`).join("")}</select>`
    }
    <div class="pp-acts pp-acts-edit">
      <button class="btn btn-ghost btn-sm" data-pp-cancel>Cancel</button>
      <button class="btn btn-lime btn-sm" data-pp-save style="margin-left:auto">${ic("i-check", "sm")} Save</button>
    </div>
    <p class="pp-note">${ic("i-info", "sm")} Your role is set by the database, never from this form.</p>`;
}

function pfCardWireView() {
  const pop = document.getElementById("profPop");
  if (!pop) return;
  const on = (sel, fn) =>
    pop.querySelectorAll(sel).forEach((n) =>
      n.addEventListener("click", (e) => {
        e.preventDefault();
        fn(e);
      })
    );
  on("[data-pp-close]", () => pfCloseProfileCard());
  on("[data-pp-edit]", () => {
    pop.dataset.mode = "edit";
    pfCardRefresh();
  });
  on("[data-pp-photo]", () => {
    pfCloseProfileCard();
    if (typeof openAvatarPicker === "function") openAvatarPicker();
  });
  /* the shared handlers in shell.js do the rest (safety, export, sign out) */
}
function pfCardWireEdit() {
  const pop = document.getElementById("profPop");
  if (!pop) return;
  const btn = (sel) => pop.querySelector(sel);
  const cancel = btn("[data-pp-cancel]");
  if (cancel)
    cancel.addEventListener("click", () => {
      pop.dataset.mode = "view";
      pfCardRefresh();
      pfCardWireView();
    });
  const close = btn("[data-pp-close]");
  if (close) close.addEventListener("click", () => pfCloseProfileCard());
  const saveBtn = btn("[data-pp-save]");
  if (saveBtn) saveBtn.addEventListener("click", pfCardSave);
}

async function pfCardSave() {
  const pop = document.getElementById("profPop");
  if (!pop) return;
  const val = (id) => (pop.querySelector("#" + id) ? pop.querySelector("#" + id).value.trim() : "");
  const name = val("ppName");
  if (name.length < 2) {
    toast("Add your name", "i-info", true);
    return;
  }
  const role = SESSION ? SESSION.role : "student";
  const patch = { name, county: val("ppCounty") };
  if (role === "tutor") {
    patch.phone = val("ppPhone");
    patch.bio = val("ppBio");
  } else {
    patch.school = val("ppSchool");
    patch.stage = val("ppStage") || (S.profile && S.profile.stage) || "KCSE Form 3–4";
  }
  S.profile = Object.assign({}, S.profile, patch);
  if (SESSION) SESSION.name = name;
  const acc = (ACCOUNTS || []).find((a) => a.id === (SESSION && SESSION.id));
  if (acc) {
    acc.name = name;
    if (patch.county) acc.county = patch.county;
    saveAccounts();
  }
  if (SESSION) store.set("pf-session-v1", SESSION);
  save();

  /* live: write the same four columns the guard allows. A refusal is reported,
     not swallowed — the device copy is already updated and says so. */
  let liveError = "";
  if (typeof sb !== "undefined" && sb.live()) {
    try {
      await sb.patch("profiles", "id=eq." + encodeURIComponent(SESSION.id), {
        name,
        county: patch.county || null,
        school: S.profile.school || null,
        stage: S.profile.stage || null
      });
    } catch (e) {
      liveError = e && e.message ? e.message : "request failed";
    }
  }
  if (typeof renderShell === "function") renderShell();
  if (typeof renderProfile === "function") renderProfile();
  if (typeof renderTspace === "function" && SESSION && SESSION.role === "tutor") {
    try {
      renderTspace();
    } catch (e) {}
  }
  pop.dataset.mode = "view";
  pfCardRefresh();
  pfCardWireView();
  if (liveError) toast("Saved on this device — the database refused that change (" + liveError + ")", "i-info", true);
  else toast("Profile saved", "i-check");
}

/* Outside click and Escape close it, the way a floating card should. */
document.addEventListener("click", (e) => {
  const pop = document.getElementById("profPop");
  if (!pop || !pop.classList.contains("show")) return;
  if (e.target.closest("#profPop") || e.target.closest("#userChip") || e.target.closest("#pubUser")) return;
  pfCloseProfileCard();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") pfCloseProfileCard();
});
