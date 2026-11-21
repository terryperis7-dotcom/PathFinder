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
2. **Which of the 24 institutions here will take me?** — filtered by pathway,
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

| Page | What it does |
| --- | --- |
| `index.html` | One-page pitch: the 48-point problem, the four steps, live cluster demo, pricing (free), FAQ. |
| `signup.html` | Account creation, 47 counties, role choice (student / parent / tutor), password rules. |
| `signin.html` | Email + password, demo accounts one click away. |
| `legal/privacy.html`, `legal/terms.html` | Plain-language privacy notice (Kenya Data Protection Act 2019) and terms. |

### Student

| Page | What it does |
| --- | --- |
| `student/onboarding.html` | Four steps: pathway → grades → interests → county/budget. Writes the profile. |
| `student/dashboard.html` | Average/strongest/weakest/top-match KPIs, **progress-over-time graph** drawn from your logged assessments, scores-vs-targets bars, next-step cards, sidebar + bottom nav. |
| `student/quiz.html` | Six-question interest assessment → RIASEC-style code → ranked pathways. |
| `student/cluster.html` | All 14 cluster groups with weighted points, `/48` cap, per-slot best-7 aggregate, **biggest single lift** ("raise Chemistry one grade → +X"). |
| `student/institutions.html` | 24 institutions, search, star shortlist, detail modal, TVET/KMTC filter. |
| `student/funding.html` | Five funding bands, 12 scholarships with deadlines and links, accordion. |
| `student/tracker.html` | Mock-by-mock log, target grade per subject, trend, JSON export. |
| `student/tutors.html` | Eight tutor cards, request → booking, **change the slot** on an open request, moderated chat, **review a completed session** (stars + comment), report a tutor. |
| `student/profile.html` | Language, county, grades, export data, delete account. |

### Tutor

`tutor/dashboard.html` · `students.html` · `schedule.html` · `sessions.html` · `profile.html`

Workspace with the student list, the 35-cell week grid, verification state, and now:

| Capability | Where | What it does |
| --- | --- | --- |
| Accept / decline a request | Overview · Requests | Writes the decision, messages the learner, notifies them |
| **Mark a session complete** | Session log | Sets `Completed`, stamps the time, writes a ledger row at the published rate, and asks the learner for a review |
| **Earnings ledger** | Session log | Completed sessions, value at the pilot rate, "last 7 days", CSV export. *Payments are not live and the page says so.* |
| **Submit verification evidence** | Verification | Reference for a missing check reaches the reviewer; the badge still only appears when an admin records it |
| Availability | Availability | Open/close slots — exactly what learners can request |

### Admin (role-gated, seven tabs)

One console, seven tabs, seven real URLs — each deep-linkable and shareable.

| Page | What it does |
| --- | --- |
| `admin/dashboard.html` | Overview: accounts, open requests, open reports, suspensions, a "what needs attention" queue with direct actions, pathway coverage and a device activity feed. |
| `admin/requests.html` | Learning requests: learner, focus, mode and a **masked** contact the reviewer can reveal per row. Approve / mark in review / decline / reopen, plus CSV export. |
| `admin/users.html` | Accounts and roles (your own row is read-only), tutor verification states with a four-check record panel, tutor application queue. |
| `admin/safety.html` | Open and resolved learner reports with suspend / dismiss / reopen, suspended-tutor list with reinstatement, and the blocked-message log. |
| `admin/data.html` | Reference-data audit: 24 listings, 12 scholarships, 14 clusters, RIASEC coverage, cluster engine check — pass / advisory / error, with the official source for each and CSV export. |
| `admin/deployment.html` | Live build checks (HTTPS, storage, service worker, manifest, Supabase, crypto, filter) plus the six-step path to hosted auth. |
| `admin/dpa.html` | Kenya DPA 2019 posture, the local data inventory, and the launch gaps that must close before real learners. |

### What an admin can do today

| Capability | Where |
| --- | --- |
| Approve / decline / hold / reopen a learning request | Requests |
| Filter any list by search + status chips (state survives navigation) | Requests · Users · Safety |
| Resolve a report with a written outcome — the learner is told, the text is kept | Safety |
| Dismiss, reopen, suspend a tutor, reinstate | Safety |
| Record or revoke each of the four verification checks (evidence submitted by the tutor is shown inline) | Users & roles → Verify |
| Approve or reject a tutor application, with the decision and reason stored | Users & roles |
| Change a role, remove an account (two-tap), export accounts | Users & roles |
| **Action trail** — every decision, who made it, to whom, newest first, CSV export | Overview |
| Announce to everyone / students / tutors / admins | Bell → Announce |
| Reference-data audit, deployment checks, DPA register, four CSV exports | Data · Deployment · DPA |

The sidebar groups match the console: **Admin console** (Platform overview,
Users & roles, Learning requests, Safety reports), **Operations** (Data audit,
Deployment, Data protection) and **Public surface** (Institution directory,
Public homepage), with **Account & workspace**, **Safety centre** and **Sign out**
in the footer. Both of those footer panels are real modals available on every
page, for every role:

* **Account & workspace** — who is signed in, the storage mode, live counts
  (requests, reports, blocked messages), export-my-data and sign out.
* **Safety centre** — the six protection rules, the reports you have filed, and
  what to do in an emergency.

Everything is computed from data actually in the app or accounts on this
device — nothing is pre-filled, seeded rows are labelled `DEMO`, and a
verification badge only appears after a reviewer records the check. Decisions
persist: approving a request writes `Confirmed` to state, and the tutor
workspace reads the same rows.

### Notifications

Every signed-in page — student, tutor, admin and the public pages — carries a
**bell in the top bar** (`assets/js/notify.js`):

* The badge is the real number of unread notes for *your* role. It is never a
  decoration: three seeded rows are labelled `DEMO` in the list, and the rest
  appear only when something actually happens.
* Notes are created by real actions: sending a session request (learner **and**
  tutor are notified), an admin decision on a request, a safety report, a
  suspension or reinstatement, a verification change, a completed career check,
  and a message stopped by the safety filter.
* Each row shows who it came from, how long ago, and opens the page where you
  can act on it. `All` / `Unread` filters, mark-all-read and per-note read state
  persist in `pf-state-v1` on the device.
* **Admins** get a *Send announcement* composer: pick everyone / students /
  tutors / admins, write a title and body, and it lands in those inboxes. The
  composer says plainly that delivery is device-local — there is no mail server
  in a build with no backend.

Notes never contain contact details, and nothing is claimed to have been
emailed or texted. Wire Supabase (or an edge function) if you want delivery to
leave the browser.

Every student, tutor and admin page shows a **locked panel** to the wrong role
(`assets/js/locked.js`), so nobody lands on a blank screen.

---

## Repo layout

```
pathfinder/
├── index.html · signin.html · signup.html · legal/     public pages
├── student/          9 pages  (dashboard, onboarding, quiz, cluster, tracker,
│                              institutions, funding, tutors, profile)
├── tutor/            5 pages  (dashboard, students, schedule, sessions, profile)
├── admin/            7 pages  (one console, seven deep-linkable tabs)
├── assets/
│   ├── css/          style.css  = design tokens
│   │                 app.css    = components (console, bell, charts, shell)
│   ├── js/           16 shared modules, loaded in a fixed order
│   │   ...           core · charts · notify · safety · chat · shell · auth …
│   │   pages/        one module per page: the page owns its own markup
│   └── icons/        app icon + maskable icon
├── supabase/         schema.sql (27 tables, 50 policies, triggers) · seed.sql · README
├── tests/            app · admin · ui · roles      (behaviour, jsdom + plain node)
├── tools/            check_html · check_sql · click_check · render_check · gen_seed
├── docs/             ROLES · DESIGN · SECURITY · AUDIT
└── .github/workflows ci.yml  — tests, audits, seed sync, render, click sweep
```

Rules the layout follows: a page module never exports; a shared module never
reaches into page markup; SQL is the only place a table is described; and every
tool under `tools/` is runnable on its own with no setup.

## How a page is built

Every page loads the same sixteen shared modules in the same order, then one
page module:

```html
<script src="../assets/js/icons.js"></script>           <!-- SVG sprite, injected -->
<script src="../assets/js/supabase-config.js"></script> <!-- the only config file -->
<script src="../assets/js/data.js"></script>            <!-- institutions, scholarships, counties, clusters -->
<script src="../assets/js/core.js"></script>            <!-- state, storage, helpers, toasts, crypto -->
<script src="../assets/js/charts.js"></script>          <!-- dependency-free SVG charts -->
<script src="../assets/js/notify.js"></script>          <!-- top-bar bell, inbox, announcements -->
<script src="../assets/js/avatar.js"></script>          <!-- deterministic inline-SVG avatars -->
<script src="../assets/js/supabase.js"></script>        <!-- auth + REST + offline queue (inert by default) -->
<script src="../assets/js/safety.js"></script>          <!-- chat filter -->
<script src="../assets/js/chat.js"></script>            <!-- moderated chat + report, shared by learner and tutor -->
<script src="../assets/js/cluster.js"></script>         <!-- the scoring maths -->
<script src="../assets/js/recommend.js"></script>       <!-- pathway + institution recommendations -->
<script src="../assets/js/motion.js"></script>          <!-- entrance animations, respects reduced-motion -->
<script src="../assets/js/locked.js"></script>          <!-- role gating -->
<script src="../assets/js/shell.js"></script>           <!-- nav, sidebar, footer, session guard -->
<script src="../assets/js/auth.js"></script>            <!-- sign-up / sign-in / sign-out -->
<script src="../assets/js/pages/cluster.js"></script>   <!-- page behaviour -->
```

Rules that keep it honest:

* **No inline JavaScript.** The CSP in `_headers` forbids it; `npm run check` fails the build if one sneaks in.
* **The page module owns the page.** Shared modules never reach into page markup.
* **`data-page` on `<body>`** tells `shell.js` which nav item is active and which role may view it.
* **Config is one file.** `supabase-config.js` is the only place credentials live.

### The scoring maths

