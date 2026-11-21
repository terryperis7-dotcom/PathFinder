/* KUCCPS weighted cluster points:  w = sqrt((r/48)*(t/84))*48  */
/* ---------- Cluster engine ---------- */
function computeCluster(grades) {
  const pts = (s) => gradePts(grades[s] || "");
  const rest = SUBJECTS.filter((s) => !["English", "Kiswahili", "Mathematics"].includes(s)).sort(
    (a, b) => pts(b) - pts(a)
  );
  const t = pts("English") + pts("Kiswahili") + pts("Mathematics") + rest.slice(0, 4).reduce((a, s) => a + pts(s), 0);
  return { t, weightedOf: (r) => Math.sqrt((r / 48) * (t / 84)) * 48 };
}
function slotCluster(slots, grades) {
  const { t, weightedOf } = computeCluster(grades);
  const used = new Set();
  const chosen = [];
  for (const slot of slots) {
    let best = null;
    for (const s of slot) {
      if (used.has(s)) continue;
      if (!best || gradePts(grades[s] || "") > gradePts(grades[best] || "")) best = s;
    }
    if (best) {
      used.add(best);
      chosen.push(best);
    } else chosen.push(slot[0]);
  }
  const r = chosen.reduce((a, s) => a + gradePts(grades[s] || ""), 0);
  const weighted = weightedOf(r);
  let lift = null;
  /* "Biggest single lift": raise each cluster subject by one grade and recompute
     BOTH r and the best-7 aggregate t, so the quoted gain is the real one. */
  for (const s of chosen) {
    const g = grades[s] || "";
    const idx = GRADES.findIndex((x) => x[0] === g);
    if (idx <= 0) continue;
    const up = GRADES[idx - 1][0];
    const trial = Object.assign({}, grades);
    trial[s] = up;
    const t2 = computeCluster(trial).t;
    const d = Math.sqrt(((r + 1) / 48) * (t2 / 84)) * 48 - weighted;
    if (!lift || d > lift.delta) lift = { s, from: g, to: up, delta: d };
  }
  const ok = chosen.filter((s) => gradePts(grades[s] || "") >= 6).length;
  return { chosen, r, t, weighted, ok, lift };
}
