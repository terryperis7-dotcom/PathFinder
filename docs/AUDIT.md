# Audit: what is verified, what is indicative

This build was checked against the original single-file prototype and against the
KUCCPS rules it claims to implement. The point of this page is to be explicit
about the difference between *tested* and *believed*.

## Verified by automated tests

`npm test` — 68 unit checks, plus a static audit of all 25 pages.

| Area | What is asserted |
| --- | --- |
| Data integrity | 24 institutions (12 public, 6 private, 5 TVET, 1 KMTC); 12 scholarships all with `https` links; 47 unique counties; 14 cluster groups × 4 slots; 6 pathways; 6 questions × 4 options; 8 tutors; 5 funding bands; 12 subjects; 12 grades |
| Scoring | A = 12 … E = 1; all-A best-7 = 84; all-B best-7 = 63; cluster cap = 48; empty grades never throw |
| Slot selection | per-slot best subject is chosen; `weighted` never exceeds 48; the quoted "biggest lift" is the true best single-grade gain among the cluster subjects, recomputed with both *r* and *t* |
| Recommendations | every pathway maps to at least one institution; a 63-point profile is eligible for the courses it should be; below-cut-off courses are not offered |
| Safety | phone numbers, `@handles`, emails, app names and profanity are blocked; ordinary text passes |
| Escaping | `< > " ' &` all escaped |
| Avatars | deterministic, inline `<svg>`, gradient defs, initials only |
| Pages | doctype, lang, charset, viewport, theme-color, description, live links, unique ids, defined icon ids, script order, no inline handlers or scripts |

`npm run test:render` boots all 25 pages in jsdom with every local script inlined
and fails on any runtime error or empty main container — this catches the class of
bug where a shared module assumes markup that a page does not have.

`npm run test:admin` runs 118 checks against the seven-tab console: tab count and
active state per page, masked contact → reveal → hide, approve / in review /
decline / reopen persisting into `S.bookings`, the admin's own row being
read-only, a role change surviving a reload, the four-check verification record,
suspend → reinstate and dismiss → reopen on the safety queue, DEMO seeding being
labelled, the HTTPS-only source map, the three sidebar groups and footer rows, the Account &
workspace and Safety centre panels (including what they state), and a student
session being refused the console.

## Verified by interaction

An 82-check functional pass drives the real DOM (jsdom, seeded session + state):
demo sign-in persists the role; signup validates name/email and lists 47 counties;
dashboard goes from empty state to four KPIs with 9 sidebar links and 5 bottom-nav
items; quiz advances; cluster renders 14 rows with `/48`; tracker logs a mock and
12 target selects; institutions renders 24 cards, stars a shortlist, searches
"mombasa" → 2 results, filters TVET → 6, opens and closes the detail modal;
funding shows 5 bands and 12 scholarships; tutors shows 8 cards, saves a booking,
and blocks a message containing a phone number; profile saves and exports JSON;
the tutor workspace renders a 35-cell week; all seven admin tabs boot with the
correct active tab and persist their decisions; students see locked panels on
tutor and admin pages.

## Indicative, not authoritative

* **Programme cut-offs.** The per-course cut-offs are representative of recent
  intakes, not a live KUCCPS feed. They are labelled as guidance on every screen
  that shows them.
* **Cluster weights.** The subject weights follow the published cluster
  documents; if KUCCPS revises a group, update `assets/js/data.js` and re-run
  `npm run seed`.
* **Scholarship deadlines.** Twelve real funds with real links, but deadlines move.
  The funding page shows the date and links out; verify each cycle.
* **HEF/HELB bands.** The five bands model the current funding model; the actual
  award depends on the household-means test.
* **Tutor profiles.** The eight tutors are demo records. Verification is an admin
  workflow, not a claim about real people.

## Known gaps and next steps

1. **Live data.** A scheduled job against KUCCPS/HELB sources would replace the
   curated tables. The schema is already in normal form for it.
2. **Password reset.** Missing in demo mode (device-local); Supabase mode should
   wire `auth/v1/recover` and a reset screen.
3. **Real-time chat.** Messages persist locally and to Supabase, but there is no
   websocket subscription yet — a page reload is what pulls new messages.
