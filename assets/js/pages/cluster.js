/* Cluster points (/student/cluster.html).

   Cluster points only exist under 8-4-4 / KCSE. For a CBC learner the page
   explains that honestly and shows the thing that does matter to them — fit
   against the three senior pathways — instead of a table of zeros. */
function renderClusterView() {
  const box = $("#clusterBox");
  if (!box) return;
  const subs = stageSubjects();
  const entered = subs.filter((s) => S.grades[s]);

  if (!isKCSE()) {
    const fits = cbePathwayFit();
    const chosen = cbePathway();
    box.innerHTML = `
      <div class="page-head"><div><span class="eyebrow">CBC · senior pathways</span><h2 class="page-title">Pathway fit</h2>
        <p class="page-sub"><span class="chip lav">${esc(stage().label)}</span><span class="chip">${entered.length}/${subs.length} graded</span></p></div></div>
      <div class="alert-violet"><b>Cluster points are an 8-4-4 idea.</b> Under CBC you are placed in a senior pathway, then a school — there is no aggregate to calculate. This page shows how your entered levels line up with each pathway instead.</div>
      ${
        chosen
          ? `<div class="card" style="margin-top:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <span class="tile mint">${ic("i-compass", "lg")}</span>
        <div style="flex:1;min-width:200px"><b style="font-family:var(--font-d);display:block">You are following ${esc(chosen.label)}</b>
          <span class="tiny muted">${esc(chosen.full)} · ${esc(chosen.careers)}</span></div>
        <button class="btn btn-line btn-sm" data-nav="quiz">Change pathway</button></div>`
          : `<div class="card" style="margin-top:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <span class="tile lav">${ic("i-compass", "lg")}</span>
        <div style="flex:1;min-width:200px"><b style="font-family:var(--font-d);display:block">No pathway chosen yet</b>
          <span class="tiny muted">Pick one to line up your three electives.</span></div>
        <button class="btn btn-lime btn-sm" data-nav="quiz">Choose a pathway</button></div>`
      }
      <div class="grid g2" style="margin-top:16px;align-items:start">
        <section class="card">
          <div class="sec-head"><div><h3>How you fit each pathway</h3><p class="tiny muted">Share of that pathway's subjects graded ME (meeting) or better.</p></div></div>
          ${fits
            .map(
              (f, i) => `<div class="fit-row${i === 0 && f.has ? " best" : ""}">
              <div class="fit-top"><b>${esc(f.label)}</b><span class="chip ${f.pct >= 60 ? "green" : "amber"}">${f.has ? f.pct + "%" : "no grades"}</span></div>
              <div class="bar"><i style="width:${f.pct}%"></i></div>
              <p class="tiny muted" style="margin-top:6px">${esc(f.careers)}</p></div>`
            )
            .join("")}
        </section>
        <section class="card">
          <div class="sec-head"><div><h3>What placement looks like</h3><p class="tiny muted">From the 2026 senior-school circular.</p></div></div>
          <ul class="checklist">
            ${stageTimeline()
              .map(
                (x) =>
                  `<li class="on"><span class="ck">${ic("i-check", "sm")}</span><span><b>${esc(x.what)} · ${esc(x.when)}</b><small>${esc(x.note)}</small></span></li>`
              )
              .join("")}
          </ul>
          <p class="tiny muted" style="margin-top:12px">Eight senior-school choices: 3 C1, 2 C2, 2 C3 and 1 C4 day school, submitted through KEMIS with your KJSEA assessment number.</p>
          <button class="btn btn-line btn-sm" data-nav="institutions" style="margin-top:12px">Browse institutions ${ic("i-arr", "sm")}</button>
        </section>
      </div>`;
    return;
  }

  if (!entered.length) {
    box.innerHTML = `<span class="eyebrow">KUCCPS weighted formula</span><h2 class="page-title">Cluster Points Calculator</h2>
      <div class="empty">${ic("i-calc")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:6px">Enter your grades first</b>
      <p class="small" style="margin-bottom:16px">The calculator uses your KCSE grades and the official formula w = √((r/48) × (t/84)) × 48.</p>
      <button class="btn btn-lime" data-nav="quiz">Enter grades</button></div>`;
    return;
  }

  const rows = PF_CLUSTERS.map((c) => ({ n: c.n, ...slotCluster(c.slots, S.grades) })).sort(
    (a, b) => b.weighted - a.weighted
  );
  const top = rows[0];
  box.innerHTML = `
    <div class="page-head"><div><span class="eyebrow">Academics · ${PF_CLUSTERS.length} course clusters</span><h2 class="page-title">Cluster Points</h2>
      <p class="page-sub"><span class="chip">w = √((r/48) × (t/84)) × 48</span><span class="chip">best-7 ${computeCluster(S.grades).t}/84</span></p></div>
      <div class="page-acts"><button class="btn btn-line btn-sm" data-nav="quiz">${ic("i-file", "sm")} Edit grades</button></div></div>
    <div class="alert-green"><b>Strongest cluster: ${esc(top.n)}</b> at ${top.weighted.toFixed(1)} / 48. ${top.lift ? `Raise <b>${esc(top.lift.s)}</b> one grade for +${top.lift.delta.toFixed(1)} points.` : ""}</div>
    <div class="card" style="margin-top:16px;padding:8px 6px"><div class="table-scroll"><table class="tbl" style="min-width:620px">
      <thead><tr><th>#</th><th>Course cluster</th><th>Best combination</th><th style="text-align:right">Weighted</th><th style="width:140px">Strength</th></tr></thead>
      <tbody>${rows
        .map(
          (
            r,
            i
          ) => `<tr><td style="font-family:var(--font-d);font-weight:800;color:${i === 0 ? "var(--pine)" : "var(--muted)"}">${i + 1}</td>
          <td><b style="color:var(--pine3)">${esc(r.n)}</b></td>
          <td><div class="prog-chips" style="margin:0">${r.chosen.map((s) => `<span class="chip tiny">${esc(s)} ${esc(S.grades[s] || "—")}</span>`).join("")}</div></td>
          <td style="text-align:right;font-family:var(--font-d);font-weight:800;font-size:16px">${r.weighted.toFixed(1)}</td>
          <td><div class="bar"><i style="width:${(r.weighted / 48) * 100}%"></i></div></td></tr>`
        )
        .join("")}</tbody></table></div></div>
    <p class="tiny muted" style="margin-top:12px">Definitions are indicative — confirm on <a href="https://students.kuccps.ac.ke/programmes/search/" target="_blank" rel="noopener">kuccps.ac.ke</a>.</p>`;
}

/* ---------- page boot ---------- */
renderClusterView();
reveal();
