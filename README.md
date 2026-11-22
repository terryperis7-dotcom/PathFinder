# PathFinder Kenya

A free guidance site for Kenyan students, parents and tutors: what to study after
KCSE, which institutions fit, how to fund it, and how to find a vetted tutor.
It covers KUCCPS clusters, HELB, HEF bands, TVET and the CBC transition.

Live: <https://pathfinder-two-tau.vercel.app>

It is plain HTML, CSS and JavaScript. There is no build step and no framework.
Supabase is optional: without it the whole site runs from the browser.

## Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Or `npm start`, which does the same thing.

## What is in it

**Students** take a short interest quiz, enter their KCSE grades, and get
pathway matches, a KUCCPS cluster-point estimate, an institution shortlist, a
funding guide, a grade tracker, and a way to request a session with a tutor.

**Tutors** have a desk for requests, their schedule, a session ledger and a
verification checklist (TSC, ID, conduct, child safety).

**Admins** have a console for requests, sessions, users, safety reports,
messages, data and deployment checks, and the DPA 2019 notes.

Messages between learners and tutors are filtered for phone numbers, social
handles and abuse before they are saved. Contact details are never shared.

## Two modes

| | Demo mode (no keys) | Live mode (Supabase) |
| --- | --- | --- |
| Accounts | Stored in this browser, PBKDF2-hashed | Supabase Auth |
| Roles | Chosen at sign-up | Set by the database; admins are promoted by hand |
| Data | `localStorage` only, nothing leaves the device | Postgres with row level security |
| Admin console | Reads this device | Reads every profile, writes an audit trail |

Which mode you get depends on one file, `assets/js/supabase-config.js`. Leave
the URL and key empty for demo mode.

## Going live with Supabase

The full steps are in [`supabase/README.md`](supabase/README.md). The short
version:

1. Run `supabase/schema.sql`, then `supabase/seed.sql`, in the SQL editor.
2. Put the project URL and publishable key in `assets/js/supabase-config.js`.
3. Register in the app, then promote yourself:
   `update public.profiles set role = 'admin' where email = 'you@example.com';`
4. Turn on email confirmation before real learners sign up.

Never put the `service_role` key in this repo.

## How it is secured

- Row level security is on for all 27 tables.
- Profiles are created by a database trigger, so a sign-up cannot ask for the
  admin role. Guard triggers stop users changing their own role, tutors
  verifying themselves, and learners approving their own bookings.
- No inline scripts, a strict Content Security Policy, and every piece of user
  text goes through `esc()` before it reaches the page.
- Idle sessions sign out after 30 minutes. Suspended accounts are refused.

Details and the reasoning are in [`docs/SECURITY.md`](docs/SECURITY.md).

## Data

The 24 institutions, 12 scholarships, 47 counties, 14 KUCCPS clusters and 5 HEF
bands in `assets/js/data.js` are reference data with links to the official
sites. Cut-offs and fees change every year, so the app says "indicative" and
points to KUCCPS, HELB and the institutions themselves.

Anything labelled `MOCK DATA` or `DEMO` is sample content for trying the app.
The nine tutors in the directory are samples until real tutors are verified.

`supabase/seed.sql` is generated from `data.js`. After editing the data, run
`npm run seed`.

## Layout

```
index.html, signin.html, signup.html   public pages
student/  tutor/  admin/               one folder per role
legal/                                 privacy and terms (DPA 2019)
assets/css/                            style.css (tokens), app.css (components)
assets/js/                             shared modules; pages/ has one file per page
supabase/                              schema.sql, seed.sql, setup guide
tests/  tools/                         tests, static checks, seed generator
docs/                                  ROLES, DESIGN, SECURITY
```

## Tests

```bash
npm test            # unit tests, HTML audit, SQL audit (no dependencies)
npm run test:all    # adds the browser-style suites; needs `npm install` for jsdom
```

CI runs the same checks on every push, including a check that `seed.sql` still
matches `data.js`.

## Known gaps

- Payments are not live; session fees are recorded, not charged.
- Admin tools for tutor verification and reports still work from this device's
  state; accounts, roles and the audit trail are the parts wired to Supabase.
- Email delivery of notifications is not set up. They appear in the in-app bell.

## Licence

MIT. See [`LICENSE`](LICENSE).
