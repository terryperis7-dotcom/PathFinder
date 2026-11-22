/* Student overview (/student/dashboard.html).

   One layout, four stages. The numbers, the grading scale, the exam line and
   the next step all come from stages.js, so a Grade 8 learner never sees a
   KUCCPS cluster card and a Form 4 learner never sees "EE / ME / AE / BE". */
function renderDashboard() {
  const box = $("#dashBox");
  if (!box) return;
  const subs = stageSubjects();
  const has = subs.some((s) => S.grades[s]);
  const name = SESSION ? SESSION.name.split(" ")[0] : S.profile.name ? S.profile.name.split(" ")[0] : "there";

  if (!has) {
    box.innerHTML = emptyDashHTML(name);
    $("#dashSample").addEventListener("click", () => {
      const set = isCBC()
        ? ["ME", "ME", "ME", "AE", "AE", "EE"]
        : ["B+", "B", "B", "B+", "B", "B-", "A-", "B", "B-", "C+", "B+", "A-"];
      S.grades = {};
      subs.forEach((s, i) => {
        S.grades[s] = set[i % set.length];
      });
      save();
      renderDashboard();
      toast("Sample " + (isCBC() ? "levels" : "grades") + " loaded", "i-spark");
    });
    $("#dashStage").addEventListener("click", () => openStagePicker());
    return;
  }

  const rows = subs
    .filter((s) => S.grades[s])
    .map((s) => ({ s, v: gradeValue(S.grades[s]), pct: gradePctFor(S.grades[s]), g: S.grades[s] }));
  const avgV = rows.reduce((a, r) => a + r.v, 0) / rows.length;
  const avgPct = Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length);
  const strong = [...rows].sort((a, b) => b.v - a.v)[0];
  const weak = [...rows].sort((a, b) => a.v - b.v)[0];
  const best = S.result && S.result.paths ? S.result.paths[0] : null;
  const bestPath = best ? PF_PATHS.find((p) => p.id === best.id) : null;
  const { t } = computeCluster(S.grades);
  const trend = assessmentTrend();
  const check = stageReadiness();
  const mix = gradeMix(rows);
  const donePct = Math.round((rows.length / subs.length) * 100);

  box.innerHTML = `
    <div class="page-head">
      <div>
        <h2 class="page-title">Karibu, ${esc(name)}</h2>
        <div class="page-sub">
          <button class="chip chip-btn" id="dashStage">${ic("i-cap", "sm")} ${esc(stage().label)}</button>
          <span class="chip">${ic("i-pin", "sm")} ${esc(S.profile.county || (SESSION && SESSION.county) || "Kenya")}</span>
          <span class="chip ${isKCSE() ? "amber" : "lav"}">${ic("i-cal", "sm")} ${esc(examLine())}</span>
        </div>
      </div>
      <div class="page-acts">
        ${S.result && S.result.paths ? `<button class="btn btn-ghost btn-sm" data-nav="quiz">${ic("i-compass", "sm")} Retake check</button>` : `<button class="btn btn-lime btn-sm" data-nav="quiz">${ic("i-compass", "sm")} Career check</button>`}
        <button class="btn btn-line btn-sm" data-nav="tracker">${ic("i-spark", "sm")} Log a score</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="card kpi"><span class="kpi-lab">${isCBC() ? "Average level" : "Average grade"}</span>
        <div class="kpi-num">${isCBC() ? esc(cbcLevelFor(avgPct)) : esc(ptsToGrade(avgV))}</div>
        <span class="kpi-foot">${esc(avgFoot(avgV, avgPct))}</span></div>
      <div class="card kpi"><span class="kpi-lab">Strongest</span>
        <div class="kpi-num" style="font-size:22px">${esc(strong.s)}</div>
        <span class="kpi-foot good">${ic("i-arr", "sm")} ${esc(gradeLabel(strong.g))}</span></div>
      <div class="card kpi"><span class="kpi-lab">Needs work</span>
        <div class="kpi-num" style="font-size:22px;color:var(--terra-d)">${esc(weak.s)}</div>
        <span class="kpi-foot"><button class="link-mini" data-tutor-for="${esc(weak.s)}">Find a tutor</button></span></div>
      <div class="card kpi"><span class="kpi-lab">${isCBC() ? "Senior pathway" : "Top match"}</span>
        <div class="kpi-num" style="font-size:22px">${best ? best.match + "%" : "—"}</div>
        <span class="kpi-foot">${bestPath ? esc(bestPath.name) : `<button class="link-mini" data-nav="quiz">Take the check</button>`}</span></div>
    </div>

    <section class="card dash-prog">
      <div class="sec-head">
        <div><h3>Your progress</h3><p class="tiny muted">${isCBC() ? "Achievement levels you have entered, and how they add up." : "Average of logged assessments, and the mix behind your best seven."}</p></div>
        <button class="btn btn-ghost btn-sm" data-nav="tracker">${ic("i-chart", "sm")} Tracker</button>
      </div>
      <div class="prog-split">
        <div class="prog-chart">
          ${
            trend.points.length
              ? `<div class="trend-top"><span class="chip ${trend.delta >= 0 ? "green" : "amber"}">${ic(trend.delta >= 0 ? "i-arr" : "i-chart", "sm")} ${trend.delta >= 0 ? "+" : ""}${trend.delta} pts since your first log</span></div>
               ${pfLineChart(trend.points, { target: trend.target, max: 100, id: "dash-trend", series: "Your average", unit: "%", alt: "Your average assessment score over time", foot: trend.points.length < 2 ? "Log another assessment to draw the line" : "Across " + trend.subjects + " subjects" })}`
              : `<div class="empty compact">${ic("i-chart")}<b>No assessments logged yet</b><p class="small">Log a mock or end-term score and this line draws itself.</p><button class="btn btn-lime btn-sm" data-nav="tracker">Log your first score</button></div>`
          }
        </div>
        <aside class="prog-pie">
          <div class="pie-head"><b>${isCBC() ? "Level mix" : "Grade mix"}</b><span class="tiny muted">${esc(donePct)}% of your subjects entered</span></div>
          ${pfDonut(mix.segments, { centre: avgPct + "%", centreLabel: isCBC() ? "average" : "of top grade", unit: "%", alt: "Grade mix across your subjects" })}
          <div class="pie-foot"><button class="link-mini" data-nav="tracker">Add or edit scores</button></div>
        </aside>
      </div>
    </section>

    <div class="grid g2 dash-low">
      <section class="card">
        <div class="sec-head"><div><h3>${isCBC() ? "Levels by learning area" : "Scores vs targets"}</h3><p class="tiny muted">${isCBC() ? "Bars show how far each level sits on the 0–100 band scale." : "Purple is your grade, the red tick is the target you set."}</p></div></div>
        <div class="chart">
          ${rows
            .sort((a, b) => b.pct - a.pct)
            .map((r) => {
              const tg = isCBC() ? 0 : gradePts((S.targets || {})[r.s] || "");
              return `<div class="chart-row"><span class="lab">${esc(r.s)}</span>
                <div class="chart-track"><i style="width:${r.pct}%"></i>${tg ? `<span class="tgt" style="left:${(tg / 12) * 100}%"></span>` : ""}</div>
                <span class="val">${isCBC() ? esc(r.g) : r.v}</span></div>`;
            })
            .join("")}
        </div>
        <button class="btn btn-ghost btn-sm" data-nav="tracker" style="margin-top:14px">Set targets & log mocks ${ic("i-arr", "sm")}</button>
      </section>

      <section class="card">
        <div class="sec-head"><div><h3>What's next for you</h3><p class="tiny muted">${esc(stage().short)} · ${esc(stage().system === "cbc" ? "CBC" : "8-4-4")}</p></div></div>
        <ul class="checklist">
          ${check.checks
            .map(
              (c) =>
                `<li class="${c.done ? "on" : ""}"><span class="ck">${c.done ? ic("i-check", "sm") : ""}</span><span><b>${esc(c.label)}</b><small>${esc(c.detail)}</small></span></li>`
            )
            .join("")}
        </ul>
        <div class="timeline-mini">
          ${stageTimeline()
            .map(
              (x) =>
                `<div class="tl"><span class="tl-when">${esc(x.when)}</span><span class="tl-what"><b>${esc(x.what)}</b><small>${esc(x.note)}</small></span></div>`
            )
            .join("")}
        </div>
      </section>
    </div>

    <section class="quick">
      <h3 class="quick-h">Jump back in</h3>
      <div class="qa-grid">
        ${isKCSE() ? quickTile("i-calc", "lav", "Cluster points", "Best-7 aggregate: " + t + " / 84", "cluster", "Open") : quickTile("i-compass", "mint", "Senior pathways", "Compare STEM, Social Sciences and Arts", "quiz", "Explore")}
        ${quickTile("i-grid", "mint", "Institutions", S.shortlist.length + " shortlisted", "institutions", "View", S.shortlist.length ? "1" : "")}
        ${quickTile("i-coins", "peach", "Funding", "HEF bands, HELB and 12 scholarships", "funding", "Explore")}
        ${quickTile("i-users", "pink", "Tutors", "Verified, learner-safe chat", "tutors", "Find one")}
        ${quickTile("i-user", "lav", "Your profile", "Picture, stage and details", "profile", "Edit")}
      </div>
    </section>`;
}

