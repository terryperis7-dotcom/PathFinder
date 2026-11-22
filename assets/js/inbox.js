/* ============================================================
   Inbox + scheduled sessions + reporting people.

   Shared by the learner and the tutor. A "thread" is one conversation with
   another person:
     • a booking thread — S.msgs[bookingId], the moderated chat that already
       exists between a learner and their tutor;
     • a team thread — S.threads[], the admin's messaging threads, seen from
       the other side. The admin writes in Messaging, the learner or tutor
       reads and replies right here.

   Reporting is one function for both directions (learner → tutor and tutor →
   learner). A report always reaches the admin safety queue, is never anonymous
   to the admin, and a restricted account can read but not send until an admin
   lifts the restriction.

   Nothing here invents data: every row comes from a booking, a message or a
   report that something real created.
   ============================================================ */

/* ---------- who am I ---------- */
function meName() {
  return (typeof SESSION !== "undefined" && SESSION && SESSION.name) || (S.profile && S.profile.name) || "Guest";
}
function meRole() {
  return typeof SESSION !== "undefined" && SESSION && SESSION.role ? SESSION.role : "student";
}
function myTutorId() {
  return (typeof SESSION !== "undefined" && SESSION && SESSION.tutorId) || "";
}
/* My bookings: a learner sees the ones they made, a tutor sees the ones sent to
   them. Guest learners see local `mine` rows, which is what the demo writes. */
function myBookings() {
  const all = Array.isArray(S.bookings) ? S.bookings : [];
  if (meRole() === "tutor") {
    const tid = myTutorId();
    return all.filter((b) => (tid ? b.tutorId === tid : b.mine === false));
  }
  const name = meName();
  return all.filter((b) => b.mine || b.learner === name || !b.learner);
}

/* ---------- threads ---------- */
function myThreads() {
  const role = meRole();
  const rows = [];

  /* booking threads */
  myBookings().forEach((b) => {
    const t = (PF_TUTORS || []).find((x) => x.id === b.tutorId);
    if (!t) return;
    const msgs = (S.msgs && S.msgs[b.id]) || [];
    rows.push({
      id: "b" + b.id,
      kind: "booking",
      bookingId: b.id,
      tutorId: t.id,
      name: role === "tutor" ? b.learner || "Learner" : t.name,
      subject: b.subject || "Session",
      meta: b.slot || "",
      status: b.status || "Requested",
      msgs,
      unread: msgs.filter((m) => m.from === (role === "tutor" ? "me" : "tutor") && !m.read).length,
      ts: msgs.length ? msgs[msgs.length - 1].ts : b.ts || 0
    });
  });

  /* team threads written from the admin console */
  (S.threads || [])
    .filter((th) => (role === "tutor" ? th.withRole === "tutor" : th.withRole === "student"))
    .forEach((th) => {
      const msgs = th.msgs || [];
      rows.push({
        id: "t" + th.id,
        kind: "team",
        threadId: th.id,
        name: "PathFinder team",
        subject: th.subject || "Message from the team",
        meta: th.withRole === "tutor" ? "Tutor support" : "Learner support",
        status: "",
        msgs: msgs,
        unread: msgs.filter((m) => msgSide(m, "person") === "them" && !m.read).length,
        ts: msgs.length ? msgs[msgs.length - 1].ts : 0
      });
    });

  return rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
}
const myUnread = () => myThreads().reduce((a, t) => a + t.unread, 0);
const lastOf = (t) => t.msgs[t.msgs.length - 1] || { text: "No messages yet", ts: 0 };

/* ---------- one message, two perspectives ----------
   A team thread is stored once but read from both ends: the admin console and
   the learner/tutor inbox. Rather than duplicating the thread, every message
   carries a side and each viewer maps it:
     "team" / "admin"  → written by PathFinder
     "person" / "me"   → written by the learner or tutor
     "them"            → an older row, whichever side was not the writer
   Keep this in one place or the two inboxes disagree about what is unread. */
function msgSide(m, viewer) {
  if (!m || m.from === "sys") return "sys";
  const f = m.from;
  if (viewer === "admin") return f === "admin" || f === "team" ? "me" : "them";
  return f === "me" || f === "person" ? "me" : "them";
}

/* ---------- restricted accounts ---------- */
function isRestricted(name) {
  const key = String(name || "")
    .toLowerCase()
    .trim();
  if (!key) return null;
  const r = (S.restricted || {})[key];
  return r || null;
}
function restrictAccount(name, reason) {
  S.restricted = S.restricted || {};
  S.restricted[String(name).toLowerCase().trim()] = { name, reason: reason || "", ts: Date.now() };
  save();
}
function unrestrictAccount(key) {
  if (S.restricted) delete S.restricted[key];
  save();
}

