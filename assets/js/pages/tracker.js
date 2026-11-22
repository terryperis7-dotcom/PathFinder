/* Academic tracker (/student/tracker.html): targets, assessment log, CSV.

   The same page works for every stage: the target dropdown offers KCSE grades
   or CBC levels depending on where the learner is, and every percentage is
   computed from the scale actually in use. */
function renderTracker() {
  const box = $("#trackerBox");
  if (!box) return;
  const subs = stageSubjects();
  const canTarget = true;
  const targetOpts = isCBC() ? CBC_LEVELS.map((l) => l.code) : GRADES.map((g) => g[0]);
  const targetPct = (s) => (isCBC() ? gradePctFor(S.targets[s] || "") : (gradePts(S.targets[s] || "") / 12) * 100);

  box.innerHTML = `
    <div class="page-head">
      <div><span class="eyebrow">${esc(stage().label)}</span><h2 class="page-title">My progress</h2>
        <p class="page-sub"><span class="chip">${isCBC() ? "CBC levels" : "KCSE grades 12–1"}</span><span class="chip">${esc(subs.length)} learning areas</span><span class="chip">${S.assessments.length} logged</span></p></div>
      <div class="page-acts"><button class="btn btn-ghost btn-sm" id="csvExport">${ic("i-download", "sm")} Export CSV</button></div>
    </div>

    <div class="grid g2" style="align-items:start">
      <section class="card">
        <div class="sec-head"><div><h3>Targets</h3><p class="tiny muted">Set the ${isCBC() ? "level" : "grade"} you are working towards. The tick on the bars below is it.</p></div></div>
        <div class="g-grid tight">
          ${subs
            .map(
              (
                s
              ) => `<div class="g-row"><div><b>${esc(s)}</b><small>now ${esc(S.grades[s] ? gradeLabel(S.grades[s]) : "—")}</small></div>
              <select class="input" data-target="${esc(s)}" aria-label="Target for ${esc(s)}"><option value="">No target</option>
              ${targetOpts.map((g) => `<option value="${g}"${S.targets[s] === g ? " selected" : ""}>${esc(isCBC() ? gradeLabel(g) : g)}</option>`).join("")}</select></div>`
            )
            .join("")}
        </div>
        ${canTarget ? "" : ""}
      </section>

      <div class="stack">
        <section class="card">
          <div class="sec-head"><div><h3>Log an assessment</h3><p class="tiny muted">A mock, a CAT, an end-term paper or an SBA task.</p></div></div>
          <label class="flab" for="asSubj">Learning area</label>
          <select class="input" id="asSubj">${subs.map((s) => `<option>${esc(s)}</option>`).join("")}</select>
          <div class="grid g2" style="margin-top:12px;gap:12px">
            <div><label class="flab" for="asScore">Score (%)</label><input class="input" id="asScore" type="number" min="0" max="100" inputmode="numeric" placeholder="e.g. 68"></div>
            <div><label class="flab" for="asDate">Date</label><input class="input" id="asDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
          </div>
          <button class="btn btn-lime btn-block" id="asAdd" style="margin-top:14px">${ic("i-spark", "sm")} Log assessment</button>
        </section>

        <section class="card">
          <div class="sec-head"><div><h3>Latest vs target</h3><p class="tiny muted">Orange means the last score sits below your target.</p></div></div>
          <div class="chart">
            ${subs
              .map((s) => {
                const latest = (S.assessments || []).filter((a) => a.subj === s).sort((a, b) => b.ts - a.ts)[0];
                const p = latest ? latest.score : 0;
                const tg = targetPct(s);
                return `<div class="chart-row"><span class="lab">${esc(s)}</span>
                  <div class="chart-track"><i style="width:${p}%;${latest && tg && p < tg ? "background:linear-gradient(90deg,#ff7a59,#ffb020)" : ""}"></i>${tg ? `<span class="tgt" style="left:${tg}%"></span>` : ""}</div>
                  <span class="val">${latest ? p + "%" : "—"}</span></div>`;
              })
              .join("")}
          </div>
        </section>
      </div>
    </div>

    <section class="card" style="margin-top:16px">
      <div class="sec-head"><div><h3>Assessment log</h3><p class="tiny muted">Newest first. Delete a row with the ✕.</p></div></div>
      ${
        S.assessments.length
          ? `<div class="table-scroll"><table class="tbl" style="min-width:480px"><thead><tr><th>Date</th><th>Learning area</th><th style="text-align:right">Score</th><th>vs target</th><th></th></tr></thead><tbody>
            ${[...S.assessments]
              .sort((a, b) => b.ts - a.ts)
              .map((a) => {
                const tg = targetPct(a.subj);
                const ok = !tg || a.score >= tg;
                return `<tr><td class="tiny muted">${esc(a.date)}</td><td><b style="color:var(--pine3)">${esc(a.subj)}</b></td>
                  <td style="text-align:right;font-family:var(--font-d);font-weight:800">${a.score}%</td>
                  <td><span class="chip ${ok ? "green" : "amber"}">${tg ? (ok ? "on track" : "below") : "no target"}</span></td>
                  <td style="text-align:right"><button class="btn btn-ghost btn-sm" data-del-as="${a.id}" aria-label="Delete this assessment">${ic("i-x", "sm")}</button></td></tr>`;
              })
              .join("")}
          </tbody></table></div>`
          : `<p class="small muted">No assessments logged yet — add your first mock above.</p>`
      }
    </section>`;

  $$("[data-target]", box).forEach((sel) =>
    sel.addEventListener("change", () => {
      if (sel.value) S.targets[sel.dataset.target] = sel.value;
      else delete S.targets[sel.dataset.target];
      save();
      renderTracker();
    })
  );
  $("#asAdd").addEventListener("click", () => {
    const score = +$("#asScore").value;
    if (!(score >= 0 && score <= 100)) {
      toast("Enter a score between 0 and 100", "i-info");
      return;
    }
    S.assessments.push({
      id: Date.now(),
      subj: $("#asSubj").value,
      score,
      date: $("#asDate").value || new Date().toISOString().slice(0, 10),
      ts: Date.now()
    });
    save();
    if (typeof push === "function") push("assessment", S.assessments[S.assessments.length - 1]);
    renderTracker();
    toast("Assessment logged", "i-check");
  });
  $$("[data-del-as]", box).forEach((b) =>
    b.addEventListener("click", () => {
      S.assessments = S.assessments.filter((a) => a.id !== +b.dataset.delAs);
      save();
      renderTracker();
    })
  );
  $("#csvExport").addEventListener("click", () => {
    const rows = [
      ["date", "subject", "score", "target"],
      ...S.assessments.map((a) => [a.date, a.subj, a.score, S.targets[a.subj] || ""])
    ];
    if (saveFile("pathfinder-tracker.csv", toCSV(rows))) toast("CSV exported", "i-download");
  });
}

/* ---------- page boot ---------- */
renderTracker();
reveal();
