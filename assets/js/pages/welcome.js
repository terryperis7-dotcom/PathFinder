/* The welcome flow (/student/welcome.html and /tutor/welcome.html).

   One flow, two audiences, five short cards and no sidebar: while somebody is
   setting up, the only things on screen are the card they are on and the way
   forward. The order is the order the safety work has to happen in:

     1. Safety rules   — read the documents, tick each one
     2. Your details   — name, date of birth (dd/mm/yyyy), county, school
     3. Guardian       — only when the date of birth says under 18
        Papers         — only for tutors, and skippable
     4. Sign           — typed name, version stamp, stored per account
     5. Profile        — a picture and the two details that make the account usable

   The steps come from `onbSteps()`, so the guardian card appears and disappears
   with the date of birth instead of being hard-coded. */

function onbSteps() {
  const role = (SESSION && SESSION.role) || "student";
  const r = onbState();
  const adult = !onbNeedsGuardian(r.dob);
  const steps = [
    { k: "rules", label: "Safety rules" },
    { k: "you", label: "You" }
  ];
  if (role === "tutor") steps.push({ k: "papers", label: "Papers" });
  if (!adult) steps.push({ k: "guardian", label: "Guardian" });
  steps.push({ k: "sign", label: "Sign" }, { k: "profile", label: "Profile" });
  return steps;
}

/* typing: change the record in memory now, write it to disk shortly after */
function onbPatch(patch, uid) {
  const r = onbState(uid);
  Object.assign(r, patch || {});
  if (typeof saveSoon === "function") saveSoon(320);
  else save();
  return r;
}

/* A tutor's own verification record. Keyed per account, so two tutors on one
   phone can never see each other's uploads. */
function onbTutorKey() {
  if (typeof SESSION === "undefined" || !SESSION) return "";
  return SESSION.tutorId || "tx-" + (SESSION.id || "anon");
}
function onbTutorDoc(k) {
  const key = onbTutorKey();
  return ((S.verifyDocs || {})[key] || {})[k] || null;
}

const ONB_PAPERS = [
  ["tsc", "TSC registration", "Your TSC number, and a photo of the certificate."],
  ["id", "National ID", "Both sides, or your passport page."],
  ["conduct", "Certificate of good conduct", "Dated within the last 24 months."],
  ["safe", "Safeguarding training", "Any recognised child-protection certificate."]
];

