/* Cluster points calculator (/student/cluster.html). */
/* ---------- Cluster ---------- */
function renderClusterView() {
  const box = $("#clusterBox");
  if (!Object.keys(S.grades).length) {
    box.innerHTML = `<span class="eyebrow">KUCCPS weighted formula</span><h2 style="font-size:28px;margin:6px 0 16px">Cluster Points Calculator</h2><div class="empty">${ic("i-calc")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:6px">Enter your grades first</b><p class="small" style="margin-bottom:16px">The calculator uses your KCSE grades and the official formula w = √((r/48) × (t/84)) × 48.</p><button class="btn btn-lime" data-nav="quiz">Enter grades</button></div>`;
    return;
  }
  const rows = PF_CLUSTERS.map((c) => ({ n: c.n, ...slotCluster(c.slots, S.grades) })).sort(
    (a, b) => b.weighted - a.weighted
  );
  const top = rows[0];
  box.innerHTML = `<span class="eyebrow">Academics · 14 course clusters</span><h2 style="font-size:28px;margin:6px 0 4px">Cluster Points Calculator</h2><p class="muted small">w = √((r/48) × (t/84)) × 48 · best-7 aggregate ${computeCluster(S.grades).t}/84. Definitions are indicative — confirm on <a href="https://students.kuccps.ac.ke/programmes/search/" target="_blank" rel="noopener">kuccps.ac.ke</a>.</p>
  <div class="alert-green" style="margin:16px 0"><b>Strongest cluster: ${esc(top.n)}</b> at ${top.weighted.toFixed(1)} / 48. ${top.lift ? `Raise <b>${esc(top.lift.s)}</b> one grade for +${top.lift.delta.toFixed(1)} points.` : ""}</div>
  <div class="card" style="padding:8px 6px"><div class="table-scroll"><table class="tbl" style="min-width:620px"><thead><tr><th>#</th><th>Course cluster</th><th>Best subject combination</th><th style="text-align:right">Weighted</th><th style="width:140px">Strength</th></tr></thead><tbody>
  ${rows.map((r, i) => `<tr><td style="font-family:var(--font-d);font-weight:800;color:${i === 0 ? "var(--pine)" : "var(--muted)"}">${i + 1}</td><td><b style="color:var(--pine3)">${esc(r.n)}</b></td><td><div class="prog-chips" style="margin:0">${r.chosen.map((s) => `<span class="chip tiny">${esc(s)} ${esc(S.grades[s] || "—")}</span>`).join("")}</div></td><td style="text-align:right;font-family:var(--font-d);font-weight:800;font-size:16px">${r.weighted.toFixed(1)}</td><td><div class="bar"><i style="width:${(r.weighted / 48) * 100}%"></i></div></td></tr>`).join("")}
  </tbody></table></div></div>
  <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn btn-line btn-sm" data-nav="quiz">${ic("i-file", "sm")} Edit grades</button><a class="btn btn-ghost btn-sm" href="https://students.kuccps.ac.ke/programmes/search/" target="_blank" rel="noopener">KUCCPS programme search ${ic("i-ext", "sm")}</a></div>`;
}

/* ---------- page boot ---------- */
renderClusterView();
reveal();
