# PathFinder Kenya

**Free, offline-first guidance for Kenyan students after KCSE — course clusters, KUCCPS eligibility, TVET options, funding, and a tutor who actually answers.**

Plain HTML, CSS and JavaScript. No framework, no bundler, no build step: open the
folder in any static server and the whole site works.

```
git clone <this repo> pathfinder && cd pathfinder
python3 -m http.server 8000     # or: npm start
# → http://localhost:8000
```

Accounts and progress are stored in the visitor's browser by default (**demo
mode**). Point `assets/js/supabase-config.js` at a Supabase project to switch on
real email accounts and cloud sync — nothing else changes.

---

## Why this exists

Every January, roughly a million KCSE candidates are handed a 48-point scale and
a PDF, and expected to choose a degree, a college and a funding route with no
counsellor in reach. The private alternatives cost money and the free ones are
brochures. PathFinder Kenya turns that decision into four honest screens:

1. **What did I score, and what does that actually open?** — cluster weights per
   subject, computed the way KUCCPS computes them.
2. **Which of the 86 institutions here will take me?** — filtered by pathway,
   county, type and the real subject requirements.
3. **How do I pay for it?** — HELB, TVET bursaries, county funds, foundations.
4. **Who can I ask?** — a tutor workspace with verified profiles, bookings and a
   moderated chat.

It ships **no AI guessing**: every number on screen comes from a formula you can
read in `assets/js/cluster.js`, run as a test in `tests/app.test.js`, and check
against the KUCCPS cluster document.

---

## What is in the box

### Public

| Page                                     | What it does                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `index.html`                             | One-page pitch: the 48-point problem, the four steps, live cluster demo, pricing (free), FAQ. |
| `signup.html`                            | Account creation, 47 counties, role choice (student / parent / tutor), password rules.        |
| `signin.html`                            | Email + password, demo accounts one click away.                                               |
| `legal/privacy.html`, `legal/terms.html` | Plain-language privacy notice (Kenya Data Protection Act 2019) and terms.                     |

### Student

| Page                        | What it does                                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `student/onboarding.html`   | Three steps: **stage + learning areas** → grades/levels → six interest questions. The stage picker switches the whole app between CBC and 8-4-4.                                                                            |
| `student/dashboard.html`    | Stage-aware KPIs, **progress line + a progress ring** (donut of your grade/level mix), subject bars, a readiness checklist, the exam timeline for your stage, and five quick-action tiles.                                  |
| `student/quiz.html`         | Six-question interest assessment → **a reveal screen** (match ring, your traits, strongest area, next step) → the ranked breakdown with subject detail. Works in CBC levels or KCSE grades.                                 |
| `student/cluster.html`      | 8-4-4: all 14 cluster groups with weighted points, `/48` cap and the **biggest single lift**. CBC: an honest **pathway-fit** page instead, because CBC has no cluster points.                                               |
| `student/institutions.html` | Every chartered university in Kenya (38 public, 32 private) plus 10 university colleges and 6 TVET entries, county + field filters, search, star shortlist, detail modal, compare.                                          |
| `student/funding.html`      | Five funding bands, 12 scholarships with deadlines and links, accordion.                                                                                                                                                    |
| `student/tracker.html`      | Mock-by-mock log, a target per learning area (grades or CBC levels), latest-vs-target bars, CSV export.                                                                                                                     |
| `student/tutors.html`       | Eight tutor cards, request → booking, **change the slot** on an open request, moderated chat, **review a completed session** (stars + comment), report a tutor.                                                             |
| `student/welcome.html`      | **The safety check**: date of birth (age worked out, not typed), county and school, a guardian step for under-18s, the three safety documents to open and tick, then a typed signature that records what was read and when. |
| `student/messages.html`     | **Your inbox**: one row per tutor conversation from your bookings plus any message the PathFinder team sent you, unread counts, and a reply box on team threads. Report a person straight from the row.                     |
| `student/sessions.html`     | **Scheduled sessions**: confirmed and requested sessions as cards — when, with whom, online or in person, and a jump into the chat or a report. Nothing here claims a payment was taken.                                    |
| `student/profile.html`      | **Profile picture picker** (initials, icon or an uploaded photo, eight colours), stage + senior pathway, school/county, data export.                                                                                        |