4. **Offline writes.** The sync queue replays on next load; it does not retry in
   the background (no Background Sync in Safari).
5. **Localisation.** The language switch is present and persists, and copy is
   English-only for now; the `t()` hook is where Kiswahili lands.
6. **Accessibility.** Landmarks, focus management and contrast are in place; a
   screen-reader pass on the cluster table and the week grid is still owed.
7. **Analytics.** Deliberately absent. If added, it must be self-hosted and
   consent-gated.

## How to re-run the audit

```bash
git clone <this repo> && cd pathfinder
npm test                 # no install needed
npm i -D jsdom && npm run test:render
npm run seed             # confirms seed.sql matches data.js
python3 -m http.server 8000   # manual pass on a 360 px viewport
```

### Notifications and charts — `npm run test:ui` (65 checks)

Boots `student/dashboard.html`, `tutor/dashboard.html` and `admin/dashboard.html`
in jsdom and drives the real chrome:

* the bell exists on every signed-in page, inside the top bar, with a label
  screen readers can read, and no console errors;
* the badge equals the number of unread notes **for that role** — recomputed
  from state, never hard-coded;
* every seeded row carries `DEMO`, and only three exist per role;
* the panel opens on the bell, sets `aria-expanded`, lists exactly the role's
  notes (a student never sees a tutor-only row), shows source and relative time,
  and states where notes are kept;
* the Unread filter, **Mark all read** (badge clears, state persists) and
  opening a note (closes the panel, routes through `go()`, marks it read) all
  behave;
* an admin decision on a seeded request creates a real, non-DEMO note aimed at
  the learner with a working link;
* the announcement composer offers exactly four audiences and the resulting note
  is visible in another role's inbox on the next boot;
* the student graph draws one point per logged date, marks the target, labels
  the axis with units, reports the true delta, and — with no assessments — draws
  **no** line and shows an empty state instead; a single log renders one point
  and no line.

### Role capabilities — `npm run test:roles` (64 checks)

Proves the three roles can do their job, not just see their pages.

* **Admin** — search and status filters narrow the queue and survive a re-render;
  every decision (approve, decline, hold, reopen, suspend, reinstate, role change,
  verification toggle, report resolution, application decision, seeded demo row)
  appends one line to the action trail with actor, action and target; a report
  cannot be resolved without a written outcome and the learner receives it; tutor
  applications move to approved/rejected with a stored decision and a
  notification; evidence a tutor submitted is visible inside the verification
  panel while the reviewer keeps the final say.
* **Tutor** — a request awaiting approval cannot be completed, a confirmed one
  can; completing writes the timestamp, the ledger row at the published rate, the
  learner notification, and moves the earnings total; evidence submission stores
  the reference and tells the reviewer; the badge does not flip on its own.
* **Learner** — a review is offered only for a completed session, refuses to save
  without stars, stores stars and text, notifies the tutor, and shows as "Your
  rating" afterwards; an open request can change slot, which re-opens the request,
  writes a chat line and asks the tutor to approve.

### Supabase schema — `npm run test:sql`

Parses `supabase/schema.sql` and `seed.sql` without a database: RLS enabled on
all 27 tables, at least one policy per table, no policy on a missing table, no
world-readable personal table (reference data excepted), every index, trigger,
function and foreign key resolving, and a seed that truncates what it inserts so
re-running cannot duplicate rows.

### Click sweep — `npm run test:clicks` (20 pages, 177 controls)

Boots every signed-in page and presses everything a person could reach — page
actions, console actions, tabs, filters, modal buttons — closing any modal that
opens in between. It asserts nothing about the result (the role suite does that);
it exists to prove that pressing things cannot throw. Two real bugs came out of
it: the tutor workspace called `openChat()` which only the learner page shipped
(now `assets/js/chat.js`, loaded by all 26 pages), and the compare bar assumed a
view id that no longer existed.

### Supabase schema — `python3 tools/check_sql.py`

27 tables, 50 policies, 27 RLS switches. Fails the build if a table has RLS with
no policy, a policy/index/trigger/foreign key points at a table that does not
exist, a personal table is world-readable, or the seed can duplicate rows on a
second run.