function renderWelcome() {
  const box = $("#welcomeBox");
  if (!box) return;

  /* nobody signed in: send them to sign in rather than showing an empty form */
  if (!SESSION) {
    box.innerHTML = `<div class="onb-wrap"><div class="onb-card">
      <div class="onb-hero-ico">${ic("i-user")}</div>
      <h1 class="onb-h1">Sign in first</h1>
      <p class="onb-lead">This part is tied to your account, so we need to know who you are.</p>
      <a class="btn btn-lime" href="${PF_ROOT}signin.html">${ic("i-user", "sm")} Sign in</a></div></div>`;
    reveal();
    return;
  }

  const role = SESSION.role;
  const r = onbState();
  const steps = onbSteps();
  const total = steps.length;
  /* clamp: a returning adult should never land on a step that no longer exists */
  r.step = Math.min(Math.max(Number(r.step) || 0, 0), total - 1);
  const step = steps[r.step].k;
  const adult = !onbNeedsGuardian(r.dob);
  const age = onbAge(r.dob);
  const tutor = role === "tutor";
  const pct = Math.round(((r.step + 1) / total) * 100);

  const rail = onbRailHTML();

  /* ---------- chrome: brand, progress, exit. No sidebar, no nav. ---------- */
  const top = `<div class="onb-top">
      <a class="onb-brand" href="${PF_ROOT}index.html">
        <span class="onb-mark"><svg viewBox="0 0 24 24"><path d="M7 20V5h7a5 5 0 010 10H10"/></svg></span>
        PathFinder <small>KENYA</small>
      </a>
      <span class="onb-count">${r.step + 1} / ${total}</span>
      <a class="onb-exit" href="${PF_ROOT}index.html" title="Leave setup — you can come back">Exit</a>
    </div>
    <div class="onb-prog" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${
      r.step + 1
    }" aria-label="Setup progress"><i style="width:${pct}%"></i></div>`;

  const hero = (icon, title, lead) => `<div class="onb-hero">
      <span class="onb-hero-ico">${ic(icon)}</span>
      <div><span class="onb-eyebrow">${tutor ? "Tutor setup" : "Before you start"} · step ${
        r.step + 1
      } of ${total}</span>
        <h1 class="onb-h1">${title}</h1>
        <p class="onb-lead">${lead}</p></div>
    </div>`;

  let head = "";
  let body = "";

  /* ---------- 1. the documents ---------- */
  if (step === "rules") {
    const docs = onbDocs();
    const read = r.docsRead.filter((x) => docs.some((d) => d.id === x)).length;
    head = hero(
      "i-shield",
      "Read this, then tick it.",
      `${docs.length} short documents. You are signing that you read them — not that you skimmed a wall of text.`
    );
    body = `<section class="onb-card">
      <div class="onb-card-head"><b>${read}/${docs.length} read</b>
        <span class="chip ${read === docs.length ? "green" : "amber"}">${ic(
          read === docs.length ? "i-check" : "i-file",
          "sm"
        )} ${read === docs.length ? "All read" : "Open each one"}</span></div>
      ${docs
        .map((d) => {
          const isRead = r.docsRead.indexOf(d.id) >= 0;
          return `<article class="doc${isRead ? " read" : ""}" data-doc="${d.id}">
            <button class="doc-top" data-doc-open="${d.id}" aria-expanded="${isRead ? "true" : "false"}">
              <span class="doc-tick">${isRead ? ic("i-check", "sm") : ic("i-file", "sm")}</span>
              <span class="doc-mid"><b>${esc(d.title)}</b><span>${esc(d.blurb)}</span></span>
              <span class="doc-chev">${ic("i-arr", "sm")}</span>
            </button>
            <div class="doc-body"${isRead ? "" : " hidden"}>
              <ul>${d.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
              <label class="check-row"><input type="checkbox" data-doc-tick="${d.id}"${isRead ? " checked" : ""}>
                <span>I have read this.</span></label>
            </div>
          </article>`;
        })
        .join("")}
      <div class="onb-acts">
        <button class="btn btn-lime" id="onbNext">Continue ${ic("i-arr", "sm")}</button>
      </div>
    </section>`;
  }

  /* ---------- 2. who you are ---------- */
  if (step === "you") {
    head = hero(
      "i-user",
      "Who you are",
      "Your age is worked out from your date of birth — that is what decides whether a guardian has to agree."
    );
    body = `<section class="onb-card">
      <div class="onb-field">
        <label class="flab" for="onbName">Full name</label>
        <input class="input" id="onbName" value="${esc(r.fullName || (S.profile && S.profile.name) || SESSION.name)}" autocomplete="name" placeholder="As it appears on your ID or school records">
      </div>
      <div class="onb-grid">
        <div class="onb-field">
          <label class="flab" for="onbDob">Date of birth</label>
          <div class="onb-date">
            <input class="input" id="onbDob" type="text" inputmode="numeric" autocomplete="bday" maxlength="10"
              placeholder="dd/mm/yyyy" value="${esc(pfDateFromISO(r.dob))}" aria-describedby="onbDobHint">
            <span class="onb-date-ico">${ic("i-cal", "sm")}</span>
          </div>
          <p class="tiny muted" id="onbDobHint">${onbDobHint(r.dob, age)}</p>
        </div>
        <div class="onb-field">
          <label class="flab" for="onbCounty">County</label>
          <select class="input" id="onbCounty">${COUNTIES.map(
            (c) =>
              `<option${(r.county || (S.profile && S.profile.county) || SESSION.county) === c ? " selected" : ""}>${esc(
                c
              )}</option>`
          ).join("")}</select>
        </div>
      </div>
      ${
        tutor
          ? `<div class="onb-field"><label class="flab" for="onbPhone">Phone (for session changes only)</label>
               <input class="input" id="onbPhone" inputmode="tel" value="${esc(r.phone || "")}" placeholder="07xx xxx xxx">
               <p class="tiny muted">Never shown to a learner — they reach you through PathFinder.</p></div>`
          : `<div class="onb-grid">
               <div class="onb-field"><label class="flab" for="onbSchool">School</label>
                 <input class="input" id="onbSchool" value="${esc(
                   r.school || (S.profile && S.profile.school) || ""
                 )}" placeholder="e.g. Nakuru High"></div>
               <div class="onb-field"><label class="flab" for="onbStage">Stage</label>
                 <select class="input" id="onbStage">${PF_STAGES.map(
                   (x) =>
                     `<option value="${esc(x.label)}"${
                       ((S.profile && S.profile.stage) || "") === x.label ? " selected" : ""
                     }>${esc(x.label)}</option>`
                 ).join("")}</select></div>
             </div>`
      }
      ${
        age != null && age < SAFETY_MIN_AGE
          ? `<div class="onb-note warn">${ic("i-shield", "sm")} Tutoring is for ages ${SAFETY_MIN_AGE} and up. Ask a guardian to sit with you — the pathway and funding tools still work without an account.</div>`
          : ""
      }
      ${
        tutor && age != null && age < SAFETY_AGE
          ? `<div class="onb-note warn">${ic("i-shield", "sm")} Tutors must be ${SAFETY_AGE} or older. You can keep exploring, but you cannot take bookings yet.</div>`
          : ""
      }
      <div class="onb-acts">
        <button class="btn btn-ghost" id="onbBack">Back</button>
        <button class="btn btn-lime" id="onbNext">Continue ${ic("i-arr", "sm")}</button>
      </div>
    </section>`;
  }

  /* ---------- 3a. a guardian ---------- */
  if (step === "guardian") {
    const g = r.guardian || {};
    head = hero(
      "i-users",
      "A guardian has to agree",
      `You are ${age} — under ${SAFETY_AGE}. This is the same consent a school asks for on a trip form.`
    );
    body = `<section class="onb-card">
      <div class="onb-field">
        <label class="flab" for="onbGuardianName">Guardian's full name</label>
        <input class="input" id="onbGuardianName" value="${esc(g.name || "")}" autocomplete="off" placeholder="e.g. Mary Kimani">
      </div>
      <div class="onb-grid">
        <div class="onb-field"><label class="flab" for="onbGuardianRel">Relationship</label>
          <select class="input" id="onbGuardianRel">${ONB_GUARDIAN_RELATIONS.map(
            (x) => `<option${g.relation === x ? " selected" : ""}>${esc(x)}</option>`
          ).join("")}</select></div>
        <div class="onb-field"><label class="flab" for="onbGuardianPhone">Their phone</label>
          <input class="input" id="onbGuardianPhone" inputmode="tel" value="${esc(g.phone || "")}" placeholder="07xx xxx xxx">
          <p class="tiny muted">Used for session changes and safety only.</p></div>
      </div>
      <label class="check-row onb-check"><input type="checkbox" id="onbGuardianAck"${g.ack ? " checked" : ""}>
        <span>My guardian knows I use PathFinder and agrees to the safety rules.</span></label>
      <div class="onb-note">${ic("i-info", "sm")} No text or call is sent automatically in demo mode — this record is what a human reviewer checks if a report is filed.</div>
      <div class="onb-acts">
        <button class="btn btn-ghost" id="onbBack">Back</button>
        <button class="btn btn-lime" id="onbNext">Continue ${ic("i-arr", "sm")}</button>
      </div>
    </section>`;
  }

  /* ---------- 3b. a tutor's papers, uploadable here ---------- */
  if (step === "papers") {
    head = hero(
      "i-file",
      "Your papers",
      "Add what you have now. You can skip and upload later from Verification — your badge then says <b>unverified</b>, honestly, until a reviewer records the check."
    );
    body = `<section class="onb-card">
      <div class="onb-papers">
        ${ONB_PAPERS.map(([k, name, hint]) => {
          const doc = onbTutorDoc(k);
          return `<div class="paper${doc ? " has" : ""}">
            <span class="ac-dot ${doc ? "green" : "amber"}">${ic(doc ? "i-check" : "i-file")}</span>
            <div class="paper-txt"><b>${esc(name)}</b>
              <span>${doc ? `${esc(doc.name)} · ${docSize(doc.size)} · saved` : esc(hint)}</span></div>
            <div class="paper-acts">
              <button type="button" class="btn btn-ghost btn-sm" data-papcam="${k}">${ic("i-camera", "sm")} Photo</button>
              <input id="pap-cam-${k}" type="file" accept="image/*" capture="environment" hidden data-pap="${k}">
              <label class="btn btn-ghost btn-sm" for="pap-file-${k}">${ic("i-upload", "sm")} File</label>
              <input id="pap-file-${k}" type="file" accept="image/*,application/pdf" hidden data-pap="${k}">
            </div>
          </div>`;
        }).join("")}
      </div>
      <div class="onb-note">${ic("i-lock", "sm")} Files are shrunk and kept on this device. A reviewer opens them from the console — nothing is published anywhere.</div>
      <div class="onb-acts">
        <button class="btn btn-ghost" id="onbSkipDocs">Skip for now</button>
        <button class="btn btn-lime" id="onbNext">Continue ${ic("i-arr", "sm")}</button>
      </div>
    </section>`;
  }

  /* ---------- 4. the signature ---------- */
  if (step === "sign") {
    const can = onbCanFinish();
    const s = r.signed;
    head = hero(
      "i-edit",
      "Sign it",
      `Type your full name. It is stored with the date, version ${esc(
        SAFETY_VERSION
      )} of the documents${adult ? " and your age" : " and your guardian's details"}.`
    );
    body = `<section class="onb-card">
      <div class="onb-summary">
        <div class="onb-sum"><span>Name</span><b>${esc(
          r.fullName || (S.profile && S.profile.name) || SESSION.name
        )}</b></div>
        <div class="onb-sum"><span>Age</span><b>${age == null ? "—" : age}</b></div>
        ${
          adult
            ? ""
            : `<div class="onb-sum"><span>Guardian</span><b>${esc((r.guardian && r.guardian.name) || "—")}</b></div>`
        }
        <div class="onb-sum"><span>Documents</span><b>${r.docsRead.length} of ${onbDocs().length} read</b></div>
        <div class="onb-sum"><span>Version</span><b>${esc(SAFETY_VERSION)}</b></div>
      </div>
      <div class="onb-field" style="margin-top:12px">
        <label class="flab" for="onbSignName">Type your full name to sign</label>
        <input class="input onb-sign" id="onbSignName" value="${esc((s && s.name) || "")}" placeholder="${esc(
          r.fullName || SESSION.name
        )}" autocomplete="off">
      </div>
      <label class="check-row onb-check"><input type="checkbox" id="onbAgree"${s ? " checked" : ""}>
        <span>I have read the safety rules and I agree to them${adult ? "" : ", and my guardian agrees too"}.</span></label>
      ${
        can
          ? ""
          : `<div class="onb-note warn">${ic("i-shield", "sm")} Still missing: ${
              !onbAllRead()
                ? "tick every safety document"
                : !adult && !(r.guardian && r.guardian.name && r.guardian.phone && r.guardian.ack)
                  ? "your guardian's details"
                  : "your name in the box above"
            }.</div>`
      }
      <div class="onb-acts">
        <button class="btn btn-ghost" id="onbBack">Back</button>
        <button class="btn btn-lime" id="onbFinish"${can ? "" : " disabled"}>${ic("i-check", "sm")} Sign</button>
      </div>
    </section>`;
  }

  /* ---------- 5. set up the profile ---------- */
  if (step === "profile") {
    const who = (SESSION && SESSION.name) || (S.profile && S.profile.name) || "You";
    head = hero(
      "i-camera",
      tutor ? "Finish your tutor profile" : "Set up your profile",
      tutor
        ? "A picture and two lines about how you teach. Learners see these on your profile."
        : "A picture, so tutors and reviewers know who they are talking to. You can change any of it later."
    );
    body = `<section class="onb-card">
      <div class="onb-profile">
        <button class="onb-av" id="onbAv" aria-label="Change your picture">${genAvatar(who, 84)}
          <span class="onb-av-b">${ic("i-camera", "sm")}</span></button>
        <div style="min-width:0">
          <b class="onb-name">${esc(who)}</b>
          <p class="tiny muted">${esc(
            [r.county || (S.profile && S.profile.county), tutor ? "Tutor" : S.profile.stage].filter(Boolean).join(" · ")
          )}</p>
          <div class="onb-acts" style="justify-content:flex-start;margin-top:8px">
            <button class="btn btn-line btn-sm" id="onbAv2">${ic("i-user", "sm")} Choose your picture</button>
          </div>
        </div>
      </div>
      ${
        tutor
          ? `<div class="onb-field"><label class="flab" for="onbBio">Two lines about how you teach</label>
               <textarea class="input" id="onbBio" rows="2" maxlength="180" placeholder="e.g. Former Alliance High teacher, 9 years coaching KCSE candidates.">${esc(
                 (S.profile && S.profile.bio) || ""
               )}</textarea></div>
             <div class="onb-grid">
               <div class="onb-field"><label class="flab" for="onbRate">Hourly rate</label>
                 <select class="input" id="onbRate">${[350, 400, 450, 500, 550, 600]
                   .map(
                     (x) =>
                       `<option value="${x}"${Number(S.tutorRate || 450) === x ? " selected" : ""}>KES ${x}/hr</option>`
                   )
                   .join("")}</select>
                 <p class="tiny muted">The pilot band is KES 350–600. Fees are recorded, never charged in-app.</p></div>
               <div class="onb-field"><label class="flab">Subjects</label>
                 <div class="onb-subj">${SUBJECTS.slice(0, 8)
                   .map(
                     (x) =>
                       `<button type="button" class="onb-chip${
                         ((S.profile && S.profile.subjects) || []).includes(x) ? " on" : ""
                       }" data-onb-subj="${esc(x)}">${esc(x)}</button>`
                   )
                   .join("")}</div></div>
             </div>`
          : `<div class="onb-field"><label class="flab" for="onbPath">What are you working towards?</label>
               <select class="input" id="onbPath">
                 ${["University degree", "TVET / polytechnic", "Not sure yet", "Improving my grades"]
                   .map(
                     (x) =>
                       `<option${((S.profile && S.profile.goal) || "") === x ? " selected" : ""}>${esc(x)}</option>`
                   )
                   .join("")}
               </select></div>`
      }
      <div class="onb-note">${ic("i-info", "sm")} Your picture stays on this device${
        typeof sb !== "undefined" && sb.live() ? "; your name and details are saved to your Supabase profile" : ""
      }. Nothing here is shown publicly in demo mode.</div>
      <div class="onb-acts">
        <button class="btn btn-ghost" id="onbSkipProfile">Skip</button>
        <button class="btn btn-lime" id="onbEnter">${ic("i-arr", "sm")} Start using PathFinder</button>
      </div>
    </section>`;
  }

  box.innerHTML = `<div class="onb-wrap">${top}${head}<ol class="onb-rail">${rail}</ol>${body}</div>`;
  wireWelcome();
  reveal();
}