```js
weighted = sqrt( (r / 48) * (t / 84) ) * 48
```

`r` = sum of the four cluster-subject grades (capped at 48), `t` = the best seven
grades across all subjects (max 84). A–E map to 12–1 points. All fourteen cluster
groups are in `assets/js/data.js` with their real subject weights; `cluster.js`
picks the best-scoring subject per slot, which is exactly what KUCCPS does when
it computes your cluster points.

---

## Testing

| Command | What it does |
| --- | --- |
| `npm test` | 68 unit checks (data integrity, scoring, recommendations, safety filter, escaping), the static audit of all 26 pages, and the Supabase schema audit. |
| `npm run test:render` | Boots every page in jsdom with scripts inlined (fails on any runtime error or empty container), then runs the 118-check admin suite, the 65-check UI suite and the 64-check role suite. Needs `npm i -D jsdom`. |
| `npm run test:admin` | Just the admin console: sidebar groups and footer, seven tabs in order, masked contact, approve/decline/suspend/verify persistence, audit rows, DPA register, the Account & workspace and Safety centre panels, and the access guard. |
| `npm run test:ui` | The bell and its panel: badge counts, `DEMO` labels, unread filter, mark-all-read persistence, per-role scoping, an admin decision creating a real note, the announcement composer, and the student graph (points, target rule, delta chip, empty state). |
| `npm run test:roles` | What an admin, tutor and learner can actually do: filters, the action trail, report resolution, application decisions, session completion and the ledger, verification evidence, reviews, slot changes. 64 checks. |
| `npm run test:sql` | Audits `supabase/schema.sql`: RLS on every table, a policy for every table, no world-readable personal table, every index/trigger/FK pointing at a real table, and a seed that cannot duplicate rows. |
| `npm run test:clicks` | Boots all 20 signed-in pages and presses every reachable control (177 of them), closing modals as it goes — proves nothing throws. |
| `npm run seed` | Regenerates `supabase/seed.sql` from `assets/js/data.js`. |
| `npm run format` | Prettier over the JS, CSS, HTML, tests and tools (`.prettierrc`, no build step involved). |
| `python3 tools/check_html.py` | The static audit on its own: doctype, meta, dead links, duplicate ids, undefined icons, script order, inline handlers. |

The suite is dependency-free on purpose — `tests/app.test.js` is a plain Node
script, so CI needs no install for the part that matters.

CI (`.github/workflows/ci.yml`) runs `npm test` on every push, verifies that
`seed.sql` is in sync with `data.js`, and runs the render check.

---

## Data, and how much to trust it

* **24 institutions** — 12 public universities, 6 private, 5 TVET colleges, 1 KMTC campus.
* **12 scholarships** — HELB, TVET bursary, county funds, NG-CDF, and five foundations, each with a real deadline and an `https` link.
* **47 counties**, **14 cluster groups**, **6 pathways**, **6 interest questions**, **8 demo tutors**, **5 funding bands**, **12 subjects**, **12 grades**.

Programme cut-offs move every year and funding rules change with each budget
statement. Every page that shows a number also shows where it comes from, and
the deployment page lists the sources to re-verify before a new intake. Treat
this build as a **pilot**: accurate on the maths, indicative on the cut-offs.

---

## Deploying

Any static host works — there is nothing to build.

| Host | Steps |
| --- | --- |
| **Vercel** | Import the repo. Framework preset *Other*, no build command, output `.` — `vercel.json` already sets the headers. |
| **Netlify** | Publish directory `.`, no build command. Copy the rules from `_headers`. |
| **GitHub Pages** | Settings → Pages → deploy from branch, root. `sitemap.xml` and `robots.txt` are relative, so they work from a subpath. |
| **Any box** | `python3 -m http.server` behind nginx/Caddy. Serve over HTTPS — the service worker and clipboard APIs need it. |

`sw.js` caches the shell and the assets for offline use; `manifest.json` makes it
installable on Android and iOS.

---

## Security and privacy

Short version: **no grade data leaves the device** unless you connect Supabase.
Local accounts are PBKDF2-hashed (60 000 iterations, per-account salt); chat
messages run through a filter that blocks phone numbers, social handles, app
names and profanity; RLS in `supabase/schema.sql` makes every row readable only
by its owner (plus admins). Full detail in [`docs/SECURITY.md`](docs/SECURITY.md).

---

## Documentation

* [`docs/ROLES.md`](docs/ROLES.md) — the full capability matrix: what a learner, a tutor and an admin can do, where it lives, and what is deliberately not built.
* [`docs/DESIGN.md`](docs/DESIGN.md) — design system: colour, type, spacing, components, mobile rules.
* [`docs/SECURITY.md`](docs/SECURITY.md) — threat model, RLS, CSP, what is and is not encrypted.
* [`docs/AUDIT.md`](docs/AUDIT.md) — what has been verified, what is indicative, known gaps.
* [`supabase/README.md`](supabase/README.md) — the ten-minute path from demo mode to real accounts.

---

## Licence

MIT — see [`LICENSE`](LICENSE). Built for Kenyan students; fork it for your county,
your college or your NGO.