/* Shown in place of a composer when the signed-in account is restricted: the
   thread stays readable and the reason is stated once, plainly. */
function restrictedNotice() {
  const me = SESSION ? SESSION.name : "";
  const r = isRestricted(me);
  return `<div class="readonly-row">${ic("i-lock", "sm")} <div><b>You can read this thread but not send.</b>
    <span>${r && r.reason ? "A report is being reviewed: " + esc(r.reason) + "." : "A report about your account is being reviewed."} An admin lifts this — nobody else can.</span></div></div>`;
}

/* ---------- reporting a person (both directions) ---------- */
const REPORT_REASONS = {
  tutor: [
    "Asked for my phone number / socials",
    "Inappropriate or offensive language",
    "Unprofessional behaviour",
    "Missed or cancelled without notice",
    "Asked for payment outside PathFinder",
    "Something else"
  ],
  learner: [
    "Asked me to contact them outside PathFinder",
    "Inappropriate or offensive language",
    "Sending unwanted personal details",
    "Not attending booked sessions",
    "Something else"
  ],
  /* A complaint about PathFinder itself — staff conduct, a message you were
     sent, or a decision you think was wrong. Same queue, different target. */
  team: [
    "A staff message was rude or unhelpful",
    "I was asked for money or personal details",
    "My report or complaint was ignored",
    "A decision about my account was wrong",
    "Something else"
  ]
};
function reportPersonModal(opts) {
  const o = opts || {};
  const kind = o.kind === "learner" || o.kind === "team" ? o.kind : "tutor";
  const target =
    o.name || (kind === "tutor" ? "this tutor" : kind === "learner" ? "this learner" : "the PathFinder team");
  const who = kind === "tutor" ? "tutor" : kind === "learner" ? "learner" : "team";
  openModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
      <span class="tile rose">${ic("i-flag", "lg")}</span>
      <div style="flex:1;min-width:0"><h3 style="font-size:18px">Report ${esc(target)}</h3>
        <p class="tiny muted">Reports go straight to the admin safety queue. The ${who} is not told who reported them.</p></div>
      <button class="modal-x" data-close>${ic("i-x")}</button></div>
    <label class="flab" for="repReason">What happened?</label>
    <select class="input" id="repReason">${REPORT_REASONS[kind].map((r) => `<option>${esc(r)}</option>`).join("")}</select>
    <label class="flab" for="repDetails" style="margin-top:12px">Details (optional)</label>
    <textarea class="input" id="repDetails" rows="3" maxlength="400" placeholder="Briefly describe what happened."></textarea>
    <div class="alert-violet" style="margin-top:12px;font-size:13px">${ic("i-shield", "sm")} An admin reviews every report and can restrict the account immediately. If you are in danger, tell a guardian or call the police first.</div>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-danger" id="repSend" style="margin-left:auto">${ic("i-flag", "sm")} Submit report</button></div>`);
  $("#repSend").addEventListener("click", () => {
    const reason = $("#repReason").value;
    const details = $("#repDetails").value.trim();
    const bad = typeof safetyCheck === "function" ? safetyCheck(details) : [];
    if (bad.length) {
      toast("Remove " + bad.join(", ") + " from the details", "i-info", true);
      return;
    }
    submitReport({
      kind,
      targetId: o.id || "",
      targetName: target,
      bookingId: o.bookingId || "",
      reason,
      details
    });
  });
}
function submitReport(r) {
  S.reports = S.reports || [];
  const row = {
    id: Date.now(),
    kind: r.kind,
    tutorId: r.kind === "tutor" ? r.targetId || "" : "",
    tutor: r.kind === "tutor" ? r.targetName : "",
    learner: r.kind === "learner" ? r.targetName : "",
    targetName: r.targetName,
    targetRole: r.kind,
    bookingId: r.bookingId || "",
    by: meName(),
    byRole: meRole(),
    reason: r.reason,
    details: r.details || "",
    ts: Date.now(),
    status: "open"
  };
  S.reports.unshift(row);
  save();
  if (typeof addNote === "function")
    addNote({
      to: "admin",
      kind: "safety",
      from: meRole() === "tutor" ? "Tutor report" : "Learner report",
      title: "New safety report on " + r.targetName,
      body: r.reason + ". Open the queue to dismiss, restrict or suspend.",
      link: "admin-safety"
    });
  if (sb && sb.enabled && sb.enabled()) queueSync("reports", [{ tutor_id: row.tutorId || null, reason: row.reason }]);
  closeModal();
  toast("Report submitted — the safety team will review it", "i-shield");
  if (typeof renderInbox === "function" && document.getElementById("inboxBox")) renderInbox();
  if (typeof renderMySessions === "function" && document.getElementById("sessionsBox")) renderMySessions();
}