### Tutor

`tutor/welcome.html` · `dashboard.html` · `students.html` · `schedule.html` · `sessions.html` · `messages.html` · `profile.html`

`tutor/welcome.html` is the same flow with the tutor's own steps: identity and a
contact number, the four verification documents (which **can be skipped** — the
badge then says unverified rather than pretending otherwise), the safety rules
including a tutor conduct document, and the signature.

The tutor's **Messages** page is the same inbox the learner sees, from the other
side: each requesting learner, the thread, the unread count, and a flag button
that files a report about that learner. A learner reported by a tutor and a
tutor reported by a learner land in the same admin safety queue, and either can
be restricted to read-only until a reviewer lifts it.

The verification page now takes an **upload**: for each of the four checks the
tutor attaches a photo or a PDF (kept on the device, photos shrunk to 1200 px),
which appears in the reviewer's panel with its own Open / Download / Delete
controls. The badge still flips only when a reviewer records the check.

Workspace with the student list, the 35-cell week grid, verification state, and now:

| Capability                       | Where               | What it does                                                                                                          |
| -------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Accept / decline a request       | Overview · Requests | Writes the decision, messages the learner, notifies them                                                              |
| **Mark a session complete**      | Session log         | Sets `Completed`, stamps the time, writes a ledger row at the published rate, and asks the learner for a review       |
| **Earnings ledger**              | Session log         | Completed sessions, value at the pilot rate, "last 7 days", CSV export. _Payments are not live and the page says so._ |
| **Submit verification evidence** | Verification        | Reference for a missing check reaches the reviewer; the badge still only appears when an admin records it             |
| Availability                     | Availability        | Open/close slots — exactly what learners can request                                                                  |

### Admin (role-gated, nine tabs)

One console, nine tabs, nine real URLs — each deep-linkable and shareable.

