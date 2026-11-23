/* Supabase project credentials.

   The publishable key is meant to ship to the browser: what it can reach is
   decided by the row level security policies in supabase/schema.sql, not by
   keeping the key secret. NEVER put the service_role or secret key here.

   Leave both values empty to run in local demo mode: accounts and progress
   stay in this browser and no request leaves the device. */

const SUPABASE = {
  url: "https://wldyjursbrdfdhtcrorc.supabase.co",
  anonKey: "sb_publishable_1QAwzLEvDUBHyhPaWovKWg_AXPioWTN"
};
