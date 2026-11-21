/* ============================================================
   Notifications — the bell in the top bar.
   One inbox per role for messages, decisions, safety alerts and
   reminders. Notes live in state (localStorage) so they survive a
   reload and follow the role you are signed in as. Anything seeded
   is marked DEMO and says so in the row; anything created by a real
   action in the app is marked live. Nothing here invents a count.
   ============================================================ */

const NOTE_KIND = {
  message: { icon: "i-chat", tone: "lav", label: "Message" },
  request: { icon: "i-cal", tone: "sky", label: "Request" },
  safety: { icon: "i-shield", tone: "rose", label: "Safety" },
  result: { icon: "i-spark", tone: "vio", label: "Result" },
  funding: { icon: "i-coins", tone: "peach", label: "Funding" },
  system: { icon: "i-info", tone: "mint", label: "System" }
};

const noteRole = () => (SESSION ? SESSION.role : "guest");
const noteKind = (k) => NOTE_KIND[k] || NOTE_KIND.system;

function ago(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return Math.round(s / 60) + " min ago";
  if (s < 86400) return Math.round(s / 3600) + " hr ago";
  if (s < 604800) return Math.round(s / 86400) + " d ago";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* to: "student" | "tutor" | "admin" | "all" */
function addNote(o) {
  S.notes = S.notes || [];
  const n = {
    id: "n" + Date.now() + Math.random().toString(36).slice(2, 5),
    to: o.to || "all",
    kind: o.kind || "system",
    from: o.from || "PathFinder",
    title: o.title || "Notification",
    body: o.body || "",
    link: o.link || "",
    ts: Date.now(),
    read: false,
    demo: false
  };
  S.notes.unshift(n);
  S.notes = S.notes.slice(0, 60);
  save();
  if (typeof push === "function") push("note", n);
  paintBell();
  if (!$("#notifPop") || $("#notifPop").hidden) return n;
  paintNotif(); /* panel open → keep it current */
  return n;
}

function notesFor(role) {
  const r = role || noteRole();
  return (S.notes || []).filter((n) => n.to === "all" || n.to === r).sort((a, b) => b.ts - a.ts);
}
const unreadFor = (role) => notesFor(role).filter((n) => !n.read).length;

/* ---------- bell + panel ---------- */
function renderBell(host) {
  const bar = host || $(".topbar");
  if (!bar || bar.querySelector("#notifWrap")) return;
  if (!$("#notifWrap")) {
    const wrap = document.createElement("div");
    wrap.className = "notif-wrap";
    wrap.id = "notifWrap";
    wrap.innerHTML = `<button type="button" class="notif-btn" id="notifBtn" aria-label="Notifications" aria-expanded="false" aria-controls="notifPop">${ic("i-bell")}<span class="notif-badge" id="notifBadge" hidden></span></button>
      <div class="notif-pop" id="notifPop" hidden role="dialog" aria-label="Notifications"></div>`;
    const chip = $("#userChip", bar);
    bar.insertBefore(wrap, chip && chip.parentNode === bar ? chip : null);
    $("#notifBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleNotif($("#notifPop").hidden);
    });
    $("#notifPop").addEventListener("click", notifClick);
    $("#notifPop").addEventListener("keydown", notifKey);
    /* No outside-click dismissal on purpose: the panel stays open until the
       person closes it, so a long list cannot vanish mid-read on a phone. */
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#notifPop") && !$("#notifPop").hidden) toggleNotif(false);
    });
  }
  paintBell();
}

function paintBell() {
  const b = $("#notifBadge"),
    btn = $("#notifBtn");
  if (!b || !btn) return;
  const n = unreadFor();
  b.hidden = n === 0;
  b.textContent = n > 9 ? "9+" : String(n);
  btn.classList.toggle("has-unread", n > 0);
  btn.setAttribute("aria-label", n ? `Notifications, ${n} unread` : "Notifications");
}

function toggleNotif(open) {
  const pop = $("#notifPop"),
    btn = $("#notifBtn");
  if (!pop) return;
  pop.hidden = !open;
  if (btn) btn.setAttribute("aria-expanded", String(!!open));
  if (open) paintNotif();
}

const NOTIF_FILTER = { key: "all" };

