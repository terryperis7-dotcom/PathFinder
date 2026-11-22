# Connecting PathFinder to Supabase (real accounts)

Without this, PathFinder runs in **local demo mode**: accounts and progress live
in the visitor's browser and no request leaves the device. That is the default,
and it is a complete experience — use it for demos and for the pilot.

Adding Supabase switches on real email accounts, cloud sync of grades and
assessments, and a shared admin safety queue.

---

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the **Project URL** and the **publishable** (anon) key from *Project settings → API*.
3. Never copy the `service_role` key into this repo — it bypasses every RLS rule.

## 2. Create the schema

Open *SQL editor* and run, in order:

```
supabase/schema.sql     -- 27 tables, enums, triggers, 50 RLS policies, indexes
supabase/seed.sql       -- 24 institutions, 12 scholarships, 47 counties, 14 clusters
```

`schema.sql` is re-runnable: it drops the policies it owns and recreates them,
uses `create table if not exists`, and `alter table … add column if not exists`
for the report outcome columns. Run it again after a pull without dropping data.

Audit the SQL without a database:

```bash
npm run test:sql
# checked 27 tables, 50 policies, 27 RLS switches — all SQL checks passed
```

`seed.sql` is generated — do not hand-edit it. Change `assets/js/data.js` and run:

```bash
npm run seed
```

## 3. Point the app at your project

Edit `assets/js/supabase-config.js`:

```js
const SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "eyJhbGciOi..."
};
```

That single file is the only thing standing between demo mode and live mode.
Everything else checks `sb.enabled()` at runtime.

## 4. Auth settings

* *Authentication → Providers → Email*: on.
* *Authentication → URL configuration*: add your deployed origin and
  `http://localhost:8000` as redirect URLs.
* Turn **email confirmation** on before letting real learners register.

## 5. Make yourself an admin

Register normally in the app, then run once in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Reload `/admin/dashboard.html` and the console unlocks.

## What is in the schema

| Area | Tables | Who can read it |
| --- | --- | --- |
| People | `profiles`, `tutor_profiles` | your own row; the tutor directory is public but suspension-aware |
| Learning | `grades`, `quiz_answers`, `pathway_matches`, `assessments`, `targets`, `shortlists` | the learner only |
| Sessions | `bookings`, `messages`, `availability`, `session_log`, `reviews` | the two parties on the booking |
| Safety | `reports` (+ `resolution`, `resolved_at`, `resolved_by`), `safety_log`, `suspensions` | the reporter for their own row, admins for the queue |
| Trust | `verify_checks`, `verify_submissions`, `tutor_applications` | the tutor for their own, admins to decide |
| Comms | `notifications` | your own rows plus broadcasts to your role |
| Accountability | `admin_actions` | admins only, append-only |
| Reference | `institutions`, `scholarships`, `counties`, `clusters`, `funding_bands`, `pathways` | everyone (read-only) |

Triggers do the things a client must never be trusted to do:

* `booking_decision_notify` writes the learner's notification when a booking
  moves to Confirmed / Declined / Completed, running as the definer so the
  learner does not need write access to their own inbox.
* `report_notify` puts every new report in the admin safety queue.

Every policy is exercised by `tools/check_sql.py`, which fails the build if a
table has RLS with no policy, if a policy points at a missing table, or if a
personal table is made world-readable.

## What the client does with it

| Layer | File | Behaviour |
| --- | --- | --- |
| Auth | `assets/js/auth.js` | Supabase Auth sign-up / sign-in. Role and suspension are read from `profiles`, never from the browser |
| REST | `assets/js/supabase.js` | one `sb.call()` door with token refresh; writes are **queued** if offline and replayed in order |
| Mapping | `SB_MAP` in the same file | `push("booking" \| "message" \| "note" \| "assessment" \| "review", …)` turns a local row into the exact PostgREST body |
| Fallback | every page | if `SUPABASE.url` is empty, hashing and storage stay local (PBKDF2, 60 000 iterations) |

## Verifying it works

1. Register an account, sign out, sign back in.
2. *Table editor → profiles*: your row exists with role `student`.
3. Log a mock in the tracker, reload: the row is in `assessments`.
4. Open **Admin → Deployment centre** — the Supabase check turns green.
5. Approve a request as admin: the learner's bell shows the decision even after
   a reload (the trigger wrote it), and *Admin → Overview → Action trail* has the
   entry.
6. As a tutor, mark a session complete: `session_log` gains a row with a fee
   derived from the published rate. No money moves — payments are not live.

## Known limits

* The nine tutors in the tutor directory are sample data and have no database
  row, so bookings with them stay on the device. Real tutors register as
  `tutor`, appear in `tutor_profiles` once an admin verifies them, and their
  bookings sync.
* Notifications are written by database triggers and by admins. A learner's
  browser cannot insert one, so the client does not try.
* Turn on email confirmation in Supabase Auth before real learners register.
  The app then asks them to confirm and sign in.
