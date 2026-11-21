# Audit: what is verified, what is indicative

This build was checked against the original single-file prototype and against the
KUCCPS rules it claims to implement. The point of this page is to be explicit
about the difference between _tested_ and _believed_.

## Verified by automated tests

`npm test` — 68 unit checks, plus a static audit of all 25 pages.

| Area            | What is asserted                                                                                                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data integrity  | 24 institutions (12 public, 6 private, 5 TVET, 1 KMTC); 12 scholarships all with `https` links; 47 unique counties; 14 cluster groups × 4 slots; 6 pathways; 6 questions × 4 options; 8 tutors; 5 funding bands; 12 subjects; 12 grades |
| Scoring         | A = 12 … E = 1; all-A best-7 = 84; all-B best-7 = 63; cluster cap = 48; empty grades never throw                                                                                                                                        |
| Slot selection  | per-slot best subject is chosen; `weighted` never exceeds 48; the quoted "biggest lift" is the true best single-grade gain among the cluster subjects, recomputed with both _r_ and _t_                                                 |
| Recommendations | every pathway maps to at least one institution; a 63-point profile is eligible for the courses it should be; below-cut-off courses are not offered                                                                                      |
| Safety          | phone numbers, `@handles`, emails, app names and profanity are blocked; ordinary text passes                                                                                                                                            |
| Escaping        | `< > " ' &` all escaped                                                                                                                                                                                                                 |
| Avatars         | deterministic, inline `<svg>`, gradient defs, initials only                                                                                                                                                                             |
| Pages           | doctype, lang, charset, viewport, theme-color, description, live links, unique ids, defined icon ids, script order, no inline handlers or scripts                                                                                       |

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

- **Programme cut-offs.** The per-course cut-offs are representative of recent
  intakes, not a live KUCCPS feed. They are labelled as guidance on every screen
  that shows them.
- **Cluster weights.** The subject weights follow the published cluster
  documents; if KUCCPS revises a group, update `assets/js/data.js` and re-run
  `npm run seed`.
- **Scholarship deadlines.** Twelve real funds with real links, but deadlines move.
  The funding page shows the date and links out; verify each cycle.
- **HEF/HELB bands.** The five bands model the current funding model; the actual
  award depends on the household-means test.
- **Tutor profiles.** The eight tutors are demo records. Verification is an admin
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

- the bell exists on every signed-in page, inside the top bar, with a label
  screen readers can read, and no console errors;
- the badge equals the number of unread notes **for that role** — recomputed
  from state, never hard-coded;
- every seeded row carries `DEMO`, and only three exist per role;
- the panel opens on the bell, sets `aria-expanded`, lists exactly the role's
  notes (a student never sees a tutor-only row), shows source and relative time,
  and states where notes are kept;
- the Unread filter, **Mark all read** (badge clears, state persists) and
  opening a note (closes the panel, routes through `go()`, marks it read) all
  behave;
- an admin decision on a seeded request creates a real, non-DEMO note aimed at
  the learner with a working link;
- the announcement composer offers exactly four audiences and the resulting note
  is visible in another role's inbox on the next boot;
- the student graph draws one point per logged date, marks the target, labels
  the axis with units, reports the true delta, and — with no assessments — draws
  **no** line and shows an empty state instead; a single log renders one point
  and no line.

### Role capabilities — `npm run test:roles` (64 checks)

Proves the three roles can do their job, not just see their pages.

- **Admin** — search and status filters narrow the queue and survive a re-render;
  every decision (approve, decline, hold, reopen, suspend, reinstate, role change,
  verification toggle, report resolution, application decision, seeded demo row)
  appends one line to the action trail with actor, action and target; a report
  cannot be resolved without a written outcome and the learner receives it; tutor
  applications move to approved/rejected with a stored decision and a
  notification; evidence a tutor submitted is visible inside the verification
  panel while the reviewer keeps the final say.
- **Tutor** — a request awaiting approval cannot be completed, a confirmed one
  can; completing writes the timestamp, the ledger row at the published rate, the
  learner notification, and moves the earnings total; evidence submission stores
  the reference and tells the reviewer; the badge does not flip on its own.
