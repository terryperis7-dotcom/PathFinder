/* Tutor centre for learners: find, request, message, report. */
/* ---------- Tutors (learner side) ---------- */
function renderTutors() {
  $$("#tutorTabs [data-tt]").forEach((b) => b.classList.toggle("on", b.dataset.tt === S.tutTab));
  const box = $("#tutorBox");
  if (S.tutTab === "find") renderFind(box);
  else if (S.tutTab === "sessions") renderSessions(box);
  else renderJoin(box);
  const n = S.bookings.filter((b) => b.mine).length;
  const sc = $("#sessCount");
  sc.style.display = n ? "inline-flex" : "none";
  sc.textContent = n;
}
$("#tutorTabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tt]");
  if (!b) return;
  S.tutTab = b.dataset.tt;
  save();
  renderTutors();
});
function renderFind(box) {
  const subj = S._tutorSubject || "";
  const list0 = activeTutors();
  box.innerHTML = `<div class="inst-tools" style="margin-top:0"><select class="input" id="tutSubj" style="width:auto;flex:0 1 230px"><option value="">All subjects</option>${[...new Set(list0.flatMap((t) => t.subjects))].map((s) => `<option${s === subj ? " selected" : ""}>${s}</option>`).join("")}</select><select class="input" id="tutMode" style="width:auto;flex:0 1 190px"><option value="">Online & in-person</option><option value="online">Online only</option><option value="inperson">In-person only</option></select><span class="chip" style="margin-left:auto">${ic("i-shield", "sm")} ${list0.length} verified pilot tutors</span></div>${subj ? `<div class="alert-violet" style="margin-bottom:14px">Showing tutors for <b>${esc(subj)}</b>. <button style="background:none;border:0;color:var(--pine);font-weight:700" id="clearSubj">Clear</button></div>` : ""}<div class="alert-green" style="margin-bottom:16px">${ic("i-shield", "sm")} <b>Learner-safe:</b> chat blocks phone numbers, socials and abuse; every tutor can be reported; admins can suspend instantly.</div><div class="grid g2" id="tutorList"></div>`;
  if (subj) {
    const cs = $("#clearSubj");
    if (cs)
      cs.addEventListener("click", () => {
        S._tutorSubject = "";
        save();
        renderTutors();
      });
  }
  const apply = () => {
    const s = $("#tutSubj").value,
      m = $("#tutMode").value;
    const list = list0.filter((t) => (!s || t.subjects.includes(s)) && (!m || t.mode === m || t.mode === "both"));
    $("#tutorList").innerHTML = list.length
      ? list
          .map(
            (t) =>
              `<div class="card tutor-card">${tutorAvatar(t)}<div class="tutor-head"><h3>${esc(t.name)} <span class="rate-tag">KES ${t.rate}/hr</span></h3><div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px">${vBadges(t)}</div><div class="prog-chips">${t.subjects.map((x) => `<span class="chip lime">${esc(x)}</span>`).join("")}</div><p class="small muted" style="margin-top:8px">${esc(t.bio)}</p><div class="tutor-stats"><span><span class="star">★</span> <b>${t.rating}</b></span><span><b>${t.sessions}</b> sessions</span><span>${ic("i-pin", "sm")} ${esc(t.area)}</span></div><div class="tutor-actions"><button class="btn btn-dark btn-sm" data-req="${t.id}">${ic("i-cal", "sm")} Request session</button><button class="btn btn-ghost btn-sm" data-msg-tutor="${t.id}">${ic("i-chat", "sm")} Message</button><button class="btn btn-ghost btn-sm" data-report="${t.id}" title="Report this tutor">${ic("i-flag", "sm")}</button></div></div></div>`
          )
          .join("")
      : `<div class="empty" style="grid-column:1/-1">${ic("i-users")}<b style="display:block;color:var(--pine3);font-family:var(--font-d)">No tutors match yet</b>Try all subjects.</div>`;
  };
  $("#tutSubj").addEventListener("change", apply);
  $("#tutMode").addEventListener("change", apply);
  apply();
}
function requestModal(tid) {
  const t = PF_TUTORS.find((x) => x.id === tid);
  if (!t) return;
  const pref = S._tutorSubject && t.subjects.includes(S._tutorSubject) ? S._tutorSubject : t.subjects[0];
  openModal(
    `<div style="display:flex;gap:12px;align-items:center;margin-bottom:6px">${tutorAvatar(t, 44)}<div style="flex:1;min-width:0"><h3 style="font-size:18px">Request a session</h3><p class="tiny muted">${esc(t.name)} · KES ${t.rate}/hr</p></div><button class="modal-x" data-close>${ic("i-x")}</button></div><div class="divider"></div><label class="flab">Subject</label><div class="prog-chips" id="reqSubj" style="margin-bottom:16px">${t.subjects.map((s, i) => `<button class="quiz-opt sel" style="width:auto;padding:9px 16px;border-radius:99px;font-weight:700;font-size:13px" data-s="${esc(s)}"><span class="k" style="width:22px;height:22px;border-radius:7px;font-size:10px">${i + 1}</span>${esc(s)}</button>`).join("")}</div><label class="flab">Time slot</label><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px" id="reqSlots">${t.slots.map((s, i) => `<button class="slot-opt" data-slot="${i}">${ic("i-cal")} <b style="min-width:44px">${s.d}</b> <span class="muted">${s.t}</span></button>`).join("")}</div><label class="flab" for="reqNote">Notes (optional)</label><textarea class="input" id="reqNote" rows="2" placeholder="e.g. Chemistry Paper 2, organic chemistry"></textarea><div style="display:flex;gap:10px;margin-top:18px"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-lime" id="reqSend" style="margin-left:auto">${ic("i-send", "sm")} Send request</button></div>`
  );
  let subj = pref,
    slot = 0;
  const mark = () => $$("#reqSubj [data-s]").forEach((b) => b.classList.toggle("sel", b.dataset.s === subj));
  mark();
  $$("#reqSlots [data-slot]").forEach((b, i) => b.classList.toggle("sel", i === 0));
  $$("#reqSubj [data-s]").forEach((b) =>
    b.addEventListener("click", () => {
      subj = b.dataset.s;
      mark();
    })
  );
  $$("#reqSlots [data-slot]").forEach((b) =>
    b.addEventListener("click", () => {
      slot = +b.dataset.slot;
      $$("#reqSlots [data-slot]").forEach((x) => x.classList.toggle("sel", x === b));
    })
  );
  $("#reqSend").addEventListener("click", () => {
    const note = $("#reqNote").value.trim();
    const label = `${t.slots[slot].d} ${t.slots[slot].t}`;
    const learner = SESSION ? SESSION.name : "Guest learner";
    const b = {
      id: Date.now(),
      tutorId: t.id,
      subject: subj,
      slot: label,
      mode: t.mode === "online" ? "Online" : t.mode === "inperson" ? "In-person" : "Online (default)",
      note,
      status: "Requested",
      ts: Date.now(),
      learner,
      mine: true
    };
    S.bookings.unshift(b);
    if (typeof push === "function") push("booking", b);
    if (typeof addNote === "function") {
      addNote({
        to: "student",
        kind: "request",
        from: "Tutor · " + t.name,
        title: "Request sent to " + t.name.split(" ")[0],
        body: `${subj} · ${label}. You will see the decision here first — contact details stay hidden until it is approved.`,
        link: "tutors"
      });
      addNote({
        to: "tutor",
        kind: "request",
        from: "Learner · " + learner,
        title: "New session request",
        body: `${subj} · ${label}. Approve or decline it in your workspace.`,
        link: "tspace"
      });
    }
    S.msgs[b.id] = [
      {
        from: "me",
        text: `Hi ${t.name.split(" ")[0]}! ${subj} session on ${label}. ${note ? "Note: " + note : ""}`,
        ts: Date.now()
      }
    ];
    if (sb.enabled())
      queueSync("bookings", [{ id: String(b.id), tutor_id: t.id, subject: subj, slot: label, status: "Requested" }]);
    save();
    closeModal();
    renderTutors();
    toast(`Request sent to ${t.name.split(" ")[0]}`, "i-send");
    setTimeout(() => {
      const bk = S.bookings.find((x) => x.id === b.id);
      if (bk && bk.status === "Requested") {
        bk.status = "Confirmed";
        S.msgs[b.id].push({
          from: "tutor",
          text: `Hi! Confirmed your ${subj} session — ${label}. I'll send revision questions beforehand. Karibu!`,
          ts: Date.now()
        });
        save();
        renderTutors();
        toast(`${t.name.split(" ")[0]} confirmed your session`, "i-check");
      }
    }, 2800);
  });
}
function renderSessions(box) {
  const mine = S.bookings.filter((b) => b.mine);
  if (!mine.length) {
    box.innerHTML = `<div class="empty">${ic("i-cal")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:4px">No sessions yet</b>Request one from Find a tutor.</div><div style="text-align:center;margin-top:16px"><button class="btn btn-lime" id="goFind">Find a tutor</button></div>`;
    $("#goFind").addEventListener("click", () => {
      S.tutTab = "find";
      save();
      renderTutors();
    });
    return;
  }
  box.innerHTML =
    `<div style="display:flex;flex-direction:column;gap:12px">` +
    mine
      .map((b) => {
        const t = PF_TUTORS.find((x) => x.id === b.tutorId);
        if (!t) return "";
        const unread = (S.msgs[b.id] || []).filter((m) => m.from === "tutor").length;
        return `<div class="card" style="display:flex;gap:14px;align-items:flex-start;padding:20px">${tutorAvatar(t)}<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h3 style="font-size:16px">${esc(b.subject)} · ${esc(t.name)}</h3><span class="status-pill ${b.status === "Confirmed" ? "conf" : b.status === "Declined" ? "dec" : "req"}">${b.status}</span></div><div class="tutor-stats" style="margin-top:8px"><span>${ic("i-cal", "sm")} ${esc(b.slot)}</span><span>${esc(b.mode)} · KES ${t.rate}/hr</span>${unread ? `<span class="chip lime">${unread} msg</span>` : ""}</div><div class="tutor-actions"><button class="btn btn-dark btn-sm" data-chat="${b.id}" data-side="learner">${ic("i-chat", "sm")} Chat</button><button class="btn btn-ghost btn-sm" data-report="${b.id}">${ic("i-flag", "sm")} Report</button>${b.status === "Requested" ? `<button class="btn btn-ghost btn-sm" data-resched="${b.id}">${ic("i-refresh", "sm")} Change slot</button>` : ""}${b.status === "Completed" ? `<button class="btn btn-lime btn-sm" data-review="${b.id}">${ic("i-star", "sm")} ${reviewOf(b) ? `Your rating: ★${reviewOf(b).stars}` : "Leave a review"}</button>` : ""}<button class="btn btn-ghost btn-sm" data-cancel="${b.id}">Cancel</button></div></div></div>`;
      })
      .join("") +
    `</div>`;
  $$("[data-chat]", box).forEach((b) => b.addEventListener("click", () => openChat(+b.dataset.chat, b.dataset.side)));
  $$("[data-cancel]", box).forEach((b) =>
    b.addEventListener("click", () => {
      const id = +b.dataset.cancel;
      S.bookings = S.bookings.filter((x) => x.id !== id);
      delete S.msgs[id];
      save();
      renderTutors();
      toast("Cancelled", "i-info");
    })
  );
  $$("[data-report]", box).forEach((b) =>
    b.addEventListener("click", () => {
      const bk = S.bookings.find((x) => x.id === +b.dataset.report);
      if (bk) reportModal(bk.tutorId);
    })
  );
  $$("[data-resched]", box).forEach((b) => b.addEventListener("click", () => rescheduleModal(+b.dataset.resched)));
  $$("[data-review]", box).forEach((b) => b.addEventListener("click", () => reviewModal(+b.dataset.review)));
}
/* ---------- learner reviews + reschedule ----------
   A review can only exist for a session the tutor marked complete, and it is
   shown back to the learner (never merged into the tutor's published rating). */
