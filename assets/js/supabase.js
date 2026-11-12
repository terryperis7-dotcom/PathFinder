/* PathFinder Kenya — Supabase data layer (fast-first, graceful fallback)
   Strategy for FAST responses:
   - localStorage is the instant cache (UI renders in <50ms, no network wait)
   - Supabase syncs in the background (fire-and-forget, optimistic UI)
   - If Supabase is not configured / offline, everything still works locally.
   Load order on every page:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="assets/js/supabase-config.js"></script>
     <script src="assets/supabase.js"></script>
     <script src="assets/app.js"></script> */
(function(){
  const cfg = window.PF_SUPABASE_CONFIG || {url:"", anonKey:""};
  let client = null;
  try{
    if(cfg.url && cfg.anonKey && window.supabase && window.supabase.createClient){
      client = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth:{persistSession:true, autoRefreshToken:true},
        global:{headers:{"x-client-info":"pathfinder-kenya/2.0"}}
      });
    }
  }catch(e){ client = null; }

  window.PF_DB = {
    client,
    live: !!client,
    status(){ return client ? "Supabase live" : "Local cache mode (Supabase not configured)"; },
    async getSession(){ if(!client) return null; const {data} = await client.auth.getSession(); return data.session; },
    async signUp(email,password,meta){
      if(!client) return {error:new Error("supabase-not-configured")};
      return client.auth.signUp({email,password,options:{data:meta}});
    },
    async signIn(email,password){
      if(!client) return {error:new Error("supabase-not-configured")};
      return client.auth.signInWithPassword({email,password});
    },
    async signOut(){ if(client) await client.auth.signOut(); },
    /* Background sync helpers — never block the UI */
    async syncProfile(profile){
      if(!client) return;
      try{
        const {data:{user}} = await client.auth.getUser();
        if(!user) return;
        await client.from("profiles").upsert({
          id:user.id, email:profile.email, full_name:profile.name,
          role:profile.role, phone:profile.phone||null,
          county:profile.extra?.county||null, stage:profile.extra?.stage||null,
          school:profile.extra?.school||null, onboarded:!!profile.onboarded
        });
      }catch(e){ /* offline — local cache already saved */ }
    },
    async syncStudentData(data){
      if(!client) return;
      try{
        const {data:{user}} = await client.auth.getUser();
        if(!user) return;
        if(data.results?.length){
          await client.from("results").delete().eq("user_id",user.id);
          await client.from("results").insert(data.results.map(r=>({
            user_id:user.id, subject:r.subject, score:r.score, target:r.target||null, exam_type:data.exam||null
          })));
        }
        if(data.quiz?.answers){
          await client.from("quiz_answers").delete().eq("user_id",user.id);
          const rows=Object.entries(data.quiz.answers).map(([idx,letter])=>({user_id:user.id,question_idx:+idx,answer_letter:letter}));
          if(rows.length) await client.from("quiz_answers").insert(rows);
        }
        await client.from("profiles").update({onboarded:!!data.onboarded, county:data.county||null, stage:data.stage||null, school:data.school||null}).eq("id",user.id);
      }catch(e){ /* local cache is source of truth until sync succeeds */ }
    },
    async fetchInstitutions(){
      if(!client) return null;
      try{ const {data} = await client.from("institutions").select("*").order("name"); return data; }
      catch(e){ return null; }
    },
    async audit(action,details){
      if(!client) return;
      try{
        const {data:{user}} = await client.auth.getUser();
        await client.from("audit_logs").insert({user_id:user?.id||null, action, details:details||{}});
      }catch(e){}
    }
  };
  /* Non-blocking status log for the Deployment Centre */
  setTimeout(()=>{ if(window.console) console.info("[PathFinder] DB:", window.PF_DB.status()); }, 300);
})();