| Page                    | What it does                                                                                                                                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin/dashboard.html`  | Overview: accounts, open requests, open reports, suspensions, a "what needs attention" queue with direct actions, pathway coverage and a device activity feed.                                                                                                                         |
| `admin/requests.html`   | Learning requests: learner, focus, mode and a **masked** contact the reviewer can reveal per row. Approve / mark in review / decline / reopen, plus CSV export.                                                                                                                        |
| `admin/users.html`      | Accounts and roles (your own row is read-only), tutor verification states with a four-check panel that **shows the document the tutor uploaded** (image preview or PDF, download, delete), a table of every uploaded document with its review status, and the tutor application queue. |
| `admin/sessions.html`   | **Scheduled sessions:** a Mon–Sun diary of confirmed slots, KPIs (confirmed, awaiting approval, completed, booked value), every booking with approve / mark-done / cancel / reopen, and a CSV export.                                                                                  |
| `admin/messages.html`   | **Messaging:** moderated threads with learners and tutors, unread badges, a composer that starts a new thread with any account, and the same safety filter that protects a learner chat.                                                                                               |
| `admin/safety.html`     | Open and resolved learner reports with suspend / dismiss / reopen, suspended-tutor list with reinstatement, and the **Safeguarding queue** of flagged messages with warn / mute / lock / suspend.                                                                                                                                               |
| `admin/data.html`       | Reference-data audit: every institution listing, 12 scholarships, 14 clusters, RIASEC coverage, cluster engine check — pass / advisory / error, with the official source for each and CSV export.                                                                                      |
| `admin/deployment.html` | Live build checks (HTTPS, storage, service worker, manifest, Supabase, crypto, filter) plus the six-step path to hosted auth.                                                                                                                                                          |
| `admin/dpa.html`        | Kenya DPA 2019 posture, the local data inventory, and the launch gaps that must close before real learners.                                                                                                                                                                            |

### What an admin can do today

| Capability                                                                                      | Where                     |
| ----------------------------------------------------------------------------------------------- | ------------------------- |
| Approve / decline / hold / reopen a learning request                                            | Requests                  |
| Filter any list by search + status chips (state survives navigation)                            | Requests · Users · Safety |
| Resolve a report with a written outcome — the learner is told, the text is kept                 | Safety                    |
| Dismiss, reopen, suspend a tutor, reinstate                                                     | Safety                    |
| **Open the document a tutor uploaded**, record or revoke each of the four checks, delete a file | Users & roles → Verify    |
| See a Mon–Sun diary of confirmed sessions and approve, complete or cancel any booking           | Scheduled sessions        |
| Message a learner or a tutor, start a thread, read replies — filtered and logged like any chat  | Messaging                 |
| Approve or reject a tutor application, with the decision and reason stored                      | Users & roles             |
| Change a role, remove an account (two-tap), export accounts                                     | Users & roles             |
| **Action trail** — every decision, who made it, to whom, newest first, CSV export               | Overview                  |
| Announce to everyone / students / tutors / admins                                               | Bell → Announce           |
| Reference-data audit, deployment checks, DPA register, four CSV exports                         | Data · Deployment · DPA   |

The sidebar groups match the console: **Admin console** (Platform overview,
Users & roles, Learning requests, **Scheduled sessions**, **Messaging**, Safety
reports), **Operations** (Data audit, Deployment, Data protection) and **Public
surface** (Institution directory), with **Safety centre** and **Sign out** in the
footer. Messaging and Scheduled sessions carry live badges (unread replies,
confirmed sessions).

Two things are deliberately _not_ in the column any more:

- **Your profile** is the picture in the top bar. Tapping it opens a floating
  card — who you are, the county, the safety-check state, where the data lives —
  with an inline edit form, a photo button, the Safety centre, export and sign
  out. Saving writes `name, county, school, stage` to `profiles` when a Supabase
  token is live, and to this device's stored profile otherwise. The role is never
  editable from there; the database owns it.
- **Public homepage** was a row that did nothing the brand at the top of the
  column does not already do, so it is gone, and "My profile" went with it.

The sidebar has **one** open/close control — the top-bar hamburger. It collapses
the column to a rail on a laptop and slides the drawer on a phone, and the choice
survives a reload (`pf-ui-v1`). The Safety centre is still a real modal on every
page, for every role: the six protection rules, the reports you filed, and what to
do in an emergency.

Everything is computed from data actually in the app or accounts on this
device — nothing is pre-filled, seeded rows are labelled `DEMO`, and a
verification badge only appears after a reviewer records the check. Decisions
persist: approving a request writes `Confirmed` to state, and the tutor
workspace reads the same rows.

### Notifications

Every signed-in page — student, tutor, admin and the public pages — carries a
**bell in the top bar** (`assets/js/notify.js`):

- The badge is the real number of unread notes for _your_ role. It is never a
  decoration: three seeded rows are labelled `DEMO` in the list, and the rest
  appear only when something actually happens.
- Notes are created by real actions: sending a session request (learner **and**
  tutor are notified), an admin decision on a request, a safety report, a
  suspension or reinstatement, a verification change, a completed career check,
  and a message stopped by the safety filter.
- **The panel stays open until you close it.** There is no outside-click
  dismissal, so a long list cannot vanish mid-read on a phone; the ✕ closes it
  and so does `Esc`. It is keyboard-reachable (`Enter`/`Space` open a row).
- Each row shows who it came from, how long ago, and opens the page where you
  can act on it. `All` / `Unread` filters, mark-all-read and per-note read state
  persist in `pf-state-v1` on the device.
- **Delete** one message with the ✕ on its row, or **Clear** the list — the
  clear asks first, states how many will go, and says plainly that the
  underlying request, message or report is _not_ deleted. Both survive a reload.
- **Admins** get a _Send announcement_ composer: pick everyone / students /
  tutors / admins, write a title and body, and it lands in those inboxes. The
  composer says plainly that delivery is device-local — there is no mail server
  in a build with no backend.

Notes never contain contact details, and nothing is claimed to have been
emailed or texted. Wire Supabase (or an edge function) if you want delivery to
leave the browser.

Every student, tutor and admin page shows a **locked panel** to the wrong role
(`assets/js/locked.js`), so nobody lands on a blank screen.

---

### Chat safeguarding

Chat is built for minors first. Every message is checked for phone numbers, social
handles, apps, email, links, payment outside the platform, bad language, threats and
grooming language. Blocked text is shown to the sender as `####` with a plain
warning and is never delivered; the recipient sees nothing. Two blocks in 30 days mute
chat for 24 hours, a third locks it, and grooming language locks it at once and raises
an urgent alert. Self-harm wording is never blocked: the sender is pointed to Childline
Kenya (116) and an admin is told. Admins act from the **Safeguarding queue** on
`admin/safety.html`: dismiss, warn, mute, lock or suspend, all audit-logged.