/* ---------- the inbox ---------- */
function inboxHTML() {
  const rows = myThreads();
  const unread = myUnread();
  const role = meRole();
  return `<div class="page-head">
      <div><span class="eyebrow">${role === "tutor" ? "Teaching" : "Support"}</span><h2 class="page-title">Messages</h2>
        <p class="page-sub"><span class="chip ${unread ? "amber" : "green"}">${unread ? unread + " unread" : "All read"}</span>
        <span class="chip">${rows.length} thread${rows.length === 1 ? "" : "s"}</span><span class="chip">${ic("i-shield", "sm")} Filtered</span></p></div>
    </div>
    <div class="alert-violet" style="margin-bottom:14px">${ic("i-shield", "sm")} <b>Every message is filtered.</b> Phone numbers, social handles, links and abusive language are blocked before they are saved, and the attempt is logged. Chats about a booking stay attached to that booking.</div>
    ${
      rows.length
        ? `<div class="inbox">${rows
            .map((t) => {
              const last = lastOf(t);
              return `<article class="inbox-row${t.unread ? " unread" : ""}">
                <span class="inbox-av">${t.kind === "team" ? ic("i-shield", "lg") : esc(initials(t.name))}</span>
                <div class="inbox-mid">
                  <div class="inbox-top"><b>${esc(t.name)}</b>${t.kind === "team" ? '<span class="chip lav" style="font-size:9.5px">Team</span>' : ""}${t.status ? `<span class="chip" style="font-size:9.5px">${esc(t.status)}</span>` : ""}${t.unread ? `<span class="chip amber" style="font-size:9.5px">${t.unread} new</span>` : ""}</div>
                  <span class="inbox-sub">${esc(t.subject)}${t.meta ? " · " + esc(t.meta) : ""}</span>
                  <span class="inbox-last">${esc(last.text).slice(0, 110)}</span>
                </div>
                <div class="inbox-acts">
                  <button class="btn btn-line btn-sm" data-thread-open="${esc(t.id)}">${ic("i-chat", "sm")} Open</button>
                  <button class="btn btn-ghost btn-sm" data-report-row="${esc(t.id)}" aria-label="Report ${esc(t.kind === "team" ? "the PathFinder team" : t.name)}" title="Report">${ic("i-flag", "sm")}</button>
                </div>
              </article>`;
            })
            .join("")}</div>`
        : `<div class="empty">${ic("i-chat")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:6px">No messages yet</b>
            <p class="small" style="max-width:420px;margin:0 auto 16px">A thread appears the moment you ${role === "tutor" ? "accept a learner's request" : "request a session"}, or when the PathFinder team writes to you.</p>
            <button class="btn btn-lime" data-nav="${role === "tutor" ? "tutor-students" : "tutors"}">${role === "tutor" ? "See my students" : "Find a tutor"}</button></div>`
    }`;
}
function renderInbox() {
  const box = $("#inboxBox");
  if (!box) return;
  box.innerHTML = inboxHTML();
  wireInbox(box);
  reveal();
}
function wireInbox(box) {
  $$("[data-thread-open]", box).forEach((b) =>
    b.addEventListener("click", () => {
      const th = myThreads().find((x) => x.id === b.dataset.threadOpen);
      if (!th) return;
      openMyThread(th);
      /* the thread marked itself read on open — repaint the list behind it */
      box.innerHTML = inboxHTML();
      wireInbox(box);
    })
  );
  $$("[data-report-row]", box).forEach((b) =>
    b.addEventListener("click", () => {
      const th = myThreads().find((x) => x.id === b.dataset.reportRow);
      if (!th) return;
      if (th.kind === "team") {
        reportPersonModal({ kind: "team", name: "the PathFinder team", bookingId: "" });
        return;
      }
      reportPersonModal({
        kind: meRole() === "tutor" ? "learner" : "tutor",
        id: th.tutorId,
        name: th.name,
        bookingId: th.bookingId
      });
    })
  );
}

/* One thread, whichever kind it is. Booking threads reuse openChat() so the
   learner and the tutor see the same moderated conversation as everywhere else. */
function openMyThread(th) {
  if (th.kind === "booking") return openChat(th.bookingId, meRole() === "tutor" ? "tutor" : "learner");
  const s = (S.threads || []).find((x) => x.id === th.threadId);
  if (!s) return;
  s.msgs.forEach((m) => {
    if (msgSide(m, "person") === "them") m.read = true;
  });
  save();
  const paint = () =>
    s.msgs
      .map(
        (m) =>
          `<div class="msg ${msgSide(m, "person") === "them" ? "tutor" : "me"}">${esc(m.text)}<small>${msgSide(m, "person") === "them" ? "PathFinder team" : "You"} · ${new Date(m.ts).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></div>`
      )
      .join("") || `<p class="tiny muted" style="text-align:center;padding:18px 0">No messages yet.</p>`;
  openModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
      <span class="tile lav">${ic("i-shield", "lg")}</span>
      <div style="flex:1;min-width:0"><h3 style="font-size:17px">PathFinder team</h3>
        <p class="tiny muted">${esc(s.subject || "Message from the team")}</p></div>
      <button class="modal-x" data-close>${ic("i-x")}</button></div>
    <div class="chat-msgs" id="teamMsgs" style="max-height:44vh">${paint()}</div>
    ${
      isRestricted(meName())
        ? restrictedNotice()
        : `<div class="chat-input"><textarea class="input" id="teamText" rows="2" maxlength="400" placeholder="Write a reply…" aria-label="Reply"></textarea>
      <button class="btn btn-lime" id="teamSend">${ic("i-send", "sm")} Send</button></div>`
    }`);
  const send = () => {
    if (!$("#teamText")) return; /* restricted — the composer is not there */
    const text = $("#teamText").value.trim();
    if (!text) return;
    const restricted = isRestricted(meName());
    if (restricted) {
      toast("Your account is restricted while a report is reviewed — you can read but not send", "i-shield", true);
      return;
    }
    const bad = typeof safetyCheck === "function" ? safetyCheck(text) : [];
    if (bad.length) {
      S.safetyLog = S.safetyLog || [];
      S.safetyLog.unshift({
        ts: Date.now(),
        by: meName(),
        tutor: "PathFinder team",
        text: text.slice(0, 80),
        reasons: bad
      });
      save();
      toast("Blocked: " + bad.join(", ") + " — keep it on PathFinder", "i-shield", true);
      return;
    }
    s.msgs.push({ id: "m" + Date.now(), from: "person", text, ts: Date.now(), read: true });
    save();
    if (typeof addNote === "function")
      addNote({
        to: "admin",
        kind: "message",
        from: meRole() === "tutor" ? "Tutor" : "Learner",
        title: "New reply from " + meName(),
        body: text.slice(0, 90),
        link: "admin-messages"
      });
    $("#teamMsgs").innerHTML = paint();
    $("#teamText").value = "";
    const box2 = $("#teamMsgs");
    if (box2) box2.scrollTop = box2.scrollHeight;
    renderInbox();
    toast("Sent to the PathFinder team", "i-send");
  };
  if ($("#teamSend")) $("#teamSend").addEventListener("click", send);
  if ($("#teamText"))
    $("#teamText").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
}

/* ---------- scheduled sessions (the learner's side) ---------- */
function sessionCards() {
  const role = meRole();
  return myBookings()
    .slice()
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .map((b) => {
      const t = (PF_TUTORS || []).find((x) => x.id === b.tutorId) || { name: b.tutor || "Tutor", rate: 450 };
      const msgs = (S.msgs && S.msgs[b.id]) || [];
      const unread = msgs.filter((m) => m.from === "tutor" && !m.read).length;
      const review = (S.reviews || []).find((r) => r.bookingId === b.id);
      const tone =
        b.status === "Confirmed"
          ? "green"
          : b.status === "Declined"
            ? "red"
            : b.status === "Completed"
              ? "lav"
              : "amber";
      return `<article class="sess-card">
        <div class="sess-top">
          <span class="inbox-av">${esc(initials(role === "tutor" ? b.learner || "L" : t.name))}</span>
          <div style="flex:1;min-width:0">
            <div class="inbox-top"><b>${esc(b.subject || "Session")}</b><span class="chip ${tone}" style="font-size:9.5px">${esc(b.status || "Requested")}</span>
              ${unread ? `<span class="chip lime" style="font-size:9.5px">${unread} new</span>` : ""}</div>
            <span class="inbox-sub">${role === "tutor" ? esc(b.learner || "Learner") : esc(t.name)} · ${esc(b.slot || "Slot TBC")} · ${esc(b.mode || "Online")}</span>
          </div>
        </div>
        ${b.note ? `<p class="tiny muted" style="margin-top:6px">“${esc(b.note)}”</p>` : ""}
        <div class="tutor-actions">
          <button class="btn btn-dark btn-sm" data-chat="${b.id}" data-side="${role === "tutor" ? "tutor" : "learner"}">${ic("i-chat", "sm")} ${unread ? "Reply" : "Chat"}</button>
          ${role === "student" && b.status === "Requested" ? `<button class="btn btn-ghost btn-sm" data-resched="${b.id}">${ic("i-refresh", "sm")} Change slot</button>` : ""}
          ${role === "student" && b.status === "Completed" ? `<button class="btn btn-lime btn-sm" data-review="${b.id}">${ic("i-star", "sm")} ${review ? "Your rating: ★" + review.stars : "Leave a review"}</button>` : ""}
          <button class="btn btn-ghost btn-sm" data-sess-report="${b.id}">${ic("i-flag", "sm")} Report</button>
        </div>
      </article>`;
    });
}
function renderMySessions() {
  const box = $("#sessionsBox");
  if (!box) return;
  const role = meRole();
  const all = myBookings();
  const conf = all.filter((b) => b.status === "Confirmed").length;
  const pend = all.filter((b) => !b.status || b.status === "Requested").length;
  const done = all.filter((b) => b.status === "Completed").length;
  const cards = sessionCards();
  box.innerHTML = `<div class="page-head">
      <div><span class="eyebrow">${role === "tutor" ? "Teaching" : "Plan"}</span><h2 class="page-title">Scheduled sessions</h2>
        <p class="page-sub"><span class="chip lime">${conf} confirmed</span><span class="chip amber">${pend} waiting</span><span class="chip">${done} completed</span></p></div>
      <div class="page-acts"><button class="btn btn-lime btn-sm" data-nav="${role === "tutor" ? "tutor-students" : "tutors"}">${ic("i-cal", "sm")} ${role === "tutor" ? "Open requests" : "Book another session"}</button></div>
    </div>
    <div class="alert-mock" style="margin-bottom:14px">${ic("i-info", "sm")} Slots are the weekly windows the tutor published, so “Sat · 9:00–11:00” means every Saturday. Nothing is charged in this pilot — the fee shown is the published rate for a two-hour slot.</div>
    ${
      cards.length
        ? `<div class="sess-grid">${cards.join("")}</div>`
        : `<div class="empty">${ic("i-cal")}<b style="display:block;color:var(--pine3);font-family:var(--font-d);margin-bottom:6px">No sessions yet</b>
        <p class="small" style="max-width:420px;margin:0 auto 16px">${role === "tutor" ? "Accept a request and the session appears here." : "Request a session with a verified tutor and track it here."}</p>
        <button class="btn btn-lime" data-nav="${role === "tutor" ? "tutor-students" : "tutors"}">${role === "tutor" ? "See requests" : "Find a tutor"}</button></div>`
    }`;
  wireSessionBox($("#sessionsBox"));
  reveal();
}

/* Shared wiring for anything that renders session cards (this page and the
   tutors/students pages use the same handlers). */
function wireSessionBox(box) {
  if (!box) return;
  $$("[data-chat]", box).forEach((b) =>
    b.addEventListener("click", () => openChat(b.dataset.chat, b.dataset.side || "learner"))
  );
  $$("[data-sess-report]", box).forEach((b) =>
    b.addEventListener("click", () => {
      const bk = S.bookings.find((x) => String(x.id) === String(b.dataset.sessReport));
      if (!bk) return;
      const t = (PF_TUTORS || []).find((x) => x.id === bk.tutorId);
      if (meRole() === "tutor") reportPersonModal({ kind: "learner", name: bk.learner || "Learner", bookingId: bk.id });
      else reportPersonModal({ kind: "tutor", id: bk.tutorId, name: t ? t.name : "Tutor", bookingId: bk.id });
    })
  );
}

/* Small, defensive counters the sidebar asks for. They must never throw on a
   page that loads the shell before any thread exists. */
function myUnreadCount() {
  try {
    return myUnread();
  } catch (e) {
    return 0;
  }
}
function myConfirmedCount() {
  try {
    return myBookings().filter((b) => b.status === "Confirmed").length;
  } catch (e) {
    return 0;
  }
}
