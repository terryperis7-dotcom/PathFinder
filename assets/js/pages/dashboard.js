/* Student dashboard (/student/dashboard.html). */
/* ---------- Student dashboard ---------- */
function renderDashboard() {
  const box = $("#dashBox");
  const has = Object.keys(S.grades).length > 0;
  const name = SESSION ? SESSION.name.split(" ")[0] : S.profile.name ? S.profile.name.split(" ")[0] : "there";
  if (!has) {
    box.innerHTML = `<h2 style="font-size:28px;margin-bottom:6px">Karibu, ${esc(name)} 👋</h2><p class="muted small" style="margin-bottom:20px">Let's build your plan. Start with your grades and the 6-question career check.</p><div class="empty">${ic("i-compass")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:6px;font-size:17px">No grades yet</b><p class="small" style="max-width:420px;margin:0 auto 18px">Enter your KCSE grades (real or predicted) and take the career check to unlock your overview, cluster points and matches.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn btn-lime" data-nav="quiz">Start the career check</button><button class="btn btn-line" id="dashSample">Load sample grades</button></div></div>`;
    $("#dashSample").addEventListener("click", () => {
      S.grades = {
        English: "B+",
        Kiswahili: "B",
        Mathematics: "B",
        Biology: "B+",
        Physics: "B",
        Chemistry: "B-",
        Business: "A-",
        Geography: "B",
        History: "B-",
        Agriculture: "C+",
        "Computer Studies": "B+",
        CRE: "A-"
      };
      save();
      renderDashboard();
      toast("Sample grades loaded", "i-spark");
    });
    return;
  }
  const pts = SUBJECTS.map((s) => ({ s, p: gradePts(S.grades[s] || "") })).filter((x) => x.p > 0);
  const avg = pts.reduce((a, x) => a + x.p, 0) / pts.length;
  const strong = [...pts].sort((a, b) => b.p - a.p)[0],
    weak = [...pts].sort((a, b) => a.p - b.p)[0];
  const best = S.result && S.result.paths ? S.result.paths[0] : null;
  const bestPath = best ? PF_PATHS.find((p) => p.id === best.id) : null;
  const { t } = computeCluster(S.grades);
  const trend = assessmentTrend();
  const quizDone = S.result && S.result.paths;
  box.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:20px">
      <div style="flex:1;min-width:200px"><h2 style="font-size:28px">Karibu, ${esc(name)}</h2><p class="muted small">${esc(S.profile.stage || "KCSE Form 3–4")} · ${esc(S.profile.county || (SESSION && SESSION.county) || "Kenya")}</p></div>
      <span class="chip amber">${ic("i-cal", "sm")} KUCCPS placement ~April 2026</span>
      ${quizDone ? "" : `<button class="btn btn-lime btn-sm" data-nav="quiz">Take the career check</button>`}
    </div>
    <div class="grid g4" style="margin-bottom:20px">
      <div class="card" style="padding:20px"><div class="kpi-num">${ptsToGrade(avg)}</div><div class="kpi-lab" style="margin-top:6px">Average · ${avg.toFixed(1)} pts</div></div>
      <div class="card" style="padding:20px"><div class="kpi-num" style="font-size:24px">${esc(strong.s)}</div><div class="kpi-lab" style="margin-top:6px">Strongest</div></div>
      <div class="card" style="padding:20px"><div class="kpi-num" style="font-size:24px;color:var(--terra-d)">${esc(weak.s)}</div><div class="kpi-lab" style="margin-top:6px">Needs work</div></div>
      <div class="card" style="padding:20px"><div class="kpi-num">${best ? best.match + "%" : "—"}</div><div class="kpi-lab" style="margin-top:6px">${bestPath ? esc(bestPath.name) : "Top match"}</div></div>
    </div>
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:6px">
        <div style="flex:1;min-width:180px"><h3 style="font-size:17px">Progress over time</h3>
          <p class="tiny muted">Average of your logged assessments, oldest to newest.</p></div>
        ${trend.points.length ? `<span class="chip ${trend.delta >= 0 ? "green" : "amber"}">${ic(trend.delta >= 0 ? "i-arr" : "i-chart", "sm")} ${trend.delta >= 0 ? "+" : ""}${trend.delta} pts since your first log</span>` : `<span class="chip">${ic("i-cal", "sm")} No logs yet</span>`}
        <button class="btn btn-ghost btn-sm" data-nav="tracker">${ic("i-spark", "sm")} Log a score</button>
      </div>
      ${
        trend.points.length
          ? pfLineChart(trend.points, {
              target: trend.target,
              max: 100,
              id: "dash-trend",
              series: "Your average",
              unit: "%",
              alt: "Your average assessment score over time",
              foot:
                trend.points.length < 2
                  ? "Log another assessment to draw the line"
                  : "Across " + trend.subjects + " subjects"
            })
          : `<div class="empty" style="padding:26px 18px">${ic("i-chart")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:4px">No assessments logged</b><p class="small" style="max-width:380px;margin:0 auto 14px">This graph draws itself from the mock and end-term scores you log — we would rather show nothing than a made-up line.</p><button class="btn btn-lime btn-sm" data-nav="tracker">Log your first score</button></div>`
      }
    </div>
    <div class="grid g2" style="align-items:start">
      <div class="card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:16px"><h3 style="font-size:17px">Scores vs targets</h3><span class="chip" style="margin-left:auto"><span style="width:10px;height:3px;background:var(--terra);display:inline-block;border-radius:2px"></span> target</span></div>
        <div class="chart">${SUBJECTS.map((s) => {
          const p = gradePts(S.grades[s] || "");
          const tg = gradePts(S.targets[s] || "");
          return `<div class="chart-row"><span class="lab">${esc(s)}</span><div class="chart-track"><i style="width:${(p / 12) * 100}%"></i>${tg ? `<span class="tgt" style="left:${(tg / 12) * 100}%"></span>` : ""}</div><span class="val">${p}</span></div>`;
        }).join("")}</div>
        <button class="btn btn-ghost btn-sm" data-nav="tracker" style="margin-top:16px">Set targets & log mocks ${ic("i-arr", "sm")}</button></div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card" style="display:flex;gap:14px;align-items:center"><span class="tile lav">${ic("i-calc", "lg")}</span><div style="flex:1;min-width:0"><b style="font-family:var(--font-d);display:block">Best-7 aggregate: ${t} / 84</b><span class="tiny muted">Weighted points across 14 clusters.</span></div><button class="btn btn-line btn-sm" data-nav="cluster">Open</button></div>
        <div class="card" style="display:flex;gap:14px;align-items:center"><span class="tile mint">${ic("i-star", "lg")}</span><div style="flex:1;min-width:0"><b style="font-family:var(--font-d);display:block">${S.shortlist.length} shortlisted</b><span class="tiny muted">Institutions you're weighing up.</span></div><button class="btn btn-line btn-sm" data-nav="institutions" data-short="1">View</button></div>
        <div class="card" style="display:flex;gap:14px;align-items:center"><span class="tile peach">${ic("i-coins", "lg")}</span><div style="flex:1;min-width:0"><b style="font-family:var(--font-d);display:block">Funding ready</b><span class="tiny muted">HEF bands, HELB & 12 scholarships.</span></div><button class="btn btn-line btn-sm" data-nav="funding">Explore</button></div>
        <div class="card" style="display:flex;gap:14px;align-items:center"><span class="tile pink">${ic("i-users", "lg")}</span><div style="flex:1;min-width:0"><b style="font-family:var(--font-d);display:block">Need a hand with ${esc(weak.s)}?</b><span class="tiny muted">Verified tutors · learner-safe chat.</span></div><button class="btn btn-line btn-sm" data-tutor-for="${esc(weak.s)}">Find one</button></div>
      </div>
    </div>`;
}

/* Real trend data: average score per logged date, oldest first, plus the
   average target the learner set for those same subjects. Returns zeros when
   nothing has been logged so the caller can show an empty state. */
function assessmentTrend() {
  const rows = (S.assessments || []).filter((a) => a && isFinite(a.score));
  if (!rows.length) return { points: [], delta: 0, target: 0, subjects: 0 };
  const byDate = {};
  rows.forEach((a) => {
    const d = a.date || new Date(a.ts || Date.now()).toISOString().slice(0, 10);
    (byDate[d] = byDate[d] || []).push(a);
  });
  const dates = Object.keys(byDate).sort();
  const points = dates.map((d) => {
    const list = byDate[d];
    const avg = list.reduce((s, a) => s + a.score, 0) / list.length;
    const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      label: +d.slice(8, 10) + " " + M[+d.slice(5, 7) - 1],
      value: +avg.toFixed(1),
      note: list.length + " logged"
    };
  });
  const first = points[0].value,
    last = points[points.length - 1].value;
  const tgt = rows.map((a) => (gradePts((S.targets || {})[a.subj] || "") / 12) * 100).filter((v) => v > 0);
  const target = tgt.length ? tgt.reduce((a, b) => a + b, 0) / tgt.length : 0;
  return {
    points,
    delta: Math.round(last - first),
    target: +target.toFixed(1),
    subjects: new Set(rows.map((a) => a.subj)).size
  };
}

/* ---------- page boot ---------- */
renderDashboard();
reveal();
