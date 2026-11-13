/* PathFinder Kenya — Supabase configuration
   ------------------------------------------------------------
   HOW TO GO LIVE (5 minutes):
   1. Go to https://supabase.com → New project (region: af-south-1 Cape Town
      for lowest latency to Kenya, or eu-west-1).
   2. In the new project: SQL Editor → paste & run supabase/schema.sql
   3. Then run supabase/seed.sql (institutions + scholarships).
   4. Project Settings → API → copy the Project URL + anon public key.
   5. Paste them below and redeploy. Without keys the app runs in local demo mode.
   NEVER paste the service_role key here — only the anon key.
   Full guide: supabase/README.md
   ------------------------------------------------------------ */
window.PF_SUPABASE_CONFIG = {
  url: "",        // e.g. "https://xyzcompany.supabase.co"
  anonKey: ""     // e.g. "eyJhbGciOi..."
};
