/* ============================================================
   Chat + report — shared by the learner directory and the tutor workspace.
   Both roles open the same moderated thread; the safety filter in safety.js
   runs before anything is appended, and the only difference is which side the
   messages are laid out on.
   ============================================================ */

function reportModal(tid) {
  const t = PF_TUTORS.find((x) => x.id === tid);
  if (!t) return;
  openModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">${tutorAvatar(t, 44)}<div style="flex:1;min-width:0"><h3 style="font-size:18px">Report ${esc(t.name.split(" ")[0])}</h3><p class="tiny muted">Reports go straight to the admin safety queue. Your identity stays private.</p></div><button class="modal-x" data-close>${ic("i-x")}</button></div>
  <label class="flab" for="repReason">What happened?</label>
  <select class="input" id="repReason"><option>Asked for my phone number / socials</option><option>Inappropriate or offensive language</option><option>Unprofessional behaviour</option><option>Missed or cancelled without notice</option><option>Asked for payment outside PathFinder</option><option>Other</option></select>
  <label class="flab" for="repDetails" style="margin-top:12px">Details (optional)</label>
  <textarea class="input" id="repDetails" rows="3" placeholder="Briefly describe what happened…"></textarea>
  <div class="alert-violet" style="margin-top:12px;font-size:13px">${ic("i-shield", "sm")} An admin can suspend this tutor immediately. If you are in danger, contact a guardian or the police first.</div>
  <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-danger" id="repSend" style="margin-left:auto">${ic("i-flag", "sm")} Submit report</button></div>`);
  $("#repSend").addEventListener("click", () => {
    if (typeof addNote === "function")
      addNote({
        to: "admin",
        kind: "safety",
        from: "Learner report",
        title: "New safety report on " + t.name,
        body: $("#repReason").value + ". Open the queue to dismiss or suspend.",
        link: "admin-safety"
      });
    S.reports.unshift({
      id: Date.now(),
      tutorId: t.id,
      tutor: t.name,
      by: SESSION ? SESSION.name : "Guest learner",
      reason: $("#repReason").value,
      details: $("#repDetails").value.trim(),
      ts: Date.now(),
      status: "open"
    });
    if (sb.enabled()) queueSync("reports", [{ tutor_id: t.id, reason: $("#repReason").value }]);
    save();
    closeModal();
    toast("Report submitted — the safety team will review it", "i-shield");
  });
}

function openChat(bid, side = "learner") {
  const b = S.bookings.find((x) => x.id === bid);
  if (!b) return;
  const t = PF_TUTORS.find((x) => x.id === b.tutorId);
  if (!t) return;
  const paint = () => {
    const msgs = S.msgs[bid] || [];
    $("#chatMsgs").innerHTML =
      msgs
        .map((m) => {
          if (m.from === "sys") return `<div class="msg sys">${ic("i-shield", "sm")} ${esc(m.text)}</div>`;
          const mineSide = side === "tutor" ? m.from === "tutor" : m.from === "me";
          const who = m.from === "tutor" ? t.name.split(" ")[0] : (b.learner || "Learner").split(" ")[0];
          return `<div class="msg ${mineSide ? "me" : "tutor"}">${esc(m.text)}<small>${esc(who)} · ${new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div>`;
        })
        .join("") || `<p class="tiny muted" style="text-align:center;padding:20px 0">Say hello.</p>`;
    $("#chatMsgs").scrollTop = $("#chatMsgs").scrollHeight;
  };
  openModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">${tutorAvatar(t, 42)}<div style="flex:1;min-width:0"><h3 style="font-size:17px">${side === "tutor" ? esc(b.learner || "Learner") : esc(t.name)}</h3><p class="tiny muted">${esc(b.subject)} · ${esc(b.slot)} · <span class="status-pill ${b.status === "Confirmed" ? "conf" : b.status === "Declined" ? "dec" : "req"}" style="font-size:10.5px;padding:2px 8px">${b.status}</span></p></div>${side === "learner" ? `<button class="btn btn-ghost btn-sm" data-chat-report title="Report tutor">${ic("i-flag", "sm")}</button>` : ""}<button class="modal-x" data-close>${ic("i-x")}</button></div>
  <div class="alert-mock" style="margin-bottom:10px;font-size:12px">${ic("i-shield", "sm")} For your safety, messages are filtered — phone numbers, social handles and abusive language are blocked, and all chats are logged.</div>
  <div class="chat-box"><div class="chat-msgs" id="chatMsgs"></div><div class="quick-chips" id="chatQuick">${side === "tutor" ? `<button data-q="Hi! Received your request — checking my schedule.">Acknowledge</button><button data-q="Please attempt questions 1–5 before we meet.">Assign prep</button>` : `<button data-q="Hello! Looking forward to the session.">Say hello</button><button data-q="Can we focus on past papers?">Past papers</button><button data-q="What should I revise?">What to revise?</button>`}</div><div class="chat-input"><input class="input" id="chatText" placeholder="Type a message…" autocomplete="off"><button class="send-btn" id="chatSend">${ic("i-send")}</button></div></div>`);
  const cr = $("[data-chat-report]");
  if (cr)
    cr.addEventListener("click", () => {
      closeModal();
      reportModal(t.id);
    });
  paint();
  const send = (txt) => {
    txt = (txt || "").trim();
    if (!txt) return;
    const reasons = safetyCheck(txt);
    if (reasons.length) {
      S.msgs[bid] = S.msgs[bid] || [];
      if (typeof addNote === "function")
        addNote({
          to: "student",
          kind: "safety",
          from: "Safeguarding",
          title: "A message was blocked",
          body: "It contained " + reasons.join(", ") + ". Nothing was sent and the attempt is logged.",
          link: "tutors"
        });
      S.msgs[bid].push({
        from: "sys",
        text: `Message not sent — it contained: ${reasons.join(", ")}. Contact outside PathFinder is not allowed.`,
        ts: Date.now()
      });
      S.safetyLog.push({
        ts: Date.now(),
        by: SESSION ? SESSION.name : "Guest",
        tutor: t.name,
        text: txt.slice(0, 80),
        reasons
      });
      save();
      paint();
      toast("Blocked: " + reasons.join(", ") + " — keep chats on PathFinder", "i-shield", true);
      return;
    }
    S.msgs[bid] = S.msgs[bid] || [];
    S.msgs[bid].push({ from: side === "tutor" ? "tutor" : "me", text: txt, ts: Date.now() });
    save();
    paint();
    $("#chatText").value = "";
    setTimeout(() => {
      const r =
        side === "tutor"
          ? ["Got it — noted.", "Asante! See you then."]
          : ["Okay, thank you!", "Noted — I'll do that.", "Great, see you then."];
      S.msgs[bid].push({
        from: side === "tutor" ? "me" : "tutor",
        text: r[Math.floor(Math.random() * r.length)],
        ts: Date.now()
      });
      save();
      if ($("#chatMsgs")) paint();
    }, 1600);
  };
  $("#chatSend").addEventListener("click", () => send($("#chatText").value));
  $("#chatText").addEventListener("keydown", (e) => {
    if (e.key === "Enter") send($("#chatText").value);
  });
  $$("#chatQuick [data-q]").forEach((q) => q.addEventListener("click", () => send(q.dataset.q)));
}