const reviewOf = (b) => (S.reviews || []).find((r) => String(r.bookingId) === String(b.id));

function reviewModal(id) {
  const b = S.bookings.find((x) => x.id === id);
  const t = b && PF_TUTORS.find((x) => x.id === b.tutorId);
  if (!b || !t) return;
  if (b.status !== "Completed") {
    toast("You can review a session once it is marked complete", "i-info");
    return;
  }
  const prev = reviewOf(b);
  openModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">${tutorAvatar(t, 44)}
      <div style="flex:1;min-width:0"><h3 style="font-size:18px">How was the session?</h3><p class="tiny muted">${esc(b.subject)} · ${esc(t.name)} · ${esc(b.slot)}</p></div>
      <button class="modal-x" data-close>${ic("i-x")}</button></div><div class="divider"></div>
    <label class="flab">Your rating</label>
    <div class="prog-chips" id="rvStars" style="margin-bottom:6px">${[1, 2, 3, 4, 5].map((n) => `<button class="quiz-opt${prev && prev.stars === n ? " sel" : ""}" data-star="${n}" aria-label="${n} star${n > 1 ? "s" : ""}">★ ${n}</button>`).join("")}</div>
    <label class="flab" for="rvText" style="margin-top:10px">Anything other learners should know? (optional)</label>
    <textarea class="input" id="rvText" rows="3" maxlength="200" placeholder="Was the explanation clear? Did they keep time?">${esc(prev ? prev.text : "")}</textarea>
    <div class="alert-mock" style="margin-top:12px;font-size:12.5px">${ic("i-info", "sm")} Reviews are shown to you and kept on this device. They never include contact details, and ratings stay separate from the tutor's published score until a moderator reviews them.</div>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-lime" id="rvSave" style="margin-left:auto">${ic("i-check", "sm")} Save review</button></div>`);
  let stars = prev ? prev.stars : 0;
  $$("#rvStars [data-star]").forEach((btn) =>
    btn.addEventListener("click", () => {
      stars = +btn.dataset.star;
      $$("#rvStars [data-star]").forEach((x) => x.classList.toggle("sel", x === btn));
    })
  );
  $("#rvSave").addEventListener("click", () => {
    if (!stars) {
      toast("Pick a rating first", "i-info");
      return;
    }
    S.reviews = (S.reviews || []).filter((r) => String(r.bookingId) !== String(b.id));
    S.reviews.unshift({
      id: "r" + Date.now(),
      bookingId: b.id,
      tutorId: b.tutorId,
      stars,
      text: $("#rvText").value.trim(),
      ts: Date.now()
    });
    if (typeof push === "function") push("review", S.reviews[0]);
    save();
    closeModal();
    renderTutors();
    if (typeof addNote === "function")
      addNote({
        to: "tutor",
        kind: "message",
        from: "Learner review",
        title: `${stars}★ review from ${b.learner || "a learner"}`,
        body: ($("#rvText").value.trim() || "(no comment)") + " · " + b.subject,
        link: "tspace"
      });
    toast("Review saved", "i-star");
  });
}

