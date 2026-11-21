/* Onboarding flow — three real steps, all stage aware:
     step 0  your stage, your learning areas, your grades
     step 1–6  the six interest questions
     step 7  the reveal, then the ranked breakdown

   Nothing here assumes KCSE. A Grade 8 learner enters EE/ME/AE/BE levels, a
   Form 3 learner enters A–E grades, and the copy, the maths and the advice
   change with the stage instead of showing them zeros they cannot fix. */

/* ---------- step 0: the person ---------- */
function stagePickerHTML() {
  return `<div class="stg-pick" role="radiogroup" aria-label="Your stage">
    ${PF_STAGES.map(
      (
        s
      ) => `<button type="button" class="stg-opt${stageId() === s.id ? " on" : ""}" data-stage="${s.id}" role="radio" aria-checked="${stageId() === s.id}">
        <b>${esc(s.label)}</b><span>${esc(s.exam || "No national exam")}</span>
      </button>`
    ).join("")}
  </div>`;
}
function pathwayPickerHTML() {
  const p = cbePathway();
  return `<div class="cbe-box">
    <label class="flab">Your senior pathway</label>
    <div class="cbe-paths">
      ${CBE_PATHWAYS.map(
        (x) => `<button type="button" class="cbe-path${p && p.id === x.id ? " on" : ""}" data-pathway="${x.id}">
          <b>${esc(x.label)}</b><span>${esc(x.blurb)}</span>
        </button>`
      ).join("")}
    </div>
    <label class="flab" style="margin-top:12px">Three electives</label>
    <div class="cbe-elec">${(p ? p.electives : [])
      .map(
        (e) =>
          `<button type="button" class="chip-pick${(S.profile.electives || []).includes(e) ? " on" : ""}" data-elective="${esc(e)}">${esc(e)}</button>`
      )
      .join("")}</div>
    <p class="tiny muted" style="margin-top:8px">Four core learning areas are always included: ${CBE_CORE.map(esc).join(" · ")}.</p>
  </div>`;
}
function gradeStepHTML() {
  const s = stage(),
    subs = stageSubjects();
  const filled = subs.filter((x) => S.grades[x]).length;
  return `<div class="card">
    <span class="eyebrow">Step 1 of ${PF_QUESTIONS.length + 1} · ${esc(s.label)}</span>
    <h3 class="step-title">Where are you now?</h3>
    <p class="small muted">Everything below adapts to your stage — the subjects, the grading scale and the advice. Change it any time.</p>
    ${stagePickerHTML()}
    <div class="stage-note">${ic("i-info", "sm")}<span><b>${esc(s.exam ? s.exam : "No national exam yet")}</b> — ${esc(s.examNote || "")}</span></div>
    ${s.id === "senior" ? pathwayPickerHTML() : ""}
    <div class="step-head">
      <div>
        <h4>${isCBC() ? "Your achievement levels" : "Your subject grades"}</h4>
        <p class="tiny muted">${isCBC() ? "Pick the level your teacher reports — EE, ME, AE or BE. Real or predicted is fine." : "Real or predicted grades. These drive your cluster points and feasibility."}</p>
      </div>
      <span class="chip ${filled === subs.length ? "lime" : ""}" id="gradeTotal">${filled} of ${subs.length} filled</span>
    </div>
    <div class="grade-tools">
      <button class="btn btn-ghost btn-sm" id="demoFill">${ic("i-spark", "sm")} ${isCBC() ? "Sample levels" : "Sample (B average)"}</button>
      <button class="btn btn-ghost btn-sm" id="clearGrades">Clear</button>
      <span class="tiny muted" id="scaleNote">${esc(gradeScaleNote())}</span>
    </div>
    <div id="gradeGrid" class="g-grid">${subs.map(gradeRow).join("")}</div>
    <div class="step-foot">
      <span class="tiny muted">${isCBC() ? "Levels never become KCSE points." : "Best-7 aggregate, 84 possible."}</span>
      <button class="btn btn-lime" id="gradesNext">Continue ${ic("i-arr", "sm")}</button>
    </div>
  </div>`;
}
function gradeRow(subject) {
  const isCore = CBE_CORE.includes(subject) || ["English", "Kiswahili", "Mathematics"].includes(subject);
  const opts = isCBC()
    ? CBC_LEVELS.map((l) => [l.code, l.code + " · " + l.label])
    : GRADES.map((g) => [g[0], g[0] + " · " + g[1] + " pts"]);
  return `<div class="g-row"><div><b>${esc(subject)}</b><small>${isCore ? "Core" : "Elective"}</small></div>
    <span class="g-pts" data-pts="${esc(subject)}">${S.grades[subject] ? (isCBC() ? gradeValue(S.grades[subject]) + "/4" : gradePts(S.grades[subject])) : "—"}</span>
    <select class="input" data-subj="${esc(subject)}" aria-label="${esc(subject)} grade">
      <option value="">—</option>
      ${opts.map((o) => `<option value="${o[0]}"${S.grades[subject] === o[0] ? " selected" : ""}>${esc(o[1])}</option>`).join("")}
    </select></div>`;
}
function updateGradeMeta() {
  const subs = stageSubjects();
  subs.forEach((s) => {
    const el = document.querySelector(`[data-pts="${s}"]`);
    if (el)
      el.textContent = S.grades[s] ? (isCBC() ? gradeValue(S.grades[s]) + "/4" : String(gradePts(S.grades[s]))) : "—";
  });
  const el = document.querySelector("#gradeTotal");
  const filled = subs.filter((x) => S.grades[x]).length;
  if (el) {
    el.textContent = `${filled} of ${subs.length} filled`;
    el.className = "chip" + (filled === subs.length ? " lime" : filled >= 6 ? " lav" : "");
  }
}
const DEMO_LEVELS = { EE: ["EE", "EE", "ME", "ME", "ME", "AE"], ME: ["ME", "ME", "ME", "AE", "AE", "AE"] };

