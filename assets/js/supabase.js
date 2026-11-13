/* PathFinder Kenya — Supabase data layer (fast-first, graceful fallback)

   - localStorage is the instant cache: the UI renders without waiting for the network.
   - When Supabase is configured, writes sync in the background (serialised, never block the UI)
     and sign-in pulls the account's data into the local cache.
   - Without keys, PF_DB.live is false and the app runs fully in local demo mode.

   Load order on every page (paths relative to the page):
     supabase-js CDN  →  supabase-config.js  →  supabase.js  →  data.js  →  app.js  →  shell.js
*/
(function () {
  "use strict";
  const cfg = window.PF_SUPABASE_CONFIG || { url: "", anonKey: "" };
  let client = null;
  try {
    if (cfg.url && cfg.anonKey && window.supabase && window.supabase.createClient) {
      client = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
        global: { headers: { "x-client-info": "pathfinder-kenya/5.1" } }
      });
    }
  } catch (e) { client = null; }

  /* Serialise background writes so two quick saves can never interleave (delete + insert races). */
  let chain = Promise.resolve();
  function enqueue(fn) { chain = chain.then(fn).catch(function () { /* offline: local cache stays the source of truth */ }); return chain; }

  async function currentUser() {
    const { data } = await client.auth.getUser();
    return data && data.user;
  }
  const LETTER = function (qi, idx) {
    const q = (window.PF_QUIZ || [])[qi];
    return q && q.opts[idx] ? q.opts[idx][1] : null;
  };

  window.PF_DB = {
    client,
    live: !!client,
    status() { return client ? "Supabase live" : "Local cache mode (Supabase not configured)"; },

    /* ----- Auth ----- */
    async getSession() { if (!client) return null; const { data } = await client.auth.getSession(); return data.session; },
    async signUp(email, password, meta) {
      if (!client) return { error: new Error("supabase-not-configured") };
      return client.auth.signUp({ email, password, options: { data: meta } });
    },
    async signIn(email, password) {
      if (!client) return { error: new Error("supabase-not-configured") };
      return client.auth.signInWithPassword({ email, password });
    },
    async signOut() { if (client) await client.auth.signOut(); },

    /* Build the app's session user from the auth user + its profiles row.
       The ROLE always comes from the database row, never from anything the browser supplies. */
    async loadUser(authUser, fallback) {
      fallback = fallback || {};
      const fx = fallback.extra || {};
      let p = null;
      try {
        const r = await client.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
        p = r.data;
      } catch (e) { /* profile row may not exist yet */ }
      const meta = authUser.user_metadata || {};
      const role = (p && p.role) || "student";
      const extra = {
        county: (p && p.county) || fx.county || meta.county || "",
        stage: (p && p.stage) || fx.stage || meta.stage || "",
        school: (p && p.school) || fx.school || meta.school || "",
        tsc: (p && p.tsc_number) || fx.tsc || meta.tsc_number || ""
      };
      return {
        id: authUser.id, email: (authUser.email || "").toLowerCase(),
        name: (p && p.full_name) || fallback.name || meta.full_name || (authUser.email || "").split("@")[0],
        phone: (p && p.phone) || fallback.phone || meta.phone || "",
        role, roleLabel: role === "student" ? (extra.stage || "Student") : role === "tutor" ? "Tutor" : "SuperAdmin",
        extra, onboarded: !!(p && p.onboarded), suspended: !!(p && p.suspended)
      };
    },

    /* ----- Background sync (fire-and-forget) ----- */
    syncProfile(profile) {
      if (!client) return Promise.resolve();
      return enqueue(async function () {
        const user = await currentUser();
        if (!user) return;
        /* role / email are intentionally NOT sent — the database forbids clients from changing them. */
        await client.from("profiles").update({
          full_name: profile.name, phone: profile.phone || null,
          county: (profile.extra && profile.extra.county) || null,
          stage: (profile.extra && profile.extra.stage) || null,
          school: (profile.extra && profile.extra.school) || null
        }).eq("id", user.id);
      });
    },
    syncStudentData(data) {
      if (!client) return Promise.resolve();
      return enqueue(async function () {
        const user = await currentUser();
        if (!user) return;
        if (data.results && data.results.length) {
          await client.from("results").delete().eq("user_id", user.id);
          await client.from("results").insert(data.results.map(function (r, i) {
            return { user_id: user.id, subject: r.subject, score: r.score, target: r.target || null, exam_type: data.exam || null, position: i };
          }));
        }
        const answers = (data.quiz && data.quiz.answers) || {};
        const rows = Object.entries(answers).map(function (e) {
          const qi = +e[0], idx = +e[1];
          const letter = Number.isInteger(idx) ? LETTER(qi, idx) : null;
          return letter ? { user_id: user.id, question_idx: qi, option_idx: idx, answer_letter: letter } : null;
        }).filter(Boolean);
        await client.from("quiz_answers").delete().eq("user_id", user.id);
        if (rows.length) await client.from("quiz_answers").insert(rows);

        await client.from("assessments").delete().eq("user_id", user.id);
        const asm = (data.assessments || []).map(function (a) {
          return { user_id: user.id, name: a.name, subject: a.subject || null, raw_score: a.raw || null, points: a.pts ? +a.pts : null, exam_date: a.date || null };
        });
        if (asm.length) await client.from("assessments").insert(asm);

        await client.from("profiles").update({
          onboarded: !!data.onboarded, county: data.county || null, stage: data.stage || null, school: data.school || null
        }).eq("id", user.id);
      });
    },
    syncShortlist(ids) {
      if (!client) return Promise.resolve();
      return enqueue(async function () {
        const user = await currentUser();
        if (!user) return;
        await client.from("shortlists").delete().eq("user_id", user.id);
        if (ids.length) await client.from("shortlists").insert(ids.map(function (id) { return { user_id: user.id, institution_id: String(id) }; }));
      });
    },

    /* ----- Pull this account's data into the local cache (sign-in on a new device) ----- */
    async hydrateLocalCache(user) {
      if (!client || !user || user.role !== "student") return;
      try {
        const uid = user.id;
        const [res, quiz, asm, sh] = await Promise.all([
          client.from("results").select("*").eq("user_id", uid).order("position"),
          client.from("quiz_answers").select("*").eq("user_id", uid),
          client.from("assessments").select("*").eq("user_id", uid).order("exam_date", { ascending: false }),
          client.from("shortlists").select("institution_id").eq("user_id", uid)
        ]);
        const results = (res.data || []).map(function (r) { return { subject: r.subject, score: +r.score, target: r.target == null ? 0 : +r.target }; });
        const hasLocal = !!localStorage.getItem("pf_data_" + user.email);   // never overwrite unsynced local work
        if (results.length && !hasLocal) {
          const answers = {};
          (quiz.data || []).forEach(function (q) { answers[q.question_idx] = q.option_idx; });
          const data = {
            onboarded: !!user.onboarded, mock: false, stage: user.extra.stage, county: user.extra.county, school: user.extra.school,
            exam: (res.data[0] && res.data[0].exam_type) || undefined,
            results, quiz: { answers },
            assessments: (asm.data || []).map(function (a) {
              return { name: a.name, date: a.exam_date || "", subject: a.subject || "", raw: a.raw_score || "", pts: a.points == null ? "" : Number(a.points).toFixed(1) };
            })
          };
          if (Object.keys(answers).length && window.computeRecommendations) {
            const rec = computeRecommendations(data);
            data.quiz.top = rec.ranked[0].name; data.quiz.riasec = rec.riasecLabel;
          }
          localStorage.setItem("pf_data_" + user.email, JSON.stringify(data));
        }
        if (sh.data && sh.data.length) localStorage.setItem("pf_short_" + user.email, JSON.stringify(sh.data.map(function (x) { return x.institution_id; })));
      } catch (e) { /* offline or tables missing: continue with whatever is cached */ }
    },

    async fetchInstitutions() {
      if (!client) return null;
      try { const { data } = await client.from("institutions").select("*").order("name"); return data; }
      catch (e) { return null; }
    },
    audit(action, details) {
      if (!client) return Promise.resolve();
      return enqueue(async function () {
        const user = await currentUser();
        if (!user) return;
        await client.from("audit_logs").insert({ user_id: user.id, action, details: details || {} });
      });
    }
  };
  if (window.console) setTimeout(function () { console.info("[PathFinder] DB:", window.PF_DB.status()); }, 300);
})();
