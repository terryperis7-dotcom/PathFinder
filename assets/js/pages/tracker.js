/* Academic tracker: targets, assessment log, CSV export. */
/* ---------- Tracker ---------- */
function renderTracker() {
  const box = $("#trackerBox");
  box.innerHTML = `<span class="eyebrow">Academics</span><h2 style="font-size:28px;margin:6px 0 4px">My progress</h2><p class="muted small" style="margin-bottom:18px">Set targets, log mocks, and watch weak subjects before they become bottlenecks.</p>
  <div class="grid g2" style="align-items:start">
    <div class="card"><h3 style="font-size:17px;margin-bottom:14px">Subject targets</h3><div style="display:flex;flex-direction:column;gap:8px">${SUBJECTS.map((s) => `<div class="g-row"><div><b>${esc(s)}</b><small>current ${esc(S.grades[s] || "—")}</small></div><select class="input" data-target="${esc(s)}"><option value="">No target</option>${GRADES.map((g) => `<option value="${g[0]}"${S.targets[s] === g[0] ? " selected" : ""}>${g[0]}</option>`).join("")}</select></div>`).join("")}</div></div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card"><h3 style="font-size:17px;margin-bottom:14px">Log an assessment</h3><label class="flab" for="asSubj">Subject</label><select class="input" id="asSubj">${SUBJECTS.map((s) => `<option>${s}</option>`).join("")}</select><div class="grid g2" style="margin-top:12px;gap:12px"><div><label class="flab" for="asScore">Score (%)</label><input class="input" id="asScore" type="number" min="0" max="100" placeholder="e.g. 68"></div><div><label class="flab" for="asDate">Date</label><input class="input" id="asDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></div></div><button class="btn btn-lime btn-block" id="asAdd" style="margin-top:14px">${ic("i-spark", "sm")} Log assessment</button></div>
      <div class="card"><h3 style="font-size:17px;margin-bottom:12px">Latest vs target</h3><div class="chart">${SUBJECTS.map(
        (s) => {
          const latest = S.assessments.filter((a) => a.subj === s).sort((a, b) => b.ts - a.ts)[0];
          const p = latest ? latest.score : 0;
          const tg = (gradePts(S.targets[s] || "") / 12) * 100;
          return `<div class="chart-row"><span class="lab">${esc(s)}</span><div class="chart-track"><i style="width:${p}%;${latest && tg && p < tg ? "background:linear-gradient(90deg,#ff7a59,#ffb020)" : ""}"></i>${tg ? `<span class="tgt" style="left:${tg}%"></span>` : ""}</div><span class="val">${latest ? p + "%" : "—"}</span></div>`;
        }
      ).join("")}</div></div>
    </div>
  </div>
  <div class="card" style="margin-top:16px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap"><h3 style="font-size:17px">Assessment log</h3><button class="btn btn-ghost btn-sm" id="csvExport" style="margin-left:auto">${ic("i-download", "sm")} Export CSV</button></div>
  ${
    S.assessments.length
      ? `<div class="table-scroll"><table class="tbl" style="min-width:480px"><thead><tr><th>Date</th><th>Subject</th><th style="text-align:right">Score</th><th>vs target</th><th></th></tr></thead><tbody>${[
          ...S.assessments
        ]
          .sort((a, b) => b.ts - a.ts)
          .map((a) => {
            const tg = (gradePts(S.targets[a.subj] || "") / 12) * 100;
            const ok = !tg || a.score >= tg;
            return `<tr><td class="tiny muted">${esc(a.date)}</td><td><b style="color:var(--pine3)">${esc(a.subj)}</b></td><td style="text-align:right;font-family:var(--font-d);font-weight:800">${a.score}%</td><td><span class="chip ${ok ? "green" : "amber"}">${tg ? (ok ? "on track" : "below") : "no target"}</span></td><td style="text-align:right"><button class="btn btn-ghost btn-sm" data-del-as="${a.id}">${ic("i-x", "sm")}</button></td></tr>`;
          })
          .join("")}</tbody></table></div>`
      : `<p class="small muted">No assessments logged yet — add your first mock above.</p>`
  }</div>`;
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