function renderQuiz() {
  const total = PF_QUESTIONS.length + 1,
    step = S.qStep,
    segs = total + 1;
  const prog = document.querySelector("#quizProg");
  if (prog)
    prog.innerHTML = Array.from({ length: segs }, (_, i) => `<i class="${i <= step ? "done" : ""}"></i>`).join("");
  const box = document.querySelector("#quizBox");
  if (!box) return;

  if (step === segs - 1) {
    renderResult(box);
    return;
  }
  if (step === 0) {
    box.innerHTML = gradeStepHTML();
    document.querySelectorAll("[data-stage]").forEach((b) =>
      b.addEventListener("click", () => {
        S.profile.stage = b.dataset.stage;
        S.qStep = 0;
        save();
        renderQuiz();
      })
    );
    document.querySelectorAll("[data-pathway]").forEach((b) =>
      b.addEventListener("click", () => {
        S.profile.pathway = b.dataset.pathway;
        const p = cbePathway();
        S.profile.electives = p ? p.electives.slice(0, 3) : [];
        save();
        renderQuiz();
      })
    );
    document.querySelectorAll("[data-elective]").forEach((b) =>
      b.addEventListener("click", () => {
        const e = b.dataset.elective;
        const cur = (S.profile.electives || []).slice();
        const i = cur.indexOf(e);
        if (i >= 0) cur.splice(i, 1);
        else if (cur.length < 3) cur.push(e);
        else {
          toast("Three electives — swap one out first", "i-info");
          return;
        }
        S.profile.electives = cur;
        save();
        renderQuiz();
      })
    );
    document.querySelector("#demoFill").addEventListener("click", () => {
      const keys = stageSubjects();
      S.grades = {};
      if (isCBC()) {
        const set = DEMO_LEVELS.ME;
        keys.forEach((s, i) => {
          S.grades[s] = set[i % set.length];
        });
      } else {
        const set = ["B+", "B", "B", "B+", "B", "B-", "A-", "B", "B-", "C+", "B+", "A-"];
        keys.forEach((s, i) => {
          S.grades[s] = set[i % set.length];
        });
      }
      save();
      renderQuiz();
      toast("Sample " + (isCBC() ? "levels" : "grades") + " loaded", "i-spark");
    });
    document.querySelector("#clearGrades").addEventListener("click", () => {
      S.grades = {};
      save();
      renderQuiz();
    });
    document.querySelector("#gradeGrid").addEventListener("change", (e) => {
      const s = e.target.dataset.subj;
      if (!s) return;
      if (e.target.value) S.grades[s] = e.target.value;
      else delete S.grades[s];
      save();
      updateGradeMeta();
    });
    document.querySelector("#gradesNext").addEventListener("click", () => {
      const subs = stageSubjects();
      const m = subs.filter((s) => !S.grades[s]);
      const need = isCBC() ? 5 : 7;
      if (m.length && subs.length - m.length < need) {
        toast("Add a few more: " + m.slice(0, 3).join(", ") + (m.length > 3 ? " …" : ""), "i-info");
        return;
      }
      if (stageId() === "senior" && !cbePathway()) {
        toast("Pick your senior pathway first", "i-info");
        return;
      }
      S.qStep = 1;
      save();
      renderQuiz();
    });
    updateGradeMeta();
    reveal();
    return;
  }

  /* ---------- the six interest questions ---------- */
  const qi = step - 1,
    Q = PF_QUESTIONS[qi];
  box.innerHTML = `<div class="card">
    <div class="step-head">
      <span class="eyebrow">Question ${qi + 1} of ${PF_QUESTIONS.length}</span>
      <span class="tiny muted">${esc(stage().short)}</span>
    </div>
    <h3 class="step-title" style="font-size:21px">${esc(Q.q)}</h3>
    <div class="q-opts">${Q.o
      .map(
        (o, i) =>
          `<button class="quiz-opt${S.answers[qi] === i ? " sel" : ""}" data-oi="${i}"><span class="k">${"ABCD"[i]}</span><span>${esc(o.t)}</span></button>`
      )
      .join("")}</div>
    <div class="step-foot">
      <button class="btn btn-ghost" id="qBack">${ic("i-back", "sm")} Back</button>
      <button class="btn btn-line" id="qNext" ${S.answers[qi] === undefined ? "disabled" : ""} style="margin-left:auto">Next ${ic("i-arr", "sm")}</button>
    </div>
  </div>`;
  document.querySelectorAll(".quiz-opt", box).forEach((btn) =>
    btn.addEventListener("click", () => {
      S.answers[qi] = +btn.dataset.oi;
      save();
      document.querySelectorAll(".quiz-opt", box).forEach((b) => b.classList.toggle("sel", b === btn));
      document.querySelector("#qNext").removeAttribute("disabled");
      setTimeout(() => {
        if (S.answers[qi] === +btn.dataset.oi) {
          S.qStep++;
          save();
          renderQuiz();
        }
      }, 240);
    })
  );
  document.querySelector("#qBack").addEventListener("click", () => {
    S.qStep = Math.max(0, S.qStep - 1);
    save();
    renderQuiz();
  });
  document.querySelector("#qNext").addEventListener("click", () => {
    S.qStep++;
    save();
    renderQuiz();
  });
  reveal();
}