function paintNotif() {
  const pop = $("#notifPop");
  if (!pop) return;
  const role = noteRole();
  const all = notesFor(role);
  const unread = all.filter((n) => !n.read).length;
  const rows = NOTIF_FILTER.key === "unread" ? all.filter((n) => !n.read) : all;
  const canCompose = role === "admin";

  pop.innerHTML = `
    <div class="np-head">
      <b>Notifications</b>
      ${unread ? `<span class="chip lav" style="font-size:10px">${unread} new</span>` : `<span class="chip" style="font-size:10px">All read</span>`}
      <button type="button" class="np-x" data-note-close aria-label="Close notifications">${ic("i-x", "sm")}</button>
    </div>
    <div class="np-tabs">
      <button type="button" class="np-tab${NOTIF_FILTER.key === "all" ? " on" : ""}" data-note-filter="all">All ${all.length}</button>
      <button type="button" class="np-tab${NOTIF_FILTER.key === "unread" ? " on" : ""}" data-note-filter="unread">Unread ${unread}</button>
    </div>
    <div class="np-list">
      ${
        rows.length
          ? rows
              .map((n) => {
                const k = noteKind(n.kind);
                return `<div class="nitem${n.read ? "" : " unread"}" data-note="${esc(n.id)}" role="button" tabindex="0" aria-label="${esc(n.title)}">
          <span class="ntile ${k.tone}">${ic(k.icon)}</span>
          <span class="nmain">
            <span class="nrow"><b>${esc(n.title)}</b>${n.demo ? `<span class="ndemo">DEMO</span>` : ""}</span>
            <span class="nbody">${esc(n.body)}</span>
            <span class="nmeta">${esc(n.from)} · ${esc(ago(n.ts))}</span>
          </span>
          ${n.read ? "" : `<span class="ndot" aria-hidden="true"></span>`}
          <button type="button" class="ndel" data-note-del="${esc(n.id)}" aria-label="Delete this notification" title="Delete">${ic("i-x", "sm")}</button>
        </div>`;
              })
              .join("")
          : `<div class="np-empty">${ic("i-inbox")}<b>Nothing here yet</b><span>${NOTIF_FILTER.key === "unread" ? "You have read everything." : "Messages, decisions and safety alerts land here."}</span></div>`
      }
    </div>
    <div class="np-foot">
      <span class="np-kept">${sb.enabled() ? "Synced account" : "Kept on this device"}</span>
      <div class="np-acts">
        ${canCompose ? `<button type="button" class="np-link" data-note-compose>${ic("i-send", "sm")} Announce</button>` : ""}
        <button type="button" class="np-link" data-note-read-all ${unread ? "" : "disabled"}>Mark all read</button>
        <button type="button" class="np-link danger" data-note-clear ${rows.length ? "" : "disabled"}>${ic("i-x", "sm")} Clear</button>
      </div>
    </div>`;
}

function notifClick(e) {
  const t = e.target;
  if (t.closest("[data-note-close]")) {
    toggleNotif(false);
    return;
  }
  const del = t.closest("[data-note-del]");
  if (del) {
    e.stopPropagation();
    removeNotes([del.dataset.noteDel]);
    return;
  }
  if (t.closest("[data-note-clear]")) {
    clearNotif();
    return;
  }
  if (t.closest("[data-note-read-all]")) {
    notesFor().forEach((n) => {
      n.read = true;
    });
    save();
    paintBell();
    paintNotif();
    return;
  }
  if (t.closest("[data-note-compose]")) {
    toggleNotif(false);
    noteComposer();
    return;
  }
  const f = t.closest("[data-note-filter]");
  if (f) {
    NOTIF_FILTER.key = f.dataset.noteFilter;
    paintNotif();
    return;
  }
  const item = t.closest("[data-note]");
  if (item) {
    const n = notesFor().find((x) => x.id === item.dataset.note);
    if (!n) return;
    n.read = true;
    save();
    paintBell();
    if (n.link) {
      toggleNotif(false);
      go(n.link);
    } else paintNotif();
  }
}

/* ---------- deleting ----------
   Deleting removes the note from this device only (and from state, so it does
   not come back). Seeded and real rows are treated the same, and the count in
   the bell drops immediately. */
function removeNotes(ids) {
  const gone = new Set(ids.map(String));
  S.notes = (S.notes || []).filter((n) => !gone.has(String(n.id)));
  save();
  paintBell();
  paintNotif();
}

