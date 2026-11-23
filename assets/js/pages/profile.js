/* Profile (/student/profile.html): picture, stage, details, data export.

   The picture is a first-class control here — an illustrated face, a coloured
   monogram, or a photo,
   with a colour of your choosing — because "change my pfp" should take one tap,
   not a hunt through settings. */
function renderProfile() {
  const box = $("#profileBox");
  if (!box) return;
  const p = S.profile;
  const who = p.name || sessionName() || "Guest";
  const s = stage();
  const fits = cbePathwayFit();

  box.innerHTML = `
    <div class="page-head"><div><span class="eyebrow">Account & data</span><h2 class="page-title">My profile</h2>
      <p class="page-sub"><span class="chip">${esc(s.label)}</span><span class="chip">${sb.live() ? "Supabase" : "Local demo"}</span></p></div></div>

    <div class="grid g2" style="align-items:start">
      <section class="card">
        <div class="pf-hero">
          <button class="pf-av" id="pfAvatar" aria-label="Change your profile picture">${genAvatar(who, 96)}<span class="pf-av-badge">${ic("i-pencil", "sm")}</span></button>
          <div style="min-width:0">
            <b class="pf-name">${esc(who)}</b>
            <p class="tiny muted">Tap your picture to pick a new one — a face, a coloured monogram or a photo.</p>
            <button class="btn btn-line btn-sm" id="pfAvatar2" style="margin-top:10px">${ic("i-user", "sm")} Change picture</button>
          </div>
        </div>
        <div class="divider"></div>
        <label class="flab" for="pfName">Full name</label>
        <input class="input" id="pfName" value="${esc(p.name || sessionName())}" autocomplete="name">
        <label class="flab" for="pfStage" style="margin-top:12px">Stage</label>
        <select class="input" id="pfStage">${PF_STAGES.map((x) => `<option value="${esc(x.label)}"${s.id === x.id ? " selected" : ""}>${esc(x.label)} — ${esc(x.system === "cbc" ? "CBC" : "8-4-4")}</option>`).join("")}</select>
        <p class="tiny muted" style="margin-top:6px">${esc(s.examNote || "This changes your subjects, grading scale and advice.")}</p>
        ${
          s.id === "senior"
            ? `<label class="flab" style="margin-top:12px">Senior pathway</label>
               <div class="cbe-paths">${CBE_PATHWAYS.map((x) => `<button type="button" class="cbe-path${cbePathway() && cbePathway().id === x.id ? " on" : ""}" data-pathway="${x.id}"><b>${esc(x.label)}</b><span>${esc(x.blurb)}</span></button>`).join("")}</div>`
            : s.system === "cbc"
              ? `<div class="cv-block" style="margin-top:12px"><b>Likely senior pathway</b><p class="tiny muted">From your levels: <b>${esc(fits[0] && fits[0].has ? fits[0].label : "not enough entered yet")}</b>. You will confirm this in Grade 10.</p></div>`
              : ""
        }
        <label class="flab" for="pfCounty" style="margin-top:12px">County</label>
        <select class="input" id="pfCounty">${COUNTIES.map((c) => `<option${(p.county || (SESSION && SESSION.county)) === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
        <label class="flab" for="pfSchool" style="margin-top:12px">School</label>
        <input class="input" id="pfSchool" value="${esc(p.school || "")}" placeholder="e.g. Nakuru High">
        <button class="btn btn-lime btn-block" id="pfSave" style="margin-top:16px">${ic("i-check", "sm")} Save profile</button>
      </section>

      <div class="stack">
        <section class="card">
          <div class="sec-head"><div><h3>Safety check</h3><p class="tiny muted">The rules you agreed to, and when.</p></div></div>
          ${safetySignatureHTML()}
        </section>
        <section class="card">
          <div class="sec-head"><div><h3>Your data, your control</h3><p class="tiny muted">Data Protection Act 2019 — export everything we hold.</p></div></div>
          <button class="btn btn-line btn-block" id="jsonExport">${ic("i-download", "sm")} Export my data (JSON)</button>
          ${SESSION ? `<button class="btn btn-ghost btn-block" id="pfSignOut" style="margin-top:10px">${ic("i-logout", "sm")} Sign out</button>` : `<button class="btn btn-ghost btn-block" data-nav="signin" style="margin-top:10px">Sign in to sync</button>`}
        </section>
        <section class="card">
          <div class="sec-head"><div><h3>At a glance</h3></div></div>
          <div class="cmp-cell"><span>Learning areas entered</span><b>${stageSubjects().filter((x) => S.grades[x]).length} / ${stageSubjects().length}</b></div>
          <div class="cmp-cell"><span>Assessments logged</span><b>${S.assessments.length}</b></div>
          <div class="cmp-cell"><span>Shortlisted</span><b>${S.shortlist.length}</b></div>
          <div class="cmp-cell"><span>Sessions</span><b>${S.bookings.filter((b) => b.mine).length}</b></div>
          <div class="cmp-cell"><span>Messages blocked</span><b>${S.safetyLog.length}</b></div>
          <div class="cmp-cell"><span>Mode</span><b>${sb.live() ? "Supabase" : "Local demo"}</b></div>
        </section>
      </div>
    </div>`;

  const openPicker = () => openAvatarPicker();
  $("#pfAvatar").addEventListener("click", openPicker);
  $("#pfAvatar2").addEventListener("click", openPicker);
  $$("[data-pathway]", box).forEach((b) =>
    b.addEventListener("click", () => {
      S.profile.pathway = b.dataset.pathway;
      const path = cbePathway();
      S.profile.electives = path ? path.electives.slice(0, 3) : [];
      save();
      renderProfile();
      toast("Pathway set to " + path.label, "i-check");
    })
  );
  $("#pfSave").addEventListener("click", () => {
    S.profile.name = $("#pfName").value.trim();
    S.profile.stage = $("#pfStage").value;
    S.profile.county = $("#pfCounty").value;
    S.profile.school = $("#pfSchool").value.trim();
    save();
    renderShell();
    renderProfile();
    toast("Profile saved", "i-check");
  });
  $("#jsonExport").addEventListener("click", () => {
    const data = {
      profile: S.profile,
      stage: stageId(),
      grades: S.grades,
      targets: S.targets,
      assessments: S.assessments,
      result: S.result,
      shortlist: S.shortlist,
      exported: new Date().toISOString()
    };
    if (saveFile("pathfinder-my-data.json", JSON.stringify(data, null, 2), "application/json"))
      toast("My data exported", "i-download");
  });
  const so = $("#pfSignOut");
  if (so) so.addEventListener("click", signOut);
}

/* ---------- page boot ---------- */
renderProfile();
reveal();
