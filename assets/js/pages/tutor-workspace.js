/* Tutor workspace: dashboard, students, schedule, session log, verification. */
/* ---------- Tutor workspace ---------- */
function currentTutor() {
  if (!SESSION || SESSION.role !== "tutor") return null;
  return (
    PF_TUTORS.find((t) => t.id === SESSION.tutorId) || {
      id: "tx",
      name: SESSION.name,
      subjects: ["Mathematics"],
      area: SESSION.county || "Kenya",
      mode: "both",
      rate: S.tutorRate || 450,
      rating: 4.5,
      sessions: 0,
      resp: "~3 hrs",
      bio: "",
      checks: {},
      grid: [],
      slots: [],
      c1: "#7c5cff",
      c2: "#a78bfa"
    }
  );
}
function renderTspace() {
  const box = $("#tsBox");
  if (!SESSION || SESSION.role !== "tutor") {
    box.innerHTML = lockedHTML("tutor");
    return;
  }
  if (SESSION.demo) seedDemoTutorData();
  const t = currentTutor();
  $("#tsTitle").textContent =
    {
      dash: "Overview",
      requests: "Requests",
      students: "My students",
      schedule: "Availability",
      sessions: "Session log & earnings",
      profile: "Verification"
    }[S.tsTab] || "Overview";
  $("#tsSub").textContent = t.subjects.join(" · ") + " · " + t.area;
  const mine = S.bookings.filter((b) => b.tutorId === t.id),
    pending = mine.filter((b) => b.status === "Requested"),
    confirmed = mine.filter((b) => b.status === "Confirmed");
  const vc = checksOf(t).filter(Boolean).length;
  const availSlots =
    S.tutorSlots[t.id] && S.tutorSlots[t.id].length ? S.tutorSlots[t.id].length : (t.grid || []).length;
  const est = (S.tutorRate || t.rate) * (S.tutorHours || 4) * 4;
  if (S.tsTab === "dash") {
    box.innerHTML = `<div class="alert-violet" style="margin-bottom:18px">${ic("i-shield", "sm")} <b>Safeguarding first.</b> When sessions go fully live, every start and completion is notified to the registered guardian, and contact with a learner outside PathFinder is impossible — the chat filter already blocks phone numbers and socials.</div>
    <div class="grid g4" style="margin-bottom:18px">
      <div class="card" style="padding:20px"><div class="kpi-num">${confirmed.length + t.sessions}</div><div class="kpi-lab" style="margin-top:6px">Sessions logged</div></div>
      <div class="card" style="padding:20px"><div class="kpi-num">${availSlots}</div><div class="kpi-lab" style="margin-top:6px">Weekly slots</div></div>
      <div class="card" style="padding:20px"><div class="kpi-num" style="font-size:24px">KES ${est.toLocaleString()}</div><div class="kpi-lab" style="margin-top:6px">Est. monthly</div></div>
      <div class="card" style="padding:20px"><div class="kpi-num">${vc}/4</div><div class="kpi-lab" style="margin-top:6px">Verification</div></div>
    </div>
    <div class="grid g2" style="align-items:start">
      <div class="card"><h3 style="font-size:17px;margin-bottom:6px">Incoming requests</h3>${pending.length ? pending.map((b) => `<div style="border:1.5px solid var(--line);border-radius:16px;padding:16px;margin-top:12px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div class="avatar" style="width:38px;height:38px;flex-basis:38px;font-size:12px;background:linear-gradient(135deg,#ff7a59,#ffb020)">${esc(initials(b.learner))}</div><b style="font-family:var(--font-d)">${esc(b.learner)}</b><span class="status-pill req">Requested</span></div><p class="small muted" style="margin-top:8px"><b style="color:var(--pine3)">${esc(b.subject)}</b> · ${esc(b.slot)}</p>${b.note ? `<p class="tiny muted">“${esc(b.note)}”</p>` : ""}<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-dark btn-sm" data-accept="${b.id}">${ic("i-check", "sm")} Accept</button><button class="btn btn-danger btn-sm" data-decline="${b.id}">Decline</button><button class="btn btn-ghost btn-sm" data-chat="${b.id}" data-side="tutor">${ic("i-chat", "sm")}</button></div></div>`).join("") : `<div class="empty" style="margin-top:12px;padding:26px">${ic("i-check")}<b style="display:block;color:var(--pine3);font-family:var(--font-d)">Queue clear</b>No pending requests right now.</div>`}</div>
      <div class="card"><h3 style="font-size:17px;margin-bottom:14px">Rate estimator</h3><p class="small muted" style="margin-bottom:14px">Based on your hourly rate and published availability. <b>No money moves through PathFinder yet.</b></p>
        <div class="grid g2" style="gap:12px"><div><label class="flab" for="estRate">Hourly rate (KES)</label><input class="input" id="estRate" type="number" min="350" max="600" value="${S.tutorRate || t.rate}"></div><div><label class="flab" for="estHrs">Hours / week</label><input class="input" id="estHrs" type="number" min="1" max="40" value="${S.tutorHours || 4}"></div></div>
        <div class="pine-panel" style="padding:18px;border-radius:16px;margin-top:14px"><div class="kpi-lab" style="color:#e9e2ff">Monthly estimate (4 wks)</div><div style="font-family:var(--font-d);font-weight:800;font-size:30px;margin-top:4px" id="estOut">KES ${est.toLocaleString()}</div></div>
      </div>
    </div>`;
    wireTutor(box);
    const upd = () => {
      const r = Math.min(600, Math.max(350, +$("#estRate").value || 0)),
        h = Math.max(1, +$("#estHrs").value || 1);
      S.tutorRate = r;
      S.tutorHours = h;
      save();
      $("#estOut").textContent = "KES " + (r * h * 4).toLocaleString();
    };
    $("#estRate").addEventListener("input", upd);
    $("#estHrs").addEventListener("input", upd);
  } else if (S.tsTab === "requests") {
    box.innerHTML = pending.length
      ? `<div style="display:flex;flex-direction:column;gap:12px">` +
        pending
          .map(
            (b) =>
              `<div class="card" style="display:flex;gap:14px;align-items:flex-start;padding:20px"><div class="avatar" style="background:linear-gradient(135deg,#ff7a59,#ffb020)">${esc(initials(b.learner))}</div><div style="flex:1;min-width:0"><h3 style="font-size:16px">${esc(b.subject)} <span class="status-pill req">Requested</span></h3><div class="tutor-stats" style="margin-top:6px"><span>${ic("i-user", "sm")} ${esc(b.learner)}</span><span>${ic("i-cal", "sm")} ${esc(b.slot)}</span><span>${esc(b.mode)}</span></div>${b.note ? `<p class="small muted" style="margin-top:6px">“${esc(b.note)}”</p>` : ""}<div class="tutor-actions"><button class="btn btn-dark btn-sm" data-accept="${b.id}">${ic("i-check", "sm")} Accept</button><button class="btn btn-danger btn-sm" data-decline="${b.id}">Decline</button><button class="btn btn-ghost btn-sm" data-chat="${b.id}" data-side="tutor">${ic("i-chat", "sm")} Chat</button></div></div></div>`
          )
          .join("") +
        `</div>`
      : `<div class="empty">${ic("i-cal")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:4px">No pending requests</b>New learner requests appear here instantly.</div>`;
    wireTutor(box);
  } else if (S.tsTab === "students") {
    const by = {};
    mine.forEach((b) => {
      (by[b.learner] = by[b.learner] || []).push(b);
    });
    const names = Object.keys(by);
    box.innerHTML = names.length
      ? `<div style="display:flex;flex-direction:column;gap:12px">` +
        names
          .map((n) => {
            const bs = by[n],
              last = bs[0];
            return `<div class="card" style="display:flex;gap:14px;align-items:flex-start;padding:20px"><div class="avatar" style="background:linear-gradient(135deg,#ff7a59,#ffb020)">${esc(initials(n))}</div><div style="flex:1;min-width:0"><h3 style="font-size:16px">${esc(n)}</h3><div class="tutor-stats" style="margin-top:6px"><span><b>${bs.length}</b> sessions</span><span>${esc([...new Set(bs.map((b) => b.subject))].join(", "))}</span><span>Next: ${esc(last.slot)}</span></div><div class="tutor-actions"><button class="btn btn-dark btn-sm" data-chat="${last.id}" data-side="tutor">${ic("i-chat", "sm")} Message</button><span class="chip ${last.status === "Confirmed" ? "green" : last.status === "Declined" ? "red" : "amber"}">${esc(last.status)}</span></div></div></div>`;
          })
          .join("") +
        `</div>`
      : `<div class="empty">${ic("i-users")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:4px">No students yet</b>They appear after their first booking.</div>`;
    wireTutor(box);
  } else if (S.tsTab === "schedule") {
    const active = new Set(S.tutorSlots[t.id] || t.grid || []);
    box.innerHTML = `<div class="alert-violet" style="margin-bottom:16px">Tap a slot to open or close it. Open slots are exactly what learners see when requesting a session.</div><div class="sched">${SCHED_DAYS.map(
      (d) =>
        `<div class="sched-day"><h5>${d}</h5>${SCHED_BANDS.map((b) => {
          const k = d + "|" + b;
          return `<button class="sched-cell${active.has(k) ? " on" : ""}" data-cell="${k}">${b.replace(" AM", "").replace(" PM", "p")}</button>`;
        }).join("")}</div>`
    ).join(
      ""
    )}</div><p class="tiny muted" style="margin-top:14px">${ic("i-info", "sm")} <b>${active.size}</b> open slots · learners can only book slots you publish.</p>`;
    $$("[data-cell]", box).forEach((cell) =>
      cell.addEventListener("click", () => {
        const k = cell.dataset.cell;
        const cur = new Set(S.tutorSlots[t.id] || t.grid || []);
        if (cur.has(k)) cur.delete(k);
        else cur.add(k);
        S.tutorSlots[t.id] = [...cur];
        save();
        cell.classList.toggle("on");
        toast(cur.has(k) ? "Opened " + k.replace("|", " · ") : "Closed " + k.replace("|", " · "), "i-cal");
      })
    );
  } else if (S.tsTab === "sessions") {
    const done = mine.filter((b) => b.status === "Completed");
    const earned = done.reduce((sum, b) => sum + sessionFee(b, t), 0);
    const weekStart = Date.now() - 7 * 864e5;
    const thisWeek = done.filter((b) => (b.completedAt || 0) >= weekStart);
    box.innerHTML = `<div class="grid g4" style="margin-bottom:16px">
      <div class="card" style="padding:18px"><div class="kpi-num">${done.length}</div><div class="kpi-lab" style="margin-top:6px">Sessions completed</div></div>
      <div class="card" style="padding:18px"><div class="kpi-num" style="font-size:24px">KES ${earned.toLocaleString()}</div><div class="kpi-lab" style="margin-top:6px">Logged value (pilot rate)</div></div>
      <div class="card" style="padding:18px"><div class="kpi-num">${thisWeek.length}</div><div class="kpi-lab" style="margin-top:6px">Last 7 days</div></div>
      <div class="card" style="padding:18px"><div class="kpi-num">${mine.length - done.length}</div><div class="kpi-lab" style="margin-top:6px">Still open</div></div>
    </div>
    <div class="card" style="padding:8px 6px"><div class="table-scroll"><table class="tbl" style="min-width:600px"><thead><tr><th>Student</th><th>Subject</th><th>Slot</th><th>Status</th><th style="text-align:right">Fee</th><th></th></tr></thead><tbody>
    ${mine.length ? mine.map((b) => `<tr><td><b style="color:var(--pine3)">${esc(b.learner)}</b></td><td>${esc(b.subject)}</td><td class="tiny muted">${esc(b.slot)}</td><td><span class="chip ${b.status === "Completed" ? "green" : b.status === "Confirmed" ? "green" : b.status === "Declined" ? "red" : "amber"}">${esc(b.status)}</span></td><td style="text-align:right;font-family:var(--font-d);font-weight:800">KES ${b.status === "Confirmed" || b.status === "Completed" ? sessionFee(b, t).toLocaleString() : 0}</td><td style="text-align:right">${b.status === "Confirmed" ? `<button class="btn btn-lime btn-sm" data-complete="${b.id}">${ic("i-check", "sm")} Mark done</button>` : b.status === "Completed" ? `<span class="tiny muted">${esc(new Date(b.completedAt || Date.now()).toLocaleDateString("en-KE", { day: "numeric", month: "short" }))}</span>` : ""}</td></tr>`).join("") : `<tr><td colspan="6" class="small muted" style="padding:20px;text-align:center">No sessions yet. Accept a request and it appears here.</td></tr>`}
    </tbody></table></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <button class="btn btn-ghost btn-sm" id="tsExport">${ic("i-download", "sm")} Export ledger</button>
      <span class="chip" style="font-size:10.5px">${done.length} completed · ${mine.length} total</span>
    </div>
    <div class="alert-mock" style="margin-top:14px">${ic("i-info", "sm")} This is a planning ledger — <b>payments are not live</b>. Fees use your published rate, and marking a session done tells the learner to leave a review.</div>`;
    const ex = $("#tsExport", box);
    if (ex)
      ex.addEventListener("click", () => {
        const rows = [["Date", "Student", "Subject", "Slot", "Status", "Fee KES"]].concat(
          mine.map((b) => [
            new Date(b.completedAt || b.ts || Date.now()).toISOString().slice(0, 10),
            b.learner || "",
            b.subject || "",
            b.slot || "",
            b.status || "",
            String(b.status === "Confirmed" || b.status === "Completed" ? sessionFee(b, t) : 0)
          ])
        );
        if (saveFile("pathfinder-session-ledger.csv", toCSV(rows))) toast("Ledger exported", "i-download");
      });
    wireTutor(box);
  } else {
    const sub = (S.verifySub || {})[t.id] || {};
    box.innerHTML = `<div class="grid g2" style="align-items:start"><div class="card" style="display:flex;gap:16px;align-items:flex-start">${tutorAvatar(t, 64)}<div style="min-width:0;flex:1"><h3 style="font-size:19px">${esc(t.name)}${SESSION.demo ? ' <span class="chip demo">DEMO</span>' : ""}</h3><div class="prog-chips">${t.subjects.map((s) => `<span class="chip lime">${esc(s)}</span>`).join("")}</div><p class="small muted" style="margin-top:10px">${esc(t.bio) || "Add a bio so learners know how you teach."}</p><div class="tutor-stats" style="margin-top:10px"><span class="rate-tag">KES ${S.tutorRate || t.rate}/hr</span><span><span class="star">★</span> <b>${t.rating}</b></span><span>${esc(t.area)}</span></div></div></div><div class="card"><span class="eyebrow">Verification record</span><h3 style="font-size:18px;margin:8px 0 4px">What learners see</h3>${[
      ["tsc", "TSC registration"],
      ["id", "National ID"],
      ["conduct", "Certificate of good conduct"],
      ["safe", "Safeguarding training"]
    ]
      .map(([k, ttl]) => {
        const v = checksOf(t)[["tsc", "id", "conduct", "safe"].indexOf(k)];
        return `<div class="checkrow"><span class="ck ${v ? "done" : "wait"}">${v ? "✓" : "…"}</span><div style="min-width:0;flex:1"><b style="font-size:14.5px;color:var(--pine3)">${ttl}</b></div><span class="chip ${v ? "green" : "amber"}">${v ? "Verified" : "Awaiting reviewer"}</span>${v ? "" : `<button class="btn btn-ghost btn-sm" data-vsub="${k}:${esc(ttl)}">${ic("i-file", "sm")} Submit</button>`}</div>`;
      })
      .join("")}
      ${Object.keys(sub || {}).length ? `<div class="ac-note" style="margin-top:12px">${ic("i-check", "sm")} ${Object.keys(sub).length} record${Object.keys(sub).length > 1 ? "s" : ""} submitted — an admin reviewer still has to record the check before the badge shows.</div>` : ""}<p class="tiny muted" style="margin-top:12px">${ic("i-info", "sm")} Only an admin records a check — nothing is claimed as verified until a reviewer confirms it.</p></div></div>`;
    wireTutor(box);
  }
}
/* A session's fee is derived, never typed in: the published hourly rate for a
   2-hour slot, capped to the pilot band. */
function sessionFee(b, t) {
  const rate = Math.min(600, Math.max(350, Number(S.tutorRate) || (t && t.rate) || 450));
  return Math.round(rate * 2);
}
function completeSession(id) {
  const bk = S.bookings.find((x) => x.id === id);
  if (!bk) return;
  if (bk.status !== "Confirmed") {
    toast("Only a confirmed session can be completed", "i-info");
    return;
  }
  bk.status = "Completed";
  bk.completedAt = Date.now();
  if (typeof push === "function") push("booking", bk);
  S.sessionLog = S.sessionLog || [];
  S.sessionLog.unshift({
    id: "s" + Date.now(),
    bookingId: bk.id,
    learner: bk.learner,
    subject: bk.subject,
    slot: bk.slot,
    fee: sessionFee(bk, currentTutor()),
    ts: Date.now()
  });
  save();
  if (typeof addNote === "function")
    addNote({
      to: "student",
      kind: "request",
      from: "Tutor · " + (SESSION ? SESSION.name.split(" ")[0] : "Tutor"),
      title: "Session completed",
      body: `${bk.subject} · ${bk.slot}. Leave a review so other learners know how it went.`,
      link: "tutors"
    });
  renderTspace();
  toast("Session marked complete — the learner can review it", "i-check");
}

function wireTutor(scope) {
  $$("[data-accept]", scope).forEach((b) =>
    b.addEventListener("click", () => {
      const bk = S.bookings.find((x) => x.id === +b.dataset.accept);
      if (!bk) return;
      bk.status = "Confirmed";
      S.msgs[bk.id] = S.msgs[bk.id] || [];
      S.msgs[bk.id].push({
        from: "tutor",
        text: `Hi ${String(bk.learner).split(" ")[0]}! Confirmed your ${bk.subject} session — ${bk.slot}. Karibu!`,
        ts: Date.now()
      });
      if (typeof addNote === "function")
        addNote({
          to: "student",
          kind: "request",
          from: "Tutor · " + (SESSION ? SESSION.name.split(" ")[0] : "Tutor"),
          title: "Session confirmed",
          body: `${bk.subject} · ${bk.slot} is confirmed. Mesazeni ndani ya app.`,
          link: "tutors"
        });
      if (typeof push === "function") push("booking", bk);
      save();
      renderTspace();
      toast("Session confirmed — learner notified", "i-check");
    })
  );
  $$("[data-decline]", scope).forEach((b) =>
    b.addEventListener("click", () => {
      const bk = S.bookings.find((x) => x.id === +b.dataset.decline);
      if (!bk) return;
      bk.status = "Declined";
      S.msgs[bk.id] = S.msgs[bk.id] || [];
      S.msgs[bk.id].push({
        from: "tutor",
        text: `Hi — I can't make ${bk.slot}. Please pick another slot. Asante!`,
        ts: Date.now()
      });
      if (typeof push === "function") push("booking", bk);
      save();
      renderTspace();
      toast("Declined — learner notified", "i-info");
    })
  );
  $$("[data-complete]", scope).forEach((b) => b.addEventListener("click", () => completeSession(+b.dataset.complete)));
  $$("[data-chat]", scope).forEach((b) =>
    b.addEventListener("click", () => openChat(+b.dataset.chat, b.dataset.side || "tutor"))
  );
  $$("[data-vsub]", scope).forEach((b) =>
    b.addEventListener("click", () => {
      const [k, ...rest] = b.dataset.vsub.split(":");
      const label = rest.join(":");
      const t = currentTutor();
      if (!t) return;
      openModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><span class="tile lav">${ic("i-file", "lg")}</span>
      <div style="flex:1;min-width:0"><h3 style="font-size:18px">${esc(label)}</h3><p class="tiny muted">Reference only — the admin reviewer records the check. Nothing is published until they do.</p></div>
      <button class="modal-x" data-close>${ic("i-x")}</button></div><div class="divider"></div>
      <label class="flab" for="vRef">Reference or certificate number</label>
      <input class="input" id="vRef" maxlength="60" placeholder="e.g. TSC/2019/004321 or certificate serial">
      <label class="flab" for="vNote" style="margin-top:12px">Note for the reviewer (optional)</label>
      <textarea class="input" id="vNote" rows="2" maxlength="160" placeholder="Where to confirm it, or when it expires."></textarea>
      <div class="alert-violet" style="margin-top:12px;font-size:13px">${ic("i-lock", "sm")} Never type a password, PIN or full ID number here. A reference is enough to start the check.</div>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-lime" id="vSend" style="margin-left:auto">${ic("i-send", "sm")} Submit to reviewer</button></div>`);
      $("#vSend").addEventListener("click", () => {
        const ref = $("#vRef").value.trim();
        if (ref.length < 4) {
          toast("Add a reference the reviewer can check", "i-info");
          return;
        }
        S.verifySub = S.verifySub || {};
        S.verifySub[t.id] = S.verifySub[t.id] || {};
        S.verifySub[t.id][k] = { ref, note: $("#vNote").value.trim(), ts: Date.now() };
        save();
        closeModal();
        renderTspace();
        if (typeof addNote === "function")
          addNote({
            to: "admin",
            kind: "system",
            from: "Tutor · " + (SESSION ? SESSION.name.split(" ")[0] : "Tutor"),
            title: "Evidence submitted: " + label,
            body: ref + " — open Users & roles to record the check.",
            link: "admin-users"
          });
        toast("Sent to the reviewer — the badge appears once they record it", "i-send");
      });
    })
  );
}

/* ---------- page boot ---------- */
const TSTAB = document.body.dataset.tstab;
if (TSTAB) S.tsTab = TSTAB;
if (guard("tutor")) {
  renderTspace();
  reveal();
}