function emptyDashHTML(name) {
  return `<div class="page-head"><div><h2 class="page-title">Karibu, ${esc(name)}</h2>
      <div class="page-sub"><button class="chip chip-btn" id="dashStage">${ic("i-cap", "sm")} ${esc(stage().label)}</button>
      <span class="chip">${esc(stage().exam || "No national exam yet")}</span></div></div></div>
    <div class="empty">
      ${ic("i-compass")}
      <b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:6px;font-size:17px">Nothing entered yet</b>
      <p class="small" style="max-width:440px;margin:0 auto 18px">${esc(stage().label)}: add your ${isCBC() ? "achievement levels" : "grades"} and take the six-question career check. Everything on this page fills in from there.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-lime" data-nav="quiz">Start the career check</button>
        <button class="btn btn-line" id="dashSample">Load a sample</button>
      </div>
    </div>`;
}
function examLine() {
  const s = stage();
  if (s.id === "junior") return "KJSEA · October";
  if (s.id === "primary") return "KPSEA · October";
  if (s.id === "senior") return "Grade 12 assessment";
  if (s.id === "post") return "Apply to KUCCPS / TVET";
  return "KCSE · November 2027";
}
function avgFoot(avgV, avgPct) {
  if (isCBC()) return avgPct + "% on the band scale";
  return avgV.toFixed(1) + " points of 12";
}
/* The pie beside the graph: a real mix of what the learner has entered. */
function gradeMix(rows) {
  const bands = isCBC()
    ? [
        { label: "EE · Exceeding", test: (v) => v === 4, colour: "#22c58b" },
        { label: "ME · Meeting", test: (v) => v === 3, colour: "#7c5cff" },
        { label: "AE · Approaching", test: (v) => v === 2, colour: "#ffb020" },
        { label: "BE · Below", test: (v) => v === 1, colour: "#f472b6" }
      ]
    : [
        { label: "A – B+", test: (v) => v >= 10, colour: "#22c58b" },
        { label: "B – B-", test: (v) => v >= 8, colour: "#7c5cff" },
        { label: "C+ – C-", test: (v) => v >= 5, colour: "#ffb020" },
        { label: "D+ and below", test: (v) => v < 5, colour: "#f472b6" }
      ];
  return {
    segments: bands
      .map((b) => ({ label: b.label, value: rows.filter((r) => b.test(r.v)).length, colour: b.colour }))
      .filter((s) => s.value > 0)
  };
}
function quickTile(icon, tone, title, sub, nav, cta, extra) {
  return `<div class="qa"><span class="tile ${tone}">${ic(icon, "lg")}</span>
    <div class="qa-txt"><b>${esc(title)}</b><small>${esc(sub)}</small></div>
    <button class="btn btn-line btn-sm" data-nav="${nav}"${extra === "1" ? ' data-short="1"' : ""}>${esc(cta)}</button></div>`;
}

/* A fast stage switch from the overview: the learner should never have to go
   hunting through a settings page to say where they are. */
function openAvatarPickerSafe() {
  if (typeof openAvatarPicker === "function") openAvatarPicker();
}
function openStagePicker() {
  openModal(`<div class="step-head"><div><h3 style="font-size:18px">Which stage are you in?</h3>
      <p class="tiny muted">This changes the subjects, the grading scale and the advice across the whole app.</p></div>
      <button class="modal-x" data-close>${ic("i-x")}</button></div>
    ${stagePickerHTML()}
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-lime" id="stgSave" style="margin-left:auto">Use this stage</button></div>`);
  let pick = stageId();
  $$(".stg-opt").forEach((b) =>
    b.addEventListener("click", () => {
      pick = b.dataset.stage;
      $$(".stg-opt").forEach((x) => x.classList.toggle("on", x === b));
    })
  );
  $("#stgSave").addEventListener("click", () => {
    S.profile.stage = pick;
    save();
    closeModal();
    renderDashboard();
    toast("Stage updated to " + stage().label, "i-check");
  });
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
