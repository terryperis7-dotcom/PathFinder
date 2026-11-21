/* Onboarding: KCSE grades, then the 6-question RIASEC quiz, then ranked pathways. */
/* ---------- Quiz ---------- */
function renderQuiz() {
  const total = PF_QUESTIONS.length + 1,
    step = S.qStep,
    segs = total + 1;
  $("#quizProg").innerHTML = Array.from({ length: segs }, (_, i) => `<i class="${i <= step ? "done" : ""}"></i>`).join(
    ""
  );
  const box = $("#quizBox");
  if (step === segs - 1) {
    renderResult(box);
    return;
  }
  if (step === 0) {
    box.innerHTML = `<div class="card"><span class="eyebrow">Step 1 of ${total} · Your KCSE grades</span><h3 style="font-size:21px;margin:8px 0 4px">Enter your subject grades</h3><p class="small muted" style="margin-bottom:16px">Real or predicted — this drives your cluster points and feasibility.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px"><button class="btn btn-ghost btn-sm" id="demoFill">${ic("i-spark", "sm")} Sample (B average)</button><button class="btn btn-ghost btn-sm" id="clearGrades">Clear</button></div><div id="gradeGrid" style="display:flex;flex-direction:column;gap:8px">${SUBJECTS.map(gradeRow).join("")}</div><div style="display:flex;align-items:center;gap:14px;margin-top:18px;flex-wrap:wrap"><div class="chip lime" id="gradeTotal">Best-7: 0 / 84</div><button class="btn btn-lime" id="gradesNext" style="margin-left:auto">Continue ${ic("i-arr", "sm")}</button></div></div>`;
    $("#demoFill").addEventListener("click", () => {
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
      renderQuiz();
      toast("Sample grades loaded", "i-spark");
    });
    $("#clearGrades").addEventListener("click", () => {
      S.grades = {};
      save();
      renderQuiz();
    });
    $("#gradeGrid").addEventListener("change", (e) => {
      const s = e.target.dataset.subj;
      if (!s) return;
      if (e.target.value) S.grades[s] = e.target.value;
      else delete S.grades[s];
      save();
      updateGradeMeta();
    });
    $("#gradesNext").addEventListener("click", () => {
      const m = SUBJECTS.filter((s) => !S.grades[s]);
      if (m.length) {
        toast("Add a grade for: " + m.slice(0, 3).join(", ") + (m.length > 3 ? " …" : ""), "i-info");
        return;
      }
      S.qStep = 1;
      save();
      renderQuiz();
    });
    updateGradeMeta();
    return;
  }
  const qi = step - 1,
    Q = PF_QUESTIONS[qi];
  box.innerHTML = `<div class="card"><span class="eyebrow">Question ${qi + 1} of ${PF_QUESTIONS.length}</span><h3 style="font-size:21px;margin-top:10px">${esc(Q.q)}</h3><div class="q-opts">${Q.o.map((o, i) => `<button class="quiz-opt${S.answers[qi] === i ? " sel" : ""}" data-oi="${i}"><span class="k">${"ABCD"[i]}</span><span>${esc(o.t)}</span></button>`).join("")}</div><div style="display:flex;gap:10px;margin-top:20px"><button class="btn btn-ghost" id="qBack">${ic("i-back", "sm")} Back</button><button class="btn btn-line" id="qNext" ${S.answers[qi] === undefined ? "disabled" : ""} style="margin-left:auto">Next ${ic("i-arr", "sm")}</button></div></div>`;
  $$(".quiz-opt", box).forEach((btn) =>
    btn.addEventListener("click", () => {
      S.answers[qi] = +btn.dataset.oi;
      save();
      $$(".quiz-opt", box).forEach((b) => b.classList.toggle("sel", b === btn));
      $("#qNext").removeAttribute("disabled");
      setTimeout(() => {
        if (S.answers[qi] === +btn.dataset.oi) {
          S.qStep++;
          save();
          renderQuiz();
        }
      }, 240);
    })
  );
  $("#qBack").addEventListener("click", () => {
    S.qStep--;
    save();
    renderQuiz();
  });
  $("#qNext").addEventListener("click", () => {
    S.qStep++;
    save();
    renderQuiz();
  });
}
function gradeRow(s) {
  return `<div class="g-row"><div><b>${esc(s)}</b><small>${["English", "Kiswahili", "Mathematics"].includes(s) ? "Core" : "Elective"}</small></div><span class="g-pts" data-pts="${esc(s)}">0</span><select class="input" data-subj="${esc(s)}"><option value="">—</option>${GRADES.map((g) => `<option value="${g[0]}"${S.grades[s] === g[0] ? " selected" : ""}>${g[0]} · ${g[1]}</option>`).join("")}</select></div>`;
}
function updateGradeMeta() {
  SUBJECTS.forEach((s) => {
    const el = $(`[data-pts="${s}"]`);
    if (el) el.textContent = gradePts(S.grades[s] || "");
  });
  const { t } = computeCluster(S.grades);
  const gt = $("#gradeTotal");
  if (gt) gt.textContent = `Best-7: ${t} / 84`;
}
function renderResult(box) {
  box.innerHTML = `<div class="computing"><div class="spin"></div><b style="font-family:var(--font-d);color:var(--pine3)">Scoring your pathways…</b><span class="small">55% interest · 45% feasibility</span></div>`;
  setTimeout(() => {
    const res = scorePaths(S.grades, S.answers);
    S.result = { paths: res.map((r) => ({ id: r.id, match: r.match, weighted: +r.weighted.toFixed(1) })) };
    save();
    if (typeof addNote === "function") {
      const top = PF_PATHS.find((p) => p.id === S.result.paths[0].id);
      addNote({
        to: "student",
        kind: "result",
        from: "Career check",
        title: "Your matches are ready",
        body:
          (top ? top.name + " is your strongest pathway" : "Your pathway matches are ready") +
          " at " +
          S.result.paths[0].match +
          "% match. See the full breakdown.",
        link: "dashboard"
      });
    }
    paintResults(box, res);
  }, 900);
}
function paintResults(box, res) {
  const { t } = computeCluster(S.grades);
  box.innerHTML = `<div class="alert-violet" style="margin-bottom:18px"><b>Best-7 aggregate: ${t} / 84.</b> Guidance only — official points come from the <a href="https://students.kuccps.ac.ke" target="_blank" rel="noopener" style="text-decoration:underline">KUCCPS portal</a>.</div>
  ${res
    .map((p, i) => {
      const w = +p.c.weighted.toFixed(1);
      return `<div class="result-card${i === 0 ? " top" : ""}"><div style="display:flex;gap:14px;align-items:flex-start"><span class="rank-badge">${i + 1}</span><span class="tile ${p.tile}">${ic(p.icon)}</span><div style="flex:1;min-width:0"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><h3 style="font-size:18px">${esc(p.name)}</h3>${i === 0 ? '<span class="chip pine">Best match</span>' : ""}</div><p class="small muted" style="margin-top:4px">${esc(p.why)}</p></div><div style="text-align:right"><div class="match-big">${p.match}%</div><div class="tiny muted">match</div></div></div><div class="bar" style="margin-top:14px"><i style="width:${p.match}%"></i></div><div class="prog-chips">${p.roles.map((r) => `<span class="chip">${esc(r)}</span>`).join("")}</div><table class="clust-table"><thead><tr><th>Cluster subject</th><th>Grade</th><th style="text-align:right">Pts</th></tr></thead><tbody>${p.c.chosen
        .map((s) => {
          const g = S.grades[s] || "—";
          return `<tr><td>${esc(s)}</td><td><span class="chip ${gradePts(g) >= 6 ? "green" : "red"}" style="font-size:11.5px">${esc(g)}</span></td><td style="text-align:right;font-weight:700">${gradePts(g)}</td></tr>`;
        })
        .join(
          ""
        )}</tbody></table><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:14px"><div><b style="font-family:var(--font-d);font-size:26px">${w}</b><span class="tiny muted"> / 48 weighted</span></div><span class="chip">Target ~${p.target}</span></div>${p.c.lift ? `<div class="alert-green" style="margin-top:12px"><b>Raise ${esc(p.c.lift.s)} one grade</b> → +${p.c.lift.delta.toFixed(1)} weighted points. Your biggest single lift.</div>` : ""}<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="btn btn-line btn-sm" data-inst-field="${p.id}">${ic("i-grid", "sm")} Matching institutions</button>${i === 0 ? `<button class="btn btn-dark btn-sm" data-tutor-for="${esc(p.c.chosen.filter((s) => gradePts(S.grades[s] || "") < 6)[0] || "Mathematics")}">${ic("i-users", "sm")} Tutor for weakest subject</button>` : ""}</div></div>`;
    })
    .join("")}
  <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-ghost" id="retake">${ic("i-back", "sm")} Retake</button><button class="btn btn-ghost" id="editGrades">${ic("i-file", "sm")} Edit grades</button><button class="btn btn-lime" data-nav="dashboard" style="margin-left:auto">Go to overview ${ic("i-arr", "sm")}</button></div>`;
  $$("#quizBox [data-inst-field]").forEach((b) =>
    b.addEventListener("click", () => {
      const map = {
        health: "Health",
        eng: "Engineering",
        biz: "Business",
        agri: "Agriculture",
        creative: "Creative",
        edu: ""
      };
      const f = map[b.dataset.instField] || "";
      location.href = urlFor("institutions", f ? { field: f } : null);
    })
  );
  $("#retake").addEventListener("click", () => {
    S.answers = [];
    S.qStep = 1;
    save();
    renderQuiz();
  });
  $("#editGrades").addEventListener("click", () => {
    S.qStep = 0;
    save();
    renderQuiz();
  });
}

/* ---------- page boot ---------- */
/* onboarding.html pins the flow to the grades step; quiz.html resumes where you are. */
if (document.body.dataset.step !== undefined && document.body.dataset.step !== "") {
  S.qStep = +document.body.dataset.step;
  save();
}
renderQuiz();
reveal();