function rescheduleModal(id) {
  const b = S.bookings.find((x) => x.id === id);
  const t = b && PF_TUTORS.find((x) => x.id === b.tutorId);
  if (!b || !t) return;
  const slots = t.slots || [];
  openModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">${tutorAvatar(t, 44)}
      <div style="flex:1;min-width:0"><h3 style="font-size:18px">Change the slot</h3><p class="tiny muted">${esc(b.subject)} · ${esc(t.name)}</p></div>
      <button class="modal-x" data-close>${ic("i-x")}</button></div><div class="divider"></div>
    <label class="flab">Pick another published slot</label>
    <div class="prog-chips" id="rsSlots" style="margin-bottom:4px">${slots.map((s, i) => `<button class="quiz-opt${s.d === (b.slot || "").slice(0, 3) && i === 0 ? " sel" : ""}" data-rs="${i}">${esc(s.d)} · ${esc(s.t)}</button>`).join("")}</div>
    <p class="tiny muted" style="margin-top:8px">Your request goes back to ${esc(t.name.split(" ")[0])} for approval. The chat and your note stay exactly as they are.</p>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-ghost" data-close>Keep current slot</button>
      <button class="btn btn-lime" id="rsSave" style="margin-left:auto">${ic("i-check", "sm")} Request change</button></div>`);
  let pick = -1;
  $$("#rsSlots [data-rs]").forEach((btn) =>
    btn.addEventListener("click", () => {
      pick = +btn.dataset.rs;
      $$("#rsSlots [data-rs]").forEach((x) => x.classList.toggle("sel", x === btn));
    })
  );
  $("#rsSave").addEventListener("click", () => {
    if (pick < 0) {
      toast("Pick a slot first", "i-info");
      return;
    }
    const label = `${slots[pick].d} ${slots[pick].t}`;
    b.slot = label;
    b.status = "Requested";
    b.ts = Date.now();
    S.msgs[b.id] = S.msgs[b.id] || [];
    S.msgs[b.id].push({ from: "me", text: `Could we move the session to ${label}?`, ts: Date.now() });
    save();
    closeModal();
    renderTutors();
    if (typeof addNote === "function")
      addNote({
        to: "tutor",
        kind: "request",
        from: "Learner · " + (b.learner || "Learner"),
        title: "Slot change requested",
        body: `${b.subject} · now ${label}. Approve or decline it in your workspace.`,
        link: "tspace"
      });
    toast("Slot change requested", "i-refresh");
  });
}

function renderJoin(box) {
  const app = S.tutorApp;
  const cl = [
    ["i-shield", "TSC registration", "Verified against the TSC register"],
    ["i-file", "National ID check", "Identity confirmed before learner contact"],
    ["i-check", "Certificate of good conduct", "DCI-issued, under 12 months"],
    ["i-users", "Safeguarding training", "Child-protection training completed"]
  ];
  box.innerHTML = `<div class="grid g2" style="align-items:start"><div class="card"><span class="eyebrow">Earn by teaching</span><h3 style="font-size:21px;margin:8px 0 6px">Join as a tutor</h3><p class="small muted" style="margin-bottom:16px">Fixed pilot rate, session logging — no payment in-app. Applications join a human review queue.</p>${app ? `<div class="alert-green" style="margin-bottom:14px"><b>Application received, ${esc(app.name.split(" ")[0])}.</b> An admin records every check before a badge shows.</div>` : ""}<label class="flab" for="tjName">Full name</label><input class="input" id="tjName" value="${app ? esc(app.name) : ""}" ${app ? "disabled" : ""}><label class="flab" for="tjPhone" style="margin-top:12px">Phone (WhatsApp)</label><input class="input" id="tjPhone" type="tel" value="${app ? esc(app.phone) : ""}" ${app ? "disabled" : ""}><label class="flab" for="tjSubj" style="margin-top:12px">Subject</label><select class="input" id="tjSubj" ${app ? "disabled" : ""}>${[...new Set(PF_TUTORS.flatMap((t) => t.subjects))].map((s) => `<option${app && app.subject === s ? " selected" : ""}>${s}</option>`).join("")}</select><label class="flab" for="tjRate" style="margin-top:12px">Rate (KES 350–600)</label><input class="input" id="tjRate" type="number" min="350" max="600" value="${app ? esc(app.rate) : "450"}" ${app ? "disabled" : ""}>${app ? "" : `<button class="btn btn-lime btn-block" id="tjSubmit" style="margin-top:18px">${ic("i-send", "sm")} Submit application</button>`}</div><div class="card"><span class="eyebrow">Verification checklist</span><h3 style="font-size:18px;margin:8px 0 4px">What reviewers check</h3>${cl.map(([i2, ttl, d], i) => `<div class="checkrow"><span class="ck ${app ? (i < 1 ? "done" : "wait") : ""}">${app && i < 1 ? "✓" : "…"}</span><div style="min-width:0;flex:1"><b style="font-size:14.5px;color:var(--pine3)">${ttl}</b><p class="tiny muted">${d}</p></div><span class="chip ${app ? (i < 1 ? "green" : "amber") : ""}">${app ? (i < 1 ? "Received" : "In review") : "Required"}</span></div>`).join("")}<div class="alert-mock" style="margin-top:14px">Review ~5 working days. Tutors appear once identity + TSC clear.</div></div></div>`;
  if (!app)
    $("#tjSubmit").addEventListener("click", () => {
      const name = $("#tjName").value.trim(),
        phone = $("#tjPhone").value.trim();
      if (!name || !phone) {
        toast("Add name and phone", "i-info");
        return;
      }
      S.tutorApp = { name, phone, subject: $("#tjSubj").value, rate: $("#tjRate").value || 450, ts: Date.now() };
      save();
      renderTutors();
      toast("Application submitted", "i-check");
    });
}

/* ---------- page boot ---------- */
const qp = new URLSearchParams(location.search);
if (qp.get("subject")) S._tutorSubject = qp.get("subject");
if (qp.get("tab")) S.tutTab = qp.get("tab");
renderTutors();
reveal();
