# Supabase setup

PathFinder runs in **local demo mode** without Supabase. Connect Supabase for real accounts, server-side password handling and cross-device sync.

## 1. Create the project
1. Create a project at <https://supabase.com>. Pick a region close to your users (for Kenya, `af-south-1` Cape Town is a good choice).
2. **SQL Editor → New query**: paste and run [`schema.sql`](schema.sql). Then run [`seed.sql`](seed.sql) (institutions and scholarships, generated from `assets/js/data.js`). Both are safe to re-run.

## 2. Connect the app
**Project Settings → API**: copy the **Project URL** and the **anon public** key into `assets/js/supabase-config.js`:

```js
window.PF_SUPABASE_CONFIG = { url: "https://xxxx.supabase.co", anonKey: "eyJ..." };
```

> The anon key is designed to be public: Row Level Security is what protects the data. **Never** put the `service_role` key in any file in this repo.

## 3. Configure Auth
- **Authentication → Providers → Email**: enable; turn **Confirm email** on for production.
- **Authentication → URL Configuration**: set the Site URL and add your deployed URL (and `http://localhost:8000`) to Redirect URLs. Password-reset emails use `/signin.html`.

## 4. Create your SuperAdmin
SuperAdmin accounts **cannot** be created from the website (by design).
1. Sign up normally on the site (or **Authentication → Users → Add user**).
2. In the SQL editor, promote that user:
   ```sql
   update public.profiles set role = 'superadmin' where email = 'you@example.com';
   ```
3. Sign in again. The role is read from the database, never from the browser.

To suspend an account: `update public.profiles set suspended = true where email = '…';`

## How the data layer behaves
| Action | What happens |
| --- | --- |
| Sign up | `supabase.auth.signUp`; a trigger creates the `profiles` row. Only `student` and `tutor` can be requested. |
| Sign in | `signInWithPassword`, then the profile (including role) is loaded from `profiles`. |
| Save results / quiz / tracker | Written to the browser cache instantly, then synced in the background (queued, one write at a time). |
| Sign in on a new device | If the browser has no saved data for that account, results, quiz, assessments and shortlist are pulled from Supabase. |

## Security model (see `schema.sql`)
- Row Level Security is on for every table; users only touch their own rows.
- Clients can update only `full_name, phone, county, stage, school, onboarded` on their own profile. `role`, `email`, `suspended` and `tsc_number` are changeable only from the SQL editor / service role.
- `audit_logs`: users can only insert rows for themselves; only SuperAdmins can read.
- Reference tables (institutions, scholarships, tutors) are read-only for signed-in users.

### Upgrading an existing project
If you ran the **old** `schema.sql`, run the new one as well, then check for tampering:
```sql
select email, role from public.profiles where role = 'superadmin';
```
The old policy let any user set their own role, so remove any row you don't recognise.