/* ---------- step 7: score, then celebrate ---------- */
function renderResult(box) {
  box.innerHTML = `<div class="computing"><div class="spin"></div><b style="font-family:var(--font-d);color:var(--pine3)">Reading your answers…</b>
    <span class="small">${isCBC() ? "Interest fit · achievement levels" : "55% interest · 45% feasibility"}</span></div>`;
  setTimeout(() => {
    const res = scorePathsForStage(S.answers);
    S.result = {
      paths: res.map((r) => ({
        id: r.id,
        match: r.match,
        weighted: r.c && r.c.weighted ? +r.c.weighted.toFixed(1) : null
      })),
      stage: stageId(),
      top: res[0] ? res[0].id : null,
      ts: Date.now()
    };
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
          "% match. Open it to see why.",
        link: "quiz"
      });
    }
    paintResults(box, res);
  }, 900);
}

function paintResults(box, res) {
  const top = res[0];
  const traits = topTraits(S.answers, 2);
  const bestSub = stageSubjects()
    .filter((s) => S.grades[s])
    .sort((a, b) => gradeValue(S.grades[b]) - gradeValue(S.grades[a]))[0];
  const weakest = stageSubjects()
    .filter((s) => S.grades[s])
    .sort((a, b) => gradeValue(S.grades[a]) - gradeValue(S.grades[b]))[0];
  const check = stageReadiness();

  box.innerHTML = `
  <section class="reveal" id="reveal">
    <div class="reveal-spark r1"></div><div class="reveal-spark r2"></div><div class="reveal-spark r3"></div>
    <span class="reveal-kick">${ic("i-spark", "sm")} Career check complete</span>
    <h2 class="reveal-h">You lean towards<br><em>${esc(top.name)}</em></h2>
    <p class="reveal-sub">${esc(top.why)}</p>
    <div class="reveal-body">
      <div class="reveal-ring">
        ${pfDonut(
          [
            { label: top.name, value: top.match, colour: "#7c5cff" },
            { label: "Room to grow", value: 100 - top.match, colour: "#e7e2f8" }
          ],
          { centre: top.match + "%", centreLabel: "match", unit: "%", alt: "Match for " + top.name }
        )}
      </div>
      <div class="reveal-facts">
        <div class="rf"><span class="rf-k">You are</span><b>${traits.map((t) => t.label).join(" · ") || "curious"}</b></div>
        <div class="rf"><span class="rf-k">Strongest area</span><b>${esc(bestSub || "not enough grades yet")}</b></div>
        <div class="rf"><span class="rf-k">Next step</span><b>${esc(nextStepText())}</b></div>
      </div>
    </div>
    <div class="reveal-chips">${traits.map((t) => `<span class="chip lav">${esc(t.label)}</span>`).join("")}<span class="chip">${esc(stage().label)}</span><span class="chip lime">${check.filled}/${check.total} graded</span></div>
    <div class="reveal-acts">
      <button class="btn btn-lime" id="revealMore">See the full breakdown ${ic("i-arr", "sm")}</button>
      <button class="btn btn-ghost" id="revealShare">${ic("i-share", "sm")} Save as a card</button>
    </div>
  </section>

  <div class="results-wrap" id="resultsWrap" hidden>
    <div class="alert-violet" style="margin-bottom:18px"><b>${isKCSE() ? "Best-7 aggregate: " + computeCluster(S.grades).t + " / 84." : "CBC levels, not points."}</b>
      ${esc(gradeScaleNote())}</div>
    ${res
      .slice(0, 4)
      .map((p, i) => {
        const matched = p.match;
        const w = p.c && p.c.weighted ? +p.c.weighted.toFixed(1) : null;
        const rows = (p.c.chosen || [])
          .map((s) => {
            const g = S.grades[s] || "—";
            const good = isCBC() ? gradeValue(g) >= 3 : gradePts(g) >= 6;
            return `<tr><td>${esc(s)}</td><td><span class="chip ${good ? "green" : "red"}" style="font-size:11.5px">${esc(g)}</span></td><td style="text-align:right;font-weight:700">${isCBC() ? gradeValue(g) + "/4" : gradePts(g)}</td></tr>`;
          })
          .join("");
        return `<div class="result-card${i === 0 ? " top" : ""}">
          <div class="rc-head"><span class="rank-badge">${i + 1}</span><span class="tile ${p.tile}">${ic(p.icon)}</span>
            <div style="flex:1;min-width:0"><div class="rc-title"><h3>${esc(p.name)}</h3>${i === 0 ? '<span class="chip pine">Best match</span>' : ""}</div>
              <p class="small muted">${esc(p.why)}</p></div>
            <div style="text-align:right"><div class="match-big">${matched}%</div><div class="tiny muted">match</div></div></div>
          <div class="bar" style="margin-top:14px"><i style="width:${matched}%"></i></div>
          <div class="prog-chips">${p.roles.map((r) => `<span class="chip">${esc(r)}</span>`).join("")}</div>
          <details class="rc-more"><summary>Subject detail</summary>
            <table class="clust-table"><thead><tr><th>${isCBC() ? "Learning area" : "Cluster subject"}</th><th>${isCBC() ? "Level" : "Grade"}</th><th style="text-align:right">${isCBC() ? "Pts" : "Pts"}</th></tr></thead><tbody>${rows}</tbody></table>
            ${w !== null ? `<div class="rc-w"><b>${w}</b><span class="tiny muted"> / 48 weighted cluster points</span></div>` : `<div class="tiny muted" style="margin-top:8px">CBC does not use cluster points — pathway fit is the share of these subjects graded ME or better.</div>`}
          </details>
          ${p.c && p.c.lift ? `<div class="alert-green" style="margin-top:12px"><b>Raise ${esc(p.c.lift.s)} one grade</b> → +${p.c.lift.delta.toFixed(1)} weighted points. Your biggest single lift.</div>` : ""}
          <div class="rc-acts">
            <button class="btn btn-line btn-sm" data-inst-field="${p.id}">${ic("i-grid", "sm")} Matching institutions</button>
            ${i === 0 ? `<button class="btn btn-dark btn-sm" data-tutor-for="${esc(weakest || "Mathematics")}">${ic("i-users", "sm")} Tutor for ${esc(weakest || "Mathematics")}</button>` : ""}
          </div>
        </div>`;
      })
      .join("")}
    <div class="step-foot">
      <button class="btn btn-ghost" id="retake">${ic("i-back", "sm")} Retake questions</button>
      <button class="btn btn-ghost" id="editGrades">${ic("i-file", "sm")} Edit grades</button>
      <button class="btn btn-lime" data-nav="dashboard" style="margin-left:auto">Go to overview ${ic("i-arr", "sm")}</button>
    </div>
  </div>`;

  const wrap = document.querySelector("#resultsWrap");
  document.querySelector("#revealMore").addEventListener("click", () => {
    wrap.hidden = false;
    document.querySelector("#reveal").classList.add("reveal-slim");
    if (wrap.scrollIntoView) wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("#revealShare").addEventListener("click", () => downloadResultCard(res));
  document.querySelectorAll("#quizBox [data-inst-field]").forEach((b) =>
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
  document.querySelector("#retake").addEventListener("click", () => {
    S.answers = [];
    S.qStep = 1;
    save();
    renderQuiz();
  });
  document.querySelector("#editGrades").addEventListener("click", () => {
    S.qStep = 0;
    save();
    renderQuiz();
  });
  reveal();
}

function nextStepText() {
  const s = stage();
  if (s.id === "primary") return "Keep your Grade 6 record steady";
  if (s.id === "junior") return "Shortlist a senior pathway";
  if (s.id === "senior") return cbePathway() ? "Check your elective mix" : "Choose a pathway";
  if (s.id === "post") return "Compare TVET and university";
  return "Protect your best seven subjects";
}

/* "Save as a card" writes a small text card — no images, no network, works in
   the preview and on a phone. */
function downloadResultCard(res) {
  const top = res[0];
  const traits = topTraits(S.answers, 3).map((t) => t.label);
  const lines = [
    "PathFinder Kenya — career check",
    new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }),
    "",
    "Stage: " + stage().label,
    "Strongest pathway: " + top.name + " (" + top.match + "% match)",
    "Traits: " + traits.join(", "),
    "",
    "Runner-up: " + (res[1] ? res[1].name + " (" + res[1].match + "%)" : "—"),
    "",
    "This is guidance only. Official placement goes through KUCCPS, KEMIS or KNEC.",
    "Generated on pathfinder-kenya.local"
  ];
  saveFile("pathfinder-career-card.txt", lines.join("\n"), "text/plain");
  toast("Card saved to your downloads", "i-check");
}

/* ---------- page boot ---------- */
if (document.body.dataset.step !== undefined && document.body.dataset.step !== "") {
  S.qStep = +document.body.dataset.step;
  save();
}
renderQuiz();
reveal();
