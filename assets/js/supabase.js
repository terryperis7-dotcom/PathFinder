/* Supabase layer: auth calls, REST upserts and the offline sync queue.
   Everything is inert while supabase-config.js holds empty values. */
/* ---------- Supabase ---------- */
const sb = {
  enabled: () => !!(SUPABASE.url && SUPABASE.anonKey),
  live: () => !!(SUPABASE.url && SUPABASE.anonKey && typeof SESSION !== "undefined" && SESSION && SESSION.token),
  authHeaders() {
    return { apikey: SUPABASE.anonKey, "Content-Type": "application/json" };
  },
  restHeaders(t) {
    return { apikey: SUPABASE.anonKey, Authorization: "Bearer " + t, "Content-Type": "application/json" };
  },
  async signUp(e, p, m) {
    const r = await fetch(SUPABASE.url + "/auth/v1/signup", {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({ email: e, password: p, data: m })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.msg || j.error_description || "Sign up failed");
    return j;
  },
  async signIn(e, p) {
    const r = await fetch(SUPABASE.url + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({ email: e, password: p })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.msg || "Sign in failed");
    return j;
  },
  signOut(t) {
    return fetch(SUPABASE.url + "/auth/v1/logout", { method: "POST", headers: this.restHeaders(t) });
  },
  /* Access tokens last an hour. Swap the refresh token for a new pair once. */
  async refresh() {
    if (!SESSION || !SESSION.refresh) return false;
    const r = await fetch(SUPABASE.url + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({ refresh_token: SESSION.refresh })
    });
    if (!r.ok) return false;
    const j = await r.json();
    SESSION.token = j.access_token;
    SESSION.refresh = j.refresh_token;
    store.set("pf-session-v1", SESSION);
    return true;
  },
  /* One door for every table call, so the 401 retry lives in one place. */
  async call(method, path, body, prefer) {
    if (!SESSION || !SESSION.token) throw new Error("Not signed in");
    const go = () =>
      fetch(SUPABASE.url + "/rest/v1/" + path, {
        method,
        headers: { ...this.restHeaders(SESSION.token), ...(prefer ? { Prefer: prefer } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    let r = await go();
    if (r.status === 401 && (await this.refresh())) r = await go();
    if (!r.ok) {
      const e = new Error("Request failed (" + r.status + ")");
      e.status = r.status;
      throw e;
    }
    return r.status === 204 ? null : r.json().catch(() => null);
  },
  select: (path) => sb.call("GET", path),
  insert: (table, rows) => sb.call("POST", table, rows, "return=minimal"),
  patch: (table, filter, row) => sb.call("PATCH", table + "?" + filter, row, "return=minimal"),
  upsert: (table, rows) => sb.call("POST", table, rows, "resolution=merge-duplicates,return=minimal"),
  /* The role always comes from the database, never from the browser. */
  async myProfile(id) {
    const rows = await this.select("profiles?id=eq." + encodeURIComponent(id) + "&select=id,name,email,role,county,suspended");
    return rows && rows[0];
  }
};
function queueSync(t, rows) {
  S.syncQueue.push({ table: t, rows, ts: Date.now() });
  save();
}
/* Send queued rows in order. A row the server rejects for good (4xx other
   than an expired login) is dropped, so one bad row cannot jam the queue. */
async function flushSync() {
  if (!sb.live() || !S.syncQueue.length) return;
  for (const it of [...S.syncQueue]) {
    try {
      await sb.upsert(it.table, it.rows);
    } catch (e) {
      if (!e.status || e.status >= 500 || e.status === 401) break;
    }
    S.syncQueue = S.syncQueue.filter((x) => x !== it);
    save();
  }
}

/* ---------- admin console: live data ----------
   Reads every profile (RLS lets only role = admin do that) and swaps the
   device-local account list for it. Nothing here is written to localStorage. */
async function adminHydrate() {
  const rows = await sb.select("profiles?select=id,name,email,role,county,demo,suspended,created_at&order=created_at.desc");
  ACCOUNTS = (rows || []).map((r) => ({ ...r, live: true }));
  return ACCOUNTS;
}

/* ---------- state → table mapping ----------
   The app works offline first: every mutation is written to localStorage, and
   when Supabase is configured the same change is queued here and flushed in
   order. Column names match supabase/schema.sql exactly, so a queue row is a
   valid PostgREST body. A learner row carries no contact details (there is no
   phone column on purpose) and notifications carry an in-app view key, never a
   URL, so an announcement cannot become a redirect. */
const SB_MAP = {
  booking: (b) =>
    !/^[0-9a-f-]{36}$/i.test(String(b.tutorId || ""))
      ? null
      : {
    tutor_id: b.tutorId,
    subject: b.subject || "Session",
    slot_day: (b.slot || "").split(" ")[0] || null,
    slot_time: (b.slot || "").split(" ").slice(1).join(" ") || null,
    mode: b.mode || null,
    note: b.note || null,
    status: ["Requested", "Confirmed", "Declined", "Completed"].includes(b.status) ? b.status : "Requested"
      },
  message: (m, bookingId) => ({
    booking_id: Number(bookingId),
    body: String(m.text || "").slice(0, 2000),
    blocked: m.from === "sys",
    reason: m.from === "sys" ? String(m.text || "").slice(0, 120) : null
  }),
  note: (n) => ({
    audience: ["student", "tutor", "admin"].includes(n.to) ? n.to : null,
    kind: n.kind || "system",
    sender: n.from || "PathFinder",
    title: n.title || "Notification",
    body: n.body || "",
    link: n.link || null,
    demo: !!n.demo
  }),
  assessment: (a) => ({
    subject: a.subj,
    score: Math.max(0, Math.min(100, Math.round(a.score))),
    taken_on: a.date || new Date().toISOString().slice(0, 10)
  }),
  review: (r) => ({
    booking_id: Number(r.bookingId),
    stars: Math.max(1, Math.min(5, Math.round(r.stars))),
    body: String(r.text || "").slice(0, 500)
  })
};

/* push(kind, payload) — queues one row for sync; silently no-ops in demo mode. */
function push(kind, ...args) {
  if (!sb.live() || typeof SB_MAP[kind] !== "function") return false;
  const row = SB_MAP[kind](...args);
  if (!row) return false;
  const table =
    kind === "booking"
      ? "bookings"
      : kind === "message"
        ? "messages"
        : kind === "note"
          ? "notifications"
          : kind === "assessment"
            ? "assessments"
            : "reviews";
  queueSync(table, [row]);
  return true;
}