- **Learner** — a review is offered only for a completed session, refuses to save
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

---

## v6 — notifications you control, a stage-aware student area, and the phone pass

Six changes, each with the evidence that proves it. Every count below comes
from a run of the suites named beside it.

### 1. The bell panel cannot disappear on you

`assets/js/notify.js`. The document-level click listener that dismissed the
panel is gone — the comment in its place says why, so nobody re-adds it. The
panel closes on the ✕, on `Esc`, or when a row navigates somewhere. Rows are
now `div[role=button] tabindex=0` with their own delete button beside them
(buttons cannot nest), and `Enter`/`Space` open a row from the keyboard.

Deleting: `removeNotes(ids)` filters `S.notes`, saves, repaints the bell and the
list. One row via the ✕ on the row; the whole list via **Clear**, which opens a
confirm dialog naming the count and stating that the underlying request,
message or report is untouched. Both survive a reload.

_Evidence (`tests/ui.test.js`)_ — "pinned: an outside click leaves it open",
"pinned: Escape closes it", "delete: one note removed", "delete: the panel stays
open", "clear: confirm dialog opens", "clear: nothing left for this role",
"clear: stays cleared after a reload".

### 2. A profile picture you can actually change

`assets/js/avatar.js`. `genAvatar()` now honours `S.profile.avatar`:

| Kind     | Stored as                                          | Rendered as                         |
| -------- | -------------------------------------------------- | ----------------------------------- |
| initials | `{kind:"initials", style, colour}`                 | inline SVG, four styles × 8 colours |
| icon     | `{kind:"emoji", emoji, colour}`                    | emoji on a gradient tile            |
| photo    | `{kind:"upload", data:"data:image/jpeg;base64,…"}` | 160 × 160 cover crop                |

A photo is cropped and shrunk on a `<canvas>` before it is stored (6 MB cap,
image types only, `FileReader` errors surfaced), because a modern phone photo
would blow the localStorage budget in one go. The picker is reachable from the
profile page (both the big avatar and a button) and from the account sheet in
the top bar; Reset restores initials. The top-bar chip, the account sheet and
the page all repaint from the same state field.

_Evidence_ — "pfp: three ways to pick", "pfp: eight colours", "pfp: saved to the
profile", "pfp: the top-bar chip picks it up", "pfp: reset restores initials".

### 3. The student area follows the stage

New module `assets/js/stages.js` (loaded by all 26 pages, listed in
`tools/check_html.py` `CORE_ORDER`). One place knows:

- six stages — CBC Grade 4–6, Grade 7–9, Grade 10–12; KCSE Form 1–2, Form 3–4,
  post-KCSE — with the exam, the next step and the subject list for each;
- 25 legacy/typed labels that resolve to a stage (`"Form 2"`, `"Grade 8"`,
  `"Form Four leaver"`, `"TVET scholar"` …), defaulting to Form 3–4;
- the four CBC levels (EE 4 pts → BE 1 pt) and the eight KJSEA bands
  (EE1 90–100 = 8 … BE2 0–10 = 1, no gaps, verified in the unit suite);
- the three senior pathways with their electives, and the four core areas;
- helpers every page uses — `gradeOptions`, `gradeValue`, `gradePctFor`,
  `cbcLevelFor`, `cbePathwayFit`, `stageReadiness`, `stageTimeline`,
  `scorePathsForStage`.

What that changes in practice:

| Page      | CBC learner sees                                               | 8-4-4 learner sees                             |
| --------- | -------------------------------------------------------------- | ---------------------------------------------- |
| quiz      | EE/ME/AE/BE per learning area, pathway picker in senior school | A–E per subject, cluster feasibility           |
| dashboard | average **level**, KJSEA/KPSEA line, pathway fit               | average grade, best-7 aggregate, November 2027 |
| cluster   | "cluster points are an 8-4-4 idea" + pathway fit               | the 14-cluster weighted table                  |
| tracker   | targets as levels                                              | targets as grades                              |

