# Supabase Setup (5 minutes)

1. Create project at https://supabase.com (region: af-south-1 Cape Town recommended for Kenya latency).
2. SQL Editor → run `schema.sql` (creates tables + RLS + signup trigger).
3. Run `seed.sql` (loads real institutions + scholarships).
4. Project Settings → API → copy Project URL + anon public key.
5. Paste into `../assets/supabase-config.js`:
   ```js
   window.PF_SUPABASE_CONFIG = { url: "https://xyz.supabase.co", anonKey: "eyJ..." }
   ```
6. Redeploy. The app auto-detects the keys: "Supabase live" badge appears in Deployment Centre.
   Without keys it runs in fast local-cache mode (fully functional offline demo).

## Auth flow with Supabase
- Sign up → `supabase.auth.signUp` + profile row auto-created by trigger.
- Sign in → `supabase.auth.signInWithPassword`.
- Student results/quiz/shortlists sync in background (local cache first for speed).
- SuperAdmin seeded account (emmanuelmwangi88@gmail.com) must also be created in Supabase Auth
  (Dashboard → Authentication → Users → Add user) with role superadmin in profiles.

## Security
- Never put the service_role key in frontend code. Only the anon key (RLS-protected).
- RLS: users access only their own rows; institutions/scholarships/tutors are public-read.