The browser runs the checks for instant feedback (`assets/js/safety.js`); the same
rules run in the database (`safety_scan`, `safety_intake`, `screen_message`), so a
message sent straight to the API is screened too. Learners are also kept out of chat
between 9 pm and 6 am. The full ladder is in [`docs/SECURITY.md`](docs/SECURITY.md#chat-safeguarding).

## The safety check, and who owns what

Two things changed in v9 that are worth knowing before reading the code.

**Every new account walks the safety check before it can use the app.** The gate
lives in `assets/js/onboarding.js` (`onbGuard()`), the flow in
`assets/js/pages/welcome.js`, and the record in `S.onboarding[accountId]`:

```
{ dob, age, county, school, guardian {name, relation, phone, ack},
  docsRead: ["community", "privacy", "consent"], docsSkipped,
  signed: { name, ts, version, docs, age, guardian },
  completed }
```

- Age is computed from a date of birth — there is no "I am 18" checkbox.
- Under 18 → a guardian name, phone, relationship and an explicit acknowledgement
  are required before the signature step unlocks.
- Every safety document has to be opened and ticked individually; the signature
  records which ones, the version and the time.
- Tutors get an extra step for the four verification documents and can skip it.
  Skipping is recorded (`docsSkipped`) and the profile keeps saying **unverified** —
  the app never claims a check nobody made.
- Accounts that existed before this shipped (including the three demo accounts)
  are marked `legacy` and are not forced through it; the Safety centre and the
  profile page both offer the documents again.

**A picture, a profile and a signature belong to an account, not a device.**
`S.profile` is the live copy for whoever is signed in; `S.profiles[accountId]` is
the shelf it is saved onto and read back from, in `pfStashProfile()` /
`pfHydrateProfile()` (core.js). Hydration runs _before_ the first save, or that
save would copy the default profile over the shelf — which is exactly the bug
that showed one person's photo to the next.

**A new account starts empty.** Grades, the career-check result, the shortlist,
the tracker, notifications — all of it is shelved per account id (`pfSwitchAccount`
in `core.js`) and handed back only to the account that made it. Signing up on a
phone the demo student used gives you a clean app, and any demo-seeded request or
notification is cleared out of your way. The demo accounts keep their showcase, and
the "getting started" dashboard shows four numbered steps instead of someone else's
numbers.

**A real camera.** "Take a photo" in the avatar picker and in the tutor's paper
upload opens a live viewfinder (`assets/js/camera.js`, `getUserMedia`) with a
front/back flip, then captures and squares the frame. Where the browser has no
camera API, or permission is refused, the same button falls back to the file input
(which on a phone opens the camera app anyway), and the stream is stopped on capture,
cancel, Escape and outside-click.

The avatar picker has three tabs. **Faces** offers ten illustrated avatars
(`assets/avatars/`, 41 KB for the whole set, precached so they work offline) with
an optional plain, ring or glow edge. **Initials** draws a monogram on one of
eight backgrounds — gradient, mesh, aurora, dots, sunset, solid, soft and ring —
in any of fourteen colours, every one of them built from the same two-colour
swatch so a new colour gets all eight for free. **Photo** comes from the camera:
a `<input type="file" capture="user">` sits beside the normal file input, so a
phone opens the front camera and a desktop falls back to a file dialog. Photos are
cropped to 160 × 160 and stay on the device. A picture belongs to one account: signing
out shelves it, a new account never inherits it, and other people's names only ever
show initials. The camera needs `camera=(self)` in the Permissions-Policy header, which
is set in `vercel.json` and `_headers`.

The emoji tab that used to sit here is gone — an emoji renders differently on
every phone, cannot be tinted or framed, and shows as an empty box where the font
is missing. A preference saved as `{kind:"emoji"}` is mapped to a face on the way
in, so nobody's picture disappears.

## Two modes

|                      | Demo mode (no keys)                            | Live mode (Supabase)                                                       |
| -------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Accounts             | Stored in this browser, PBKDF2-hashed          | Supabase Auth — the role and the suspended flag come from the database     |
| Roles                | Chosen at sign-up                              | Set by a database trigger; admins are promoted by hand                     |
| Data                 | `localStorage` only, nothing leaves the device | Postgres with row level security on all 29 tables                          |
| Admin console        | Reads this device                              | Reads every profile, suspends and restores accounts, writes an audit trail |
| Writes while offline | Straight to `localStorage`                     | Queued per row (`S.syncQueue`) and replayed in order                       |

Which mode you get depends on one file, `assets/js/supabase-config.js`. Leave the
URL and key empty for demo mode; fill them in and the sign-in path moves to
Supabase. The publishable (anon) key is meant to ship to the browser — what it
can reach is decided by the policies in `supabase/schema.sql`. **Never** put the
`service_role` key in this repo.

### Going live with Supabase

The full steps are in [`supabase/README.md`](supabase/README.md). The short version:

1. Run `supabase/schema.sql`, then `supabase/seed.sql`, in the SQL editor.
2. Put the project URL and publishable key in `assets/js/supabase-config.js`.
3. Create your own user in the Supabase dashboard (Authentication → Users), then make
   it the admin: `update public.profiles set role = 'admin' where email = 'you@example.com';`
   The owner address is set in `is_owner()` and `guard_profile()` in `schema.sql`.
   Nobody can register as admin: the sign-up form offers learner and tutor only.
4. Turn on **Confirm email** in Authentication → Providers → Email before real
   learners sign up.

### What is wired, and what is not

- Auth, profiles, roles, suspension, the admin audit trail and the sync queue are
  wired. `handle_new_user` creates the profile row from sign-up metadata, so the
  browser cannot ask for the admin role.
- Column guards (`guard_profile`, `guard_tutor_profile`, `guard_booking`,
  `guard_review`) decide which columns a user may change: nobody edits their own
  role, verifies themselves, or approves their own booking.
- The nine sample tutors exist in demo mode only. In live mode learners see just the
  tutors an admin has verified (the `tutor_directory` view); with none yet, the page
  says so. Learner-side bookings with a real tutor sync. The tutor's own desk still
  reads this device's bookings, so tutor-side sync is the next piece to build.
- Notifications are written by database triggers and by admins; a learner's
  browser cannot insert one, so it does not try.
- The signed safety check (date of birth, guardian, documents read) is also written
  to `safety_consents`. The database refuses chat until it exists, refuses learners
  under 13, and refuses under-18s whose guardian has not acknowledged.
- Payments are **not** live. Session fees are recorded at the published rate,
  never charged. Email delivery of notifications is not set up either.

## Repo layout

```
pathfinder/
├── index.html · signin.html · signup.html · legal/     public pages
├── student/          12 pages (dashboard, welcome, onboarding, quiz, cluster,
│                              tracker, institutions, funding, tutors, messages,
│                              sessions, profile)
├── tutor/            7 pages  (welcome, dashboard, students, schedule,
│                              sessions, messages, profile)
├── admin/            9 pages  (one console, nine deep-linkable tabs)
├── assets/
│   ├── css/          style.css  = design tokens
│   │                 app.css    = components (console, bell, charts, shell)
│   ├── js/           17 shared modules, loaded in a fixed order
│   │   ...           data · stages · core · charts · notify · avatar · chat · shell …
│   │   pages/        one module per page: the page owns its own markup
│   └── icons/        app icon + maskable icon
├── supabase/         schema.sql (27 tables, 50 policies, triggers) · seed.sql · README
├── tests/            app · admin · ui · roles      (behaviour, jsdom + plain node)
├── tools/            check_html · check_sql · click_check · render_check · gen_seed
├── docs/             ROLES · DESIGN · SECURITY
└── .github/workflows ci.yml  — tests, audits, seed sync, render, click sweep
```

Rules the layout follows: a page module never exports; a shared module never
reaches into page markup; SQL is the only place a table is described; and every
tool under `tools/` is runnable on its own with no setup.

## How a page is built

Every page loads the same sixteen shared modules in the same order, then one
page module:

```html
<script src="../assets/js/icons.js"></script>
<!-- SVG sprite, injected -->
<script src="../assets/js/supabase-config.js"></script>
<!-- the only config file -->
<script src="../assets/js/data.js"></script>
<!-- institutions, scholarships, counties, clusters -->
<script src="../assets/js/stages.js"></script>
<!-- CBC vs 8-4-4: stages, levels, bands, pathways -->
<script src="../assets/js/core.js"></script>
<!-- state, storage, helpers, toasts, crypto -->
<script src="../assets/js/charts.js"></script>
<!-- dependency-free SVG line + donut charts -->
<script src="../assets/js/notify.js"></script>
<!-- top-bar bell, inbox, announcements -->
<script src="../assets/js/avatar.js"></script>
<!-- avatars: illustrated faces, initials or uploaded photo -->
<script src="../assets/js/supabase.js"></script>
<!-- auth + REST + offline queue (inert by default) -->
<script src="../assets/js/safety.js"></script>
<!-- chat filter -->
<script src="../assets/js/chat.js"></script>
<!-- moderated chat + report, shared by learner and tutor -->
<script src="../assets/js/cluster.js"></script>
<!-- the scoring maths -->
<script src="../assets/js/recommend.js"></script>
<!-- pathway + institution recommendations -->
<script src="../assets/js/motion.js"></script>
<!-- entrance animations, respects reduced-motion -->
<script src="../assets/js/locked.js"></script>
<!-- role gating -->
<script src="../assets/js/shell.js"></script>
<!-- nav, sidebar, footer, session guard -->
<script src="../assets/js/auth.js"></script>
<!-- sign-up / sign-in / sign-out -->
<script src="../assets/js/pages/cluster.js"></script>
<!-- page behaviour -->
```

Rules that keep it honest:

- **No inline JavaScript.** The CSP in `_headers` forbids it; `npm run check` fails the build if one sneaks in.
- **The page module owns the page.** Shared modules never reach into page markup.
- **`data-page` on `<body>`** tells `shell.js` which nav item is active and which role may view it.
- **Config is one file.** `supabase-config.js` is the only place credentials live.

### The scoring maths

```js
weighted = sqrt((r / 48) * (t / 84)) * 48;
```

`r` = sum of the four cluster-subject grades (capped at 48), `t` = the best seven
grades across all subjects (max 84). A–E map to 12–1 points. All fourteen cluster
groups are in `assets/js/data.js` with their real subject weights; `cluster.js`
picks the best-scoring subject per slot, which is exactly what KUCCPS does when
it computes your cluster points.

---

## Testing

| Command                       | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`                    | 165 unit checks (data integrity, scoring, the CBC/8-4-4 stage model, KJSEA bands, pathway fit, recommendations, safety filter, escaping), the static audit of all 33 pages, and the Supabase schema audit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `npm run test:render`         | Boots every page in jsdom with scripts inlined (fails on any runtime error or empty container), then runs the 219-check admin suite (including the live-Supabase write paths), the 337-check UI suite, the 82-check role suite and the 56-check onboarding suite. Needs `npm i -D jsdom`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `npm run test:admin`          | Just the admin console: sidebar groups and footer, nine tabs in order, uploaded verification documents reaching the reviewer, the session diary and admin messaging, masked contact, approve/decline/suspend/verify persistence, audit rows, DPA register, the profile card and Safety centre panels, and the access guard, plus a learner report, the restrict/lift flow and who gets told.                                                                                                                                                                                                                                                                                                                                                                                               |
| `npm run test:ui`             | The inbox and session pages, reporting from every entry point, a restricted account losing its composer, and a complaint about the team; the bell and its panel (badge counts, `DEMO` labels, unread filter, mark-all-read, per-role scoping, announcements), **that the panel survives an outside click**, per-note delete and clear-all persistence, the **avatar picker** (ten faces, no emoji left, an old emoji preference still rendering), **per-account state isolation**, the **camera fallback**, **sign-up with and without an email-confirmation requirement**, and the **86-institution directory** (counts, county filter, colleges tab), stage-awareness in the quiz, dashboard and cluster pages, the **career-check reveal**, the progress ring, and the phone CSS rules. |
| `npm run test:roles`          | What an admin, tutor and learner can actually do: filters, the action trail, report resolution, application decisions, session completion and the ledger, verification evidence, reviews, slot changes, the learner and tutor inboxes, team-thread replies in both directions, reports filed by either side, and a restricted account being refused a send. 82 checks.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm run test:onboarding`     | The safety check end to end: the gate on a new account, the age maths, the guardian step for a minor, the documents that cannot be skipped, the signature and what it stores, the tutor's skippable papers step, and that a picture and a signature never cross accounts. 41 checks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `npm run test:sql`            | Audits `supabase/schema.sql`: RLS on every table, a policy for every table, no world-readable personal table, every index/trigger/FK pointing at a real table, and a seed that cannot duplicate rows.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `npm run test:clicks`         | Boots all 27 signed-in pages and presses every reachable control (226 of them), closing modals as it goes — proves nothing throws.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `npm run seed`                | Regenerates `supabase/seed.sql` from `assets/js/data.js`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `npm run format`              | Prettier over the JS, CSS, HTML, tests and tools (`.prettierrc`, no build step involved).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `python3 tools/check_html.py` | The static audit on its own: doctype, meta, dead links, duplicate ids, undefined icons, script order, inline handlers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

The suite is dependency-free on purpose — `tests/app.test.js` is a plain Node
script, so CI needs no install for the part that matters.

### Phone first

The design targets a 360–420 px screen first, because that is the phone most
learners will use.

- Layouts restack at 720 px, 400 px and 320 px: KPIs go 4 → 2 → 1 across, the
  chart and the ring stack, tables scroll inside their card instead of pushing
  the page sideways, and `overflow-x: hidden` on `html, body` means nothing can
  drag the page.
- Every control is at least 44 px tall and full-width where it reads better;
  inputs are 16 px so iOS does not zoom on focus.
- The notification panel becomes a pinned sheet that stops short of the bottom
  bar, with the delete button always visible (no hover on a touch screen) and
  `env(safe-area-inset-bottom)` respected on notched phones.
- The modals dock to the bottom on small screens, avatars and colour swatches
  grow to thumb size, and the picture picker's tabs stick while you scroll.
- `npm run test:ui` asserts those rules exist, so a later edit cannot quietly
  drop them.

CI (`.github/workflows/ci.yml`) runs `npm test` on every push, verifies that
`seed.sql` is in sync with `data.js`, and runs the render check.

---

## Data, and how much to trust it

- **86 institutions** — 38 public universities, 32 private universities, 7 public university colleges, 3 private university colleges, 5 national polytechnics, 1 KMTC campus. All 70 chartered universities are in the register, each with its county and town; the 12 studied in depth also carry cluster cut-offs, fees and programme lists, and the rest say plainly that those are not in the dataset rather than inventing them.
- **12 scholarships** — HELB, TVET bursary, county funds, NG-CDF, and five foundations, each with a real deadline and an `https` link.
- **47 counties**, **14 cluster groups**, **6 pathways**, **6 interest questions**, **8 demo tutors**, **5 funding bands**, **12 subjects**, **12 KCSE grades**, **4 CBC levels**, **8 KJSEA bands**, **3 senior pathways**.

### The two systems, in one place

Kenya is running two systems at once, so `assets/js/stages.js` is the single
source of truth for both and every page asks it rather than hard-coding a
scale:

| Stage                    | System | Ends with                              | Grading used in the app                                                 |
| ------------------------ | ------ | -------------------------------------- | ----------------------------------------------------------------------- |
| CBC Grade 4–6            | CBC    | KPSEA (Grade 6, October)               | four achievement levels                                                 |
| CBC Grade 7–9            | CBC    | KJSEA (Grade 9, late October)          | four levels; placement blends 20% KPSEA + 20% Grade 7–8 SBA + 60% KJSEA |
| CBC Grade 10–12          | CBC    | Grade 12 assessment (from 2028)        | four levels across 4 core + 3 pathway electives                         |
| KCSE Form 1–2 / Form 3–4 | 8-4-4  | KCSE — **final sitting November 2027** | A–E, 12→1 points, KUCCPS cluster maths                                  |
| Post-KCSE / resitting    | 8-4-4  | 2027 resit                             | A–E                                                                     |

The four CBC levels are EE (Exceeding), ME (Meeting), AE (Approaching) and BE
(Below Expectation); KNEC reports them at KJSEA in **eight bands** (EE1 90–100
= 8 points … BE2 0–10 = 1). Senior school has **three** pathways — STEM, Social
Sciences, and Arts & Sports Science — with seven learning areas: four core plus
three electives. The app never converts a CBC level into a KCSE point, and says
so on the page instead of printing a zero.

Programme cut-offs move every year and funding rules change with each budget
statement. Every page that shows a number also shows where it comes from, and
the deployment page lists the sources to re-verify before a new intake. Treat
this build as a **pilot**: accurate on the maths, indicative on the cut-offs.

---

## Deploying

Any static host works — there is nothing to build.

| Host             | Steps                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Vercel**       | Import the repo. Framework preset _Other_, no build command, output `.` — `vercel.json` already sets the headers.      |
| **Netlify**      | Publish directory `.`, no build command. Copy the rules from `_headers`.                                               |
| **GitHub Pages** | Settings → Pages → deploy from branch, root. `sitemap.xml` and `robots.txt` are relative, so they work from a subpath. |
| **Any box**      | `python3 -m http.server` behind nginx/Caddy. Serve over HTTPS — the service worker and clipboard APIs need it.         |

`sw.js` caches the shell and the assets for offline use; `manifest.json` makes it
installable on Android and iOS.

---

## Security and privacy

Short version: **no grade data leaves the device** unless you sign in against a
Supabase project — and even then the browser never decides a role, only the
database does.
Local accounts are PBKDF2-hashed (60 000 iterations, per-account salt); chat
messages are screened for contact details, abuse and grooming language, in the
browser and again in the database; RLS in `supabase/schema.sql` makes every row readable only
by its owner (plus admins). Full detail in [`docs/SECURITY.md`](docs/SECURITY.md).

---

## Documentation

- [`docs/ROLES.md`](docs/ROLES.md) — the full capability matrix: what a learner, a tutor and an admin can do, where it lives, and what is deliberately not built.
- [`docs/DESIGN.md`](docs/DESIGN.md) — design system: colour, type, spacing, components, mobile rules.
- [`docs/SECURITY.md`](docs/SECURITY.md) — threat model, RLS, CSP, what is and is not encrypted.
- [`supabase/README.md`](supabase/README.md) — the ten-minute path from demo mode to real accounts.

---

## Licence

MIT — see [`LICENSE`](LICENSE). Built for Kenyan students; fork it for your county,
your college or your NGO.
