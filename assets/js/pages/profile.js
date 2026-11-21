/* Profile, JSON data export and sign-out. */
/* ---------- Profile ---------- */
function renderProfile() {
  const box = $("#profileBox");
  const p = S.profile;
  box.innerHTML = `<span class="eyebrow">Account & data</span><h2 style="font-size:28px;margin:6px 0 16px">My profile</h2>
  <div class="grid g2" style="align-items:start">
    <div class="card" style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap">
      <div style="flex:0 0 auto">${genAvatar(p.name || (SESSION && SESSION.name) || "Guest", 96)}</div>
      <div style="flex:1;min-width:220px">
        <label class="flab" for="pfName">Full name</label><input class="input" id="pfName" value="${esc(p.name || (SESSION && SESSION.name) || "")}">
        <label class="flab" for="pfStage" style="margin-top:12px">Stage</label><select class="input" id="pfStage">${["CBC Grade 7–9", "CBC Grade 10–12", "KCSE Form 3–4", "Form Four leaver", "TVET scholar"].map((s) => `<option${p.stage === s ? " selected" : ""}>${s}</option>`).join("")}</select>
        <label class="flab" for="pfCounty" style="margin-top:12px">County</label><select class="input" id="pfCounty">${COUNTIES.map((c) => `<option${(p.county || (SESSION && SESSION.county)) === c ? " selected" : ""}>${c}</option>`).join("")}</select>
        <label class="flab" for="pfSchool" style="margin-top:12px">School</label><input class="input" id="pfSchool" value="${esc(p.school || "")}" placeholder="e.g. Nakuru High">
        <button class="btn btn-lime btn-block" id="pfSave" style="margin-top:16px">${ic("i-check", "sm")} Save profile</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card"><h3 style="font-size:17px;margin-bottom:8px">Your data, your control</h3><p class="small muted" style="margin-bottom:14px">Under the Data Protection Act 2019 you can export everything PathFinder holds about you. We never sell data.</p><button class="btn btn-line btn-block" id="jsonExport">${ic("i-download", "sm")} Export my data (JSON)</button>${SESSION ? `<button class="btn btn-ghost btn-block" id="pfSignOut" style="margin-top:10px">${ic("i-logout", "sm")} Sign out</button>` : `<button class="btn btn-ghost btn-block" data-nav="signin" style="margin-top:10px">Sign in to sync</button>`}</div>
      <div class="card"><h3 style="font-size:17px;margin-bottom:10px">At a glance</h3><div class="cmp-cell"><span>Subjects entered</span><b>${Object.keys(S.grades).length} / 12</b></div><div class="cmp-cell"><span>Assessments logged</span><b>${S.assessments.length}</b></div><div class="cmp-cell"><span>Shortlisted</span><b>${S.shortlist.length}</b></div><div class="cmp-cell"><span>Sessions</span><b>${S.bookings.filter((b) => b.mine).length}</b></div><div class="cmp-cell"><span>Messages blocked</span><b>${S.safetyLog.length}</b></div><div class="cmp-cell"><span>Mode</span><b>${sb.enabled() ? "Supabase" : "Local demo"}</b></div></div>
    </div>
  </div>`;
  $("#pfSave").addEventListener("click", () => {
    S.profile = {
      name: $("#pfName").value.trim(),
      stage: $("#pfStage").value,
      county: $("#pfCounty").value,
      school: $("#pfSchool").value.trim()
    };
    save();
    renderShell("profile");
    renderProfile();
    toast("Profile saved", "i-check");
  });
  $("#jsonExport").addEventListener("click", () => {
    const data = {
      profile: S.profile,
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