Nothing converts a CBC level into a KCSE point, and no page prints a zero for a
number that does not exist in that system.

_Evidence_ — 45 new unit checks in `tests/app.test.js` (including "no throw for
each of the six stages"), and "stage: quiz asks for CBC levels", "stage: no A–E
grades in CBC mode", "stage: switching to Grade 7–9 swaps the scale", "stage: no
KCSE cluster aggregate in CBC", "stage: CBC gets pathway fit, not clusters".

### 4. Something to look at when the career check ends

`assets/js/pages/quiz.js`. The result step now opens with a **reveal**: a purple
panel with a match ring (the donut from `charts.js`), the strongest pathway
named in the headline, the learner's two strongest traits in words, their
strongest area, and the next step for their stage — then a button that expands
the ranked breakdown underneath and shrinks the reveal to a header. There is
also "Save as a card", which writes a plain-text summary through the existing
`saveFile()` (no network, no canvas, works in the preview and on a phone).

The breakdown itself gained `<details>` subject tables (so four cards are no
longer a wall of numbers), a "biggest single lift" line, and stage-correct
wording — the CBC version says outright that cluster points do not apply.

_Evidence_ — "reveal: a celebration renders", "reveal: has a progress ring",
"reveal: three facts about the learner", "reveal: see-the-breakdown opens it",
"cbc result: no KUCCPS cluster claim", "cbc result: no errors".

### 5. A better graph, and a ring beside it

`assets/js/charts.js`.

- `pfLineChart` — four y-ticks with units, a softened baseline, a three-stop
  area gradient, a cubic path (straight joins under three points), dots with a
  hover halo, a target line with a label chip, thinned x-labels, and a `<title>`
  per point so the value is available without hovering.
- `pfDonut` — a new 160 × 160 ring with rounded caps, a track, a centre
  headline, and a legend showing each share as a percentage.

The dashboard puts them side by side: the line is _progress over time_, the ring
is _the mix behind it_ (KCSE grade bands, or CBC levels), with the average in
the centre. On a phone the ring moves under the line and becomes horizontal.

_Evidence_ — "pie: a donut renders beside the line", "pie: it has an arc per
grade band", "pie: the legend shares add to 100%", "pie: the line is smoother
(cubic)", "phone: the ring stacks under the line"; the earlier graph checks (one
point per logged date, target rule, no invented series) all still pass.

### 6. Pages a person can read

The student pages were rewritten around one pattern: **`page-head`** (title,
stage chip, actions) → **sections** (`sec-head` + one job each) → **numbered
detail behind `<details>`**. Concretely: a KPI row of four cards, a progress
section with two panes, a "what's next" checklist with ticks and the stage
timeline, and a grid of five quick-action tiles that each say what you will find
behind them. Label pairs (`kpi-lab` / `kpi-num` / `kpi-foot`) replace the
inline-styled divs, and `stack`, `sec-head`, `page-acts` and `qa` are real
components in `app.css` rather than one-off styles.

_Evidence_ — `tools/render_check.js` "ALL 26 PAGES CLEAN"; `tools/click_check.js`
"20/20 pages click-clean · 191 controls" (up from 177, the new picker and panel
buttons included); `check_html.py` passes with the new script in `CORE_ORDER`.

### 7. The phone pass

Three breakpoints over the whole app (720 px, 400 px, 320 px) plus a safety net
that also covers the public pages and the admin console: no horizontal scroll,
44 px tap targets, 16 px inputs, safe-area padding, modals docked to the bottom,
scrollable tables and tab bars, and a fixed notification sheet that stays clear
of the bottom bar. The rules are asserted in `tests/ui.test.js` ("phone: …"),
so they cannot be silently deleted.

_Not verified here:_ there is no headless browser in this environment, so the
phone pass is verified by rule (CSS syntax, breakpoint presence, no fixed
widths wider than 420 px) and by the layout maths, not by a screenshot. Open the
preview at 390 px and tell me what still looks cramped.
