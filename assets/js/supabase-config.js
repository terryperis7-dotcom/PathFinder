/* PathFinder Kenya — Supabase configuration
   ------------------------------------------------------------
   HOW TO GO LIVE (5 minutes):
   1. Go to https://supabase.com → New project (region: af-south-1 Cape Town
      for lowest latency to Kenya, or eu-west-1).
   2. In the new project: SQL Editor → paste & run supabase/schema.sql
   3. Then run supabase/seed.sql (loads real institutions data).
   4. Project Settings → API → copy the Project URL + anon public key.
   5. Paste them below and redeploy. The app works WITHOUT this too —
      it falls back to fast localStorage cache automatically.
   ------------------------------------------------------------ */
window.PF_SUPABASE_CONFIG = {
  url: "",        // e.g. "https://xyzcompany.supabase.co"
  anonKey: ""     // e.g. "eyJhbGciOi..."
};