function clearNotif() {
  const rows = notesFor();
  if (!rows.length) return;
  openModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
      <span class="tile rose">${ic("i-bell", "lg")}</span>
      <div style="flex:1;min-width:0"><h3 style="font-size:18px">Clear your notifications?</h3>
        <p class="tiny muted">${rows.length} ${rows.length === 1 ? "notification" : "notifications"} will be deleted from this device. Messages, decisions and reports themselves are not deleted.</p></div>
      <button class="modal-x" data-close>${ic("i-x")}</button></div>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-ghost" data-close>Keep them</button>
      <button class="btn btn-danger" id="noteClearYes" style="margin-left:auto">${ic("i-x", "sm")} Delete ${rows.length}</button></div>`);
  $("#noteClearYes").addEventListener("click", () => {
    removeNotes(rows.map((n) => n.id));
    closeModal();
    toast("Notifications cleared", "i-check");
  });
}

/* Enter / Space open a note, like a button would. */
function notifKey(e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  const item = e.target.closest && e.target.closest("[data-note]");
  if (!item) return;
  e.preventDefault();
  item.click();
}

/* Admins can send an announcement into the inbox of any group. It is a
   local demo, so the note says where it came from and who it reached. */
function noteComposer() {
  openModal(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><span class="tile lav">${ic("i-bell", "lg")}</span>
      <div style="flex:1;min-width:0"><h3 style="font-size:18px">Send an announcement</h3><p class="tiny muted">Lands in the bell of every matching account on this device.</p></div>
      <button class="modal-x" data-close>${ic("i-x")}</button></div><div class="divider"></div>
    <label class="flab" for="anTo">Who gets it</label>
    <select class="input" id="anTo"><option value="all">Everyone</option><option value="student">Students</option><option value="tutor">Tutors</option><option value="admin">Admins</option></select>
    <label class="flab" for="anTitle" style="margin-top:12px">Title</label>
    <input class="input" id="anTitle" maxlength="60" placeholder="e.g. HELB applications open Monday">
    <label class="flab" for="anBody" style="margin-top:12px">Message</label>
    <textarea class="input" id="anBody" rows="3" maxlength="180" placeholder="One or two sentences — no phone numbers or links to unofficial portals."></textarea>
    <div class="alert-violet" style="margin-top:12px;font-size:13px">${ic("i-info", "sm")} Announcements are stored on this device only. Connect Supabase to deliver them for real.</div>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-lime" id="anSend" style="margin-left:auto">${ic("i-send", "sm")} Send</button></div>`);
  $("#anSend").addEventListener("click", () => {
    const title = $("#anTitle").value.trim(),
      body = $("#anBody").value.trim();
    if (!title || !body) {
      toast("Add a title and a message", "i-info");
      return;
    }
    const to = $("#anTo").value;
    addNote({
      to,
      title,
      body,
      kind: "message",
      from: "Administrator · " + (SESSION ? SESSION.name.split(" ")[0] : "Admin"),
      link: ""
    });
    closeModal();
    toast("Announcement sent to " + (to === "all" ? "everyone" : to + "s"), "i-send");
    toggleNotif(true);
  });
}

/* ---------- seeded demo rows ----------
   Clearly labelled, no counts that could fall out of date, and only
   added once per device. */
function seedNotes() {
  if (S.notesSeeded) return;
  const now = Date.now(),
    H = 36e5,
    D = 864e5;
  const demo = [
    {
      to: "student",
      kind: "system",
      from: "PathFinder team",
      title: "Karibu — your plan starts here",
      body: "Add your grades, then take the 6-question career check. Everything you enter stays on this device.",
      link: "quiz",
      ts: now - 2 * H
    },
    {
      to: "student",
      kind: "message",
      from: "Tutor · Brian Otieno",
      title: "Two evening slots opened for Physics",
      body: "Tue and Thu, 7–9 PM, online. Requests go through the app — contact details stay hidden.",
      link: "tutors",
      ts: now - 5 * H
    },
    {
      to: "student",
      kind: "funding",
      from: "HELB",
      title: "Loan applications usually open in January",
      body: "We track the official portal and link you straight to it. No agents, no fees.",
      link: "funding",
      ts: now - 26 * H
    },
    {
      to: "tutor",
      kind: "system",
      from: "PathFinder review",
      title: "Verification is part-way done",
      body: "Your TSC and ID records are in. Conduct and safeguarding checks decide whether badges show to learners.",
      link: "tutor-profile",
      ts: now - 3 * H
    },
    {
      to: "tutor",
      kind: "safety",
      from: "Safeguarding",
      title: "Messages are filtered before sending",
      body: "Phone numbers, social handles and abusive language are blocked automatically and logged. That protects you too.",
      link: "tutor-students",
      ts: now - 9 * H
    },
    {
      to: "tutor",
      kind: "message",
      from: "Administrator · Terry",
      title: "Keep your availability current",
      body: "Learners can only request the slots you have opened. Update them from Availability.",
      link: "tutor-schedule",
      ts: now - 2 * D
    },
    {
      to: "admin",
      kind: "system",
      from: "Console",
      title: "How the counts work",
      body: "Every number on the console is read from this browser's state. Seeded rows carry a DEMO label — nothing is dressed up as real.",
      link: "admin-data",
      ts: now - 4 * H
    },
    {
      to: "admin",
      kind: "safety",
      from: "Safety queue",
      title: "Reports arrive here first",
      body: "A learner report names the tutor and the reason. You can suspend immediately; the learner sees the outcome, not your identity.",
      link: "admin-safety",
      ts: now - 20 * H
    }
  ];
  S.notes = (S.notes || []).concat(demo.map((n, i) => Object.assign({ id: "seed" + i, read: false, demo: true }, n)));
  S.notesSeeded = true;
  save();
}
