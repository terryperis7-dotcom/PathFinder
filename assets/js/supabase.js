/* Supabase layer: auth calls, REST upserts and the offline sync queue.
   Everything is inert while supabase-config.js holds empty values. */
/* ---------- Supabase ---------- */
const sb = {
  enabled: () => !!(SUPABASE.url && SUPABASE.anonKey),
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
    if (!r.ok) throw new Error(j.error_description || "Sign up failed");
    return j;
  },
  async signIn(e, p) {
    const r = await fetch(SUPABASE.url + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({ email: e, password: p })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || "Sign in failed");
    return j;
  },
  signOut(t) {
    return fetch(SUPABASE.url + "/auth/v1/logout", { method: "POST", headers: this.restHeaders(t) });
  },
  async upsert(t, rows, tk) {
    const r = await fetch(SUPABASE.url + "/rest/v1/" + t, {
      method: "POST",
      headers: { ...this.restHeaders(tk), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(rows)
    });
    if (!r.ok) throw new Error("Sync failed");
    return r;
  }
};
function queueSync(t, rows) {
  S.syncQueue.push({ table: t, rows, ts: Date.now() });
  save();
}
async function flushSync() {
  if (!sb.enabled() || !S.syncQueue.length) return;
  for (const it of [...S.syncQueue]) {
    try {
      await sb.upsert(it.table, it.rows, SESSION && SESSION.token);
      S.syncQueue = S.syncQueue.filter((x) => x !== it);
      save();
    } catch (e) {
      break;
    }
  }
}

/* ---------- state → table mapping ----------
   The app works offline first: every mutation is written to localStorage, and
   when Supabase is configured the same change is queued here and flushed in
   order. Column names match supabase/schema.sql exactly, so a queue row is a
   valid PostgREST body. A learner row carries no contact details (there is no
   phone column on purpose) and notifications carry an in-app view key, never a
   URL, so an announcement cannot become a redirect. */
const SB_MAP = {
  booking: (b) => ({
    id: Number(b.id),
    subject: b.subject || "Session",
    slot_day: (b.slot || "").split(" ")[0] || null,
    slot_time: (b.slot || "").split(" ").slice(1).join(" ") || null,
    mode: b.mode || null,
    note: b.note || null,
    status: ["Requested", "Confirmed", "Declined", "Completed"].includes(b.status) ? b.status : "Requested"
  }),
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
  if (!sb.enabled() || !SESSION || typeof SB_MAP[kind] !== "function") return false;
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