function onbRailHTML() {
  const r = onbState();
  return onbSteps()
    .map((s, i) => {
      const state = i < r.step ? "done" : i === r.step ? "on" : "";
      return `<li class="${state}"><span>${i < r.step ? ic("i-check", "sm") : i + 1}</span>${esc(s.label)}</li>`;
    })
    .join("");
}
function onbDobHint(dob, age) {
  if (!dob) return "Type it as dd/mm/yyyy — the slash appears on its own.";
  if (age == null) return "That date does not look right — check the day and month.";
  if (age < SAFETY_MIN_AGE) return `${age} years. Tutoring needs ${SAFETY_MIN_AGE}+.`;
  if (age < SAFETY_AGE) return `${age} years — under ${SAFETY_AGE}, so a guardian name and number come next.`;
  return `${age} years — no guardian needed.`;
}

function wireWelcome() {
  const box = $("#welcomeBox");
  if (!box) return;
  const tutor = SESSION && SESSION.role === "tutor";

  /* --- step: documents --- */
  $$("[data-doc-open]", box).forEach((b) =>
    b.addEventListener("click", () => {
      const art = b.closest(".doc");
      const bodyEl = art.querySelector(".doc-body");
      const open = !bodyEl.hasAttribute("hidden");
      if (open) bodyEl.setAttribute("hidden", "");
      else bodyEl.removeAttribute("hidden");
      b.setAttribute("aria-expanded", String(!open));
    })
  );
  $$("[data-doc-tick]", box).forEach((c) =>
    c.addEventListener("change", () => {
      const id = c.dataset.docTick;
      const read = onbState().docsRead.filter((x) => x !== id);
      if (c.checked) read.push(id);
      onbSave({ docsRead: read });
      if (typeof saveSoon === "function") saveSoon(120);
      renderWelcome();
    })
  );

  /* --- step: you --- */
  if ($("#onbName")) $("#onbName").addEventListener("input", () => onbPatch({ fullName: $("#onbName").value }));
  if ($("#onbDob")) {
    /* a dd/mm/yyyy text field: type it, backspace through it, paste it. Nothing
       re-renders while somebody is typing — only the hint and the step rail
       refresh, so the caret stays where they put it. */
    pfDateWire($("#onbDob"), (iso) => {
      if (iso === ((onbState() || {}).dob || "")) return;
      onbPatch({ dob: iso });
      if ($("#onbDobHint")) $("#onbDobHint").textContent = onbDobHint(iso, onbAge(iso));
      const rail = $(".onb-rail", box);
      if (rail) rail.innerHTML = onbRailHTML();
    });
    $("#onbDob").addEventListener("blur", () => {
      const iso = pfDateToISO($("#onbDob").value);
      if (iso) onbSave({ dob: iso });
    });
  }
  if ($("#onbCounty"))
    $("#onbCounty").addEventListener("change", () => {
      if (S.profile) S.profile.county = $("#onbCounty").value;
      onbSave({ county: $("#onbCounty").value });
    });
  if ($("#onbSchool"))
    $("#onbSchool").addEventListener("input", () => {
      if (S.profile) S.profile.school = $("#onbSchool").value;
      onbPatch({ school: $("#onbSchool").value });
    });
  if ($("#onbStage"))
    $("#onbStage").addEventListener("change", () => {
      if (S.profile) S.profile.stage = $("#onbStage").value;
      save();
    });
  if ($("#onbPhone")) $("#onbPhone").addEventListener("input", () => onbPatch({ phone: $("#onbPhone").value }));

  /* --- step: guardian --- */
  if ($("#onbGuardianName")) {
    $("#onbGuardianName").addEventListener("input", () =>
      onbPatch({ guardian: Object.assign({}, onbState().guardian, { name: $("#onbGuardianName").value }) })
    );
    $("#onbGuardianPhone").addEventListener("input", () =>
      onbPatch({ guardian: Object.assign({}, onbState().guardian, { phone: $("#onbGuardianPhone").value }) })
    );
    $("#onbGuardianRel").addEventListener("change", () =>
      onbSave({ guardian: Object.assign({}, onbState().guardian, { relation: $("#onbGuardianRel").value }) })
    );
    $("#onbGuardianAck").addEventListener("change", () =>
      onbSave({ guardian: Object.assign({}, onbState().guardian, { ack: $("#onbGuardianAck").checked }) })
    );
  }

  /* --- step: papers (uploaded in place, no jumping to another page) --- */
  const savePaper = (k, doc) => {
    const key = onbTutorKey();
    S.verifyDocs = S.verifyDocs || {};
    S.verifyDocs[key] = S.verifyDocs[key] || {};
    S.verifyDocs[key][k] = Object.assign({}, doc, { ts: Date.now(), status: "pending" });
    save();
    renderWelcome();
    toast(
      doc.data ? doc.name + " saved for the reviewer" : doc.name + " — " + (doc.note || "details saved only"),
      doc.data ? "i-check" : "i-info"
    );
  };
  $$("[data-papcam]", box).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const k = btn.dataset.papcam;
      if (typeof pfCameraSupported !== "function" || !pfCameraSupported()) {
        const input = $(`#pap-cam-${k}`);
        if (input) input.click();
        return;
      }
      const opened = await pfOpenCamera({
        facing: "environment",
        square: false,
        maxSide: 1200,
        title: "Photograph the document",
        hint: "All four corners inside the frame, please — this is what a reviewer checks.",
        onShot: (url) => savePaper(k, photoToDoc(url, `${k}-photo`))
      });
      if (!opened) {
        const input = $(`#pap-cam-${k}`);
        if (input) input.click();
      }
    })
  );
  $$("[data-pap]", box).forEach((input) =>
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const k = input.dataset.pap;
      readDocFile(file, (doc) => {
        const key = onbTutorKey();
        S.verifyDocs = S.verifyDocs || {};
        S.verifyDocs[key] = S.verifyDocs[key] || {};
        S.verifyDocs[key][k] = Object.assign({}, doc, { ts: Date.now(), status: "pending" });
        save();
        renderWelcome();
        toast(
          doc.data ? doc.name + " saved for the reviewer" : doc.name + " — " + (doc.note || "details saved only"),
          doc.data ? "i-check" : "i-info"
        );
      });
    })
  );

  /* --- step: sign --- */
  if ($("#onbAgree")) $("#onbAgree").addEventListener("change", () => onbSave({ agreed: $("#onbAgree").checked }));
  if ($("#onbSignName"))
    $("#onbSignName").addEventListener("input", () => {
      if ($("#onbFinish")) $("#onbFinish").disabled = !onbCanFinish();
    });
  if ($("#onbFinish"))
    $("#onbFinish").addEventListener("click", () => {
      const typed = ($("#onbSignName") && $("#onbSignName").value.trim()) || "";
      const who = onbState().fullName || (S.profile && S.profile.name) || SESSION.name;
      if (typed.length < 3) return toast("Type your full name to sign", "i-info", true);
      if (typed.toLowerCase().replace(/\s+/g, " ") !== String(who).toLowerCase().replace(/\s+/g, " "))
        return toast("That is not the name on this account (" + who + ")", "i-info", true);
      if (!$("#onbAgree").checked) return toast("Tick the agreement box", "i-info", true);
      if (!onbCanFinish()) return toast("Something is still missing — check the note above", "i-info", true);

      /* the details they typed become their profile */
      if (S.profile) {
        S.profile.name = who;
        S.profile.county = onbState().county || S.profile.county;
        S.profile.school = onbState().school || S.profile.school;
      }
      onbSign(typed);
      /* A real tutor keeps their own record (tx-<account id>). Pointing them at
         the demo tutor "t1" used to hand a brand-new tutor that profile's four
         green verification ticks, and orphaned the papers they had just
         uploaded — both wrong. */
      save();
      toast("Safety check signed", "i-check");
      /* the profile card is the last step before the app opens */
      onbSave({ step: Math.min(onbSteps().length - 1, onbState().step + 1) });
      renderWelcome();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  /* --- step: profile --- */
  const pickPhoto = () => {
    if (typeof openAvatarPicker === "function") openAvatarPicker();
  };
  ["#onbAv", "#onbAv2"].forEach((sel) => {
    if ($(sel)) $(sel).addEventListener("click", pickPhoto);
  });
  if ($("#onbBio"))
    $("#onbBio").addEventListener("input", () => {
      if (S.profile) S.profile.bio = $("#onbBio").value;
      if (typeof saveSoon === "function") saveSoon(300);
      else save();
    });
  if ($("#onbRate"))
    $("#onbRate").addEventListener("change", () => {
      S.tutorRate = Number($("#onbRate").value) || 450;
      save();
    });
  $$("[data-onb-subj]", box).forEach((b) =>
    b.addEventListener("click", () => {
      S.profile.subjects = S.profile.subjects || [];
      const x = b.dataset.onbSubj;
      S.profile.subjects = S.profile.subjects.includes(x)
        ? S.profile.subjects.filter((s) => s !== x)
        : S.profile.subjects.concat(x);
      b.classList.toggle("on");
      save();
    })
  );
  if ($("#onbPath"))
    $("#onbPath").addEventListener("change", () => {
      if (S.profile) S.profile.goal = $("#onbPath").value;
      save();
    });
  ["#onbEnter", "#onbSkipProfile"].forEach((sel) => {
    if ($(sel))
      $(sel).addEventListener("click", () => {
        save();
        const dest = tutor ? "tutor/dashboard.html" : "student/dashboard.html";
        toast(tutor ? "You're in — welcome to the tutor workspace" : "You're in — karibu PathFinder", "i-check");
        setTimeout(() => {
          try {
            location.assign(PF_ROOT + dest);
          } catch (e) {}
        }, 220);
      });
  });

  /* --- back / continue --- */
  if ($("#onbBack"))
    $("#onbBack").addEventListener("click", () => {
      onbSave({ step: Math.max(0, onbState().step - 1) });
      renderWelcome();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  if ($("#onbNext"))
    $("#onbNext").addEventListener("click", () => {
      const st = onbSteps();
      const cur = st[onbState().step].k;
      if (cur === "rules" && !onbAllRead())
        return toast("Tick every document — there are " + onbDocs().length, "i-info", true);
      if (cur === "you") {
        const raw = $("#onbDob") ? $("#onbDob").value : "";
        const dob = pfDateToISO(raw);
        if (!raw.replace(/\D/g, ""))
          return toast("Add your date of birth — it decides whether a guardian is needed", "i-info", true);
        if (!dob) return toast("That date does not look right — day, month, year as dd/mm/yyyy", "i-info", true);
        onbSave({ dob });
        const age = onbAge(dob);
        if (age < SAFETY_MIN_AGE)
          return toast("PathFinder tutoring is for ages " + SAFETY_MIN_AGE + "+", "i-info", true);
        if (tutor && age < SAFETY_AGE) return toast("Tutors must be 18 or older", "i-info", true);
        if (!$("#onbName") || !$("#onbName").value.trim()) return toast("Add your full name", "i-info", true);
        if (tutor && $("#onbPhone") && !$("#onbPhone").value.trim())
          return toast("Add a phone number — it is how session changes reach you", "i-info", true);
      }
      if (cur === "guardian") {
        const g = onbState().guardian || {};
        if (!g.name || !g.name.trim()) return toast("Add your guardian's name", "i-info", true);
        if (!g.phone || g.phone.replace(/\D/g, "").length < 9)
          return toast("Add a guardian phone number", "i-info", true);
        if (!g.ack) return toast("Your guardian has to agree", "i-info", true);
      }
      onbSave({ step: onbState().step + 1 });
      renderWelcome();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  if ($("#onbSkipDocs"))
    $("#onbSkipDocs").addEventListener("click", () => {
      onbSave({ docsSkipped: true, step: onbState().step + 1 });
      toast("Skipped — your profile shows unverified until you upload", "i-info");
      renderWelcome();
    });
}

renderWelcome();
