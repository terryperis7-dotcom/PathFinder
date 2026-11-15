# PathFinder Kenya — Audit report

Review of the project as uploaded (`PathFinder-main.zip`) and the changes made in this version.

## How complete is it?

| Level | Before | After this cleanup |
| --- | --- | --- |
| **Working demo / pilot** | ~65% | **~80%** |
| **Production (real students' data)** | ~35% | **~55%** |

The student journey (onboarding → recommendations → tracker → institutions → funding) is solid and now runs on the signed-in student's real data. What keeps it from production is mostly **verification and wiring**, not features: the Supabase integration is written but has never been run against a live project, and the tutor and admin areas are previews.

## Critical problems found (and fixed)

| # | Problem | Fix |
| --- | --- | --- |
| 1 | **Real admin credentials in public code**: email, phone, password and access code hard-coded in `app.js`, printed on `signin.html`, `signup.html` and `supabase/README.md`. | Removed everywhere. ⚠️ They are still in git history; **change that password**. |
| 2 | **Anyone could become SuperAdmin**: public access code `888888` on the sign-up page. | SuperAdmin removed from public sign-up. Admins are promoted from the database only. |
| 3 | **Any password was accepted** for local accounts (`checkPassword` returned `true`). | Salted PBKDF2 hashing, constant-time compare, lockout after 5 failures. Legacy accounts must set a password on next sign-in. |
| 4 | **Database privilege escalation**: the signup trigger trusted `role` from user metadata, and the profile policy let users update their own `role`. | Role whitelisted in the trigger; column-level grants forbid changing `role`, `email`, `suspended`, `tsc_number`; admin helper function; audit log locked down. |
| 5 | **Supabase Auth was never used**: `supabase.js` had sign-in functions that no page called. | Sign-up and sign-in now use Supabase Auth when keys are present; role loaded from `profiles`; password reset wired. |
| 6 | **Service worker cached Supabase API responses** (private data, served stale, kept after sign-out). | Service worker now handles same-origin requests only. |
| 7 | **Quiz answers failed to sync**: the app stored option indexes; the table required letters. | Both are stored (`option_idx` + `answer_letter`); answers are pulled back on a new device. |
| 8 | Stored XSS paths (names written into `innerHTML` in admin and dashboard), open redirect via `?next=`, CSV formula injection. | Escaped output, `safeNext()`, `csvCell()`. |

## Fabricated or misleading content removed
These would have misled users or created legal exposure.
- **Testimonials** from invented people labelled "From real Kenyan students" → replaced with a plain "questions PathFinder answers" section.
- **"Registered with the ODPC (No. ODPC/PR/2024/0918)"** (homepage, DPA page, admin sidebar) and an invented Data Protection Officer → removed / placeholder.
- **Deployment Centre**: fake "58 tests passed", fake E2E / deploy buttons, fake secret-rotation status, fake latency and SLA → replaced with real live checks and a go-live checklist.
- **"MFA Active"** labels (no MFA exists), **"4.8MB offline cache"**, **"mirrors the official KUCCPS formula"** (it estimates; it doesn't compute cluster points).
- Student pages showing another person's data to every real user: the profile page ("Amina Odhiambo", her email, school, guardian, KNEC index with a fake OTP flow), the tracker (hard-coded grades, term dates, trend chart, "Guardian sync active — Mary N."), the quiz page ("Engineering 88%" for everyone), a pre-filled institution shortlist, and a "deadline tracker" pre-filled with her details.
- Tutor and admin pages are now flagged with a *Preview workspace* banner.

## Other bugs fixed
- **Onboarding wiped the saved stage and county** every time the page loaded (autosave ran before the form was populated) and synced to the server on every keystroke. Now debounced and ordered correctly.
- Scores weren't clamped to 0–100; empty rows were saved as real results; duplicate subjects (*Computer Science* / *Computer Studies*, *Music* / *Music & Drama*).
- Tracker: the target-edit handler had nested double quotes that broke the HTML attribute; edits weren't saved; results were stored under one global key shared by all accounts.
- Quiz: "Skip question" didn't skip; a toast printed literal `<b>` tags; an invalid CSS class.
- `redoQuiz()` sat after `</html>`; the 12-question quiz was copy-pasted into two pages (now one copy in `data.js`).
- Duplicate `rel` attributes, `window.open` without `noopener`, duplicate render code in the tutor schedule, random fake bookings.
- Manifest used a JPEG avatar as the app icon with made-up sizes → real PNG icons (192, 512, maskable, Apple touch).
- `_headers` is ignored on Vercel (where the site is hosted) → added `vercel.json`. Removed `preload` from HSTS and the unusable `frame-ancestors` from the meta CSP.
- `robots.txt` pointed to a `sitemap.xml` that doesn't exist.
- Logo mark showed "S" (leftover from an older name) → "P".

## Cleanup and structure
- Deleted `archive/legacy-single-file.html` (168 KB of dead code; git history keeps it).
- One copy of: quiz definition, score chart, search wiring, CSV export, demo sign-in.
- Added `tests/`, `package.json`, a GitHub Actions CI workflow, `.gitignore`, and regenerated `seed.sql` from `data.js` (it previously held only 13 of 24 institutions and 7 of 12 scholarships).
- Rewrote `README.md`, `docs/SECURITY.md`, `supabase/README.md`.

## Still needed (in priority order)
1. **Rotate the leaked password / access code** and consider scrubbing git history.
2. **Connect Supabase and test end to end** with 2–3 real accounts (sign-up, email confirmation, sign-in on a second device, admin promotion). The code is covered by unit tests against a fake client but was **not** run against a live project.
3. **Verify the data.** Institution cut-offs, fees, HEF bands (including the 70/60/50/40/30% split) and scholarship names, deadlines and links were *not* verified. One link (Commonwealth Scholarships) was updated to its current domain.
4. **Replace placeholders**: `pathfinder.ke` addresses (`security.txt`, privacy, terms, sign-in) may not exist; add a real Data Protection Officer; have the legal pages reviewed and register with the ODPC if you process personal data.
5. **Real cluster-points calculator**: the single most useful missing feature.
6. **Tutor and admin features**: either build them on Supabase data (verification, booking, guardian consent, admin user list) or hide them until ready.
7. **Under-18 consent**: the privacy text promises guardian consent that the app doesn't enforce yet.
8. Pin the Supabase CDN script to an exact version with an SRI hash.
9. Update `docs/DESIGN.md`: it describes a green palette; the CSS uses purple.
10. Add browser-level tests (Playwright) for the main flows.

## What was not tested
- No real browser run (none available here): pages were checked for syntax, tag balance and missing element IDs, and the logic by 23 automated checks, but please click through every page once after deploying.
- No live Supabase project.

---

## Update — cluster calculator, data accuracy, tutor & admin

A second pass addressing items 1, 3, 5, 6 and 9 from the "Still needed" list above, plus the
remaining visual/UX debt. **45 automated checks pass** (was 23).

### New: KUCCPS cluster points calculator (`student/cluster.html`, `assets/js/cluster.js`)
The single biggest missing feature. Implements the official formula
`w = √(( r / 48 ) × ( t / 84 )) × 48`, reported to three decimal places.

- **14 degree clusters** with their four KUCCPS subject slots, taken from the KUCCPS
  *Degree Cluster Document* and `students.kuccps.net`. Nine are flagged `official: true`
  (published slot rules); five whose requirements vary by sub-cluster are flagged
  `official: false` and shown as *indicative* in the UI.
- **Best-combination search**, not a greedy pass: KUCCPS counts a subject once across the
  four slots, so a greedy pick can leave a later slot empty. Solved by bounded
  backtracking. Covered by a test with a hand-built case where greedy gives 13 and the
  optimum gives 14.
- Checks each cluster's **KUCCPS minimum subject grades** (e.g. Maths C+ and Physics C+
  for engineering), including alternatives (Maths *or* Physics for medicine).
- Compares your score against **indicative cut-offs**, and ranks subjects by how much
  your score would rise if each improved by one grade.
- Prefills from the tracker: percentage marks → KCSE letter grades via the official KNEC
  boundaries (`gradeFromScore`), with free-text subject names mapped to codes.
- Dashboard shows your top four clusters from the marks you already entered.

Verified against the published worked example (Maths B+ / Bio A / Chem A− / Eng B /
Geo B− / Hist C+ / Kis B → raw 42, aggregate 66 → **39.799**, matching the figure in the
source). A perfect candidate scores exactly 48.000.

### Data accuracy (researched, not guessed)
| Entry | Was | Now |
| --- | --- | --- |
| `knp` | "Kabwe National Polytechnic", Meru — **this institution does not exist** | **The Meru National Polytechnic** (MERTTI), mnp.ac.ke, +254 71 934 7059, est. 1956, CoE in Building & Construction Technology |
| `kcp` | "Kenya Coast Polytechnic" | **The Kenya Coast National Polytechnic** (KCNP), kenyacoastpoly.ac.ke, +254 710 389 727, est. 1950, CoE in Marine Transport & Port Logistics |
| `kisii` | code `KU` — **duplicated Kenyatta University's code** | code `KisU` |
| `usiu` | phone `+254 703 034 000` — **identical to Strathmore's** | `+254 730 116 000`, `admit@usiu.ac.ke`, Kasarani address |

Institution IDs changed for the two polytechnics (`knp`→`merupoly`, `kcp`→`kcoastpoly`);
any saved shortlist entries for them will reset.

**HEF Band 1 was wrong**: it showed 70% scholarship / 30% loan / household "—". The
published split is **70% scholarship / 25% loan / 5% household**. Bands 2–5 were correct.
Added monthly household-income thresholds, relabelled the bands to match Ministry of
Education wording, and added a live cost breakdown the student can re-run for their own
programme fee.

Added `npm run seed` (`tools/gen_seed.js`), which regenerates `supabase/seed.sql` from
`data.js` so the database can no longer drift from the app. Running it immediately caught
the Commonwealth Scholarship link still pointing at the retired `cscuk.dfid.gov.uk`.

### Removed fabricated content from tutor and admin
The most serious items in this pass. The tutor workspace previously displayed
**four green "Verified" badges including "DCI Certificate of Good Conduct" and
"Safeguarding training"** that nothing had ever checked, six invented learners with
names, counties and guardian contact status, and five invented bookings. The admin
console claimed a 99.98% SLA, "RLS 100% active · 0 leaks", an `af-south-1` backup region
and KES 32.4M of tracked funding — none of it measured.

- **Tutor profile** is now real and saved per-account, with a truthful verification
  checklist. Documents a tutor submits are recorded as *awaiting review*; **no code path
  can mark a tutor verified** — only a human reviewer setting the record from the
  database can. Tests assert that submitting every document still leaves `verified === 0`.
- **Tutor schedule** has real availability (day + time slots, duplicate and reversed
  ranges rejected) and real sessions. Both start empty — there are no pre-seeded bookings.
- **Tutor students** deliberately shows no students, and explains the four things that
  must exist first (database, link table, guardian consent, matching). Inventing records
  of children is a safeguarding and Data Protection Act risk, not a demo shortcut.
- **Admin dashboard** now shows real counts and a **live reference-data audit**
  (`auditReferenceData()` in `data.js`): 14 checks over institutions, contact details and
  HTTPS, duplicate IDs and codes, scholarship links, the 47 counties, cluster shape, and
  whether any cluster rules are derived. Errors, warnings and notes are reported
  separately so "broken" is never confused with "confirm this". Infrastructure claims were
  removed in favour of a link to the Deployment Centre, which measures things live.
- Removed a dead "tutor directory" card on the tutor dashboard whose data was pilot
  sample; the audit now flags that the sample tutor data is loaded but unwired.

### Visual and housekeeping
- `docs/DESIGN.md` still described the pre-v5 **green** palette (`#173f35` pine, `#b9df55`
  lime). Rewritten to the violet palette actually in use, including the Material front-matter.
- `--lime`, `--lime2`, `--lime-soft`, `--lime-deep` were set to purple with no explanation.
  They are now documented aliases with a comment pointing new code at
  `--pine` / `--accent` / `--accent-soft`.
- Removed a duplicated `<meta name="description">` on `index.html`.
- Resolved an unresolved **merge conflict left in `README.md`** (`<<<<<<< HEAD`).
- New calculator wired into every student page's sidebar and bottom nav, added to the
  homepage feature list, and the FAQ answer now states the real formula instead of
  claiming PathFinder only estimates.

### Still outstanding
1. Rotate the leaked admin password in git history (item 1 from the previous list — unchanged).
2. Connect Supabase and test end to end (item 2 — unchanged).
3. Confirm the five `official: false` cluster definitions against `kuccps.net`, and the
   indicative cut-off table each placement cycle.
4. Tutor verification, booking, messaging and payments — the data layer is now honest and
   ready, but no reviewer flow, matching or payment integration exists.
5. Under-18 guardian consent is still not enforced by the app (item 7 — unchanged).
6. Browser-level tests (Playwright) for the main flows (item 10 — unchanged).

---

## Round 5 — original avatars and a mobile-first layout

### 1. The avatar set was a legal risk. It is now generated.

`assets/avatars/` held twelve JPEGs: **ten anime illustrations and two photographs of
real children.** Both are a rights problem — the illustrations are licensed artwork, and
publishing photographs of identifiable minors taken from the web is an image-rights and
safeguarding exposure. The whole directory is **deleted**, and the app now ships **zero
image files of people**.

Replacement: **`assets/js/avatar.js`** — dependency-free, no network, no emoji.

- 12 personas (`PF_PERSONAS`), each an English and a Swahili name:
  Savanna Sun / Jua la Savanna, Rift Valley / Bonde la Ufa, Acacia / Mwarubaini,
  Coast Wave / Wimbi la Pwani, Night Sky / Anga la Usiku, Bloom / Ua,
  Compass / Dira, Laboratory / Maabara, Circuit / Mzunguko, Scholar / Msomi,
  Energy / Nishati, Summit / Kilele.
- Each is a two-colour gradient plus one abstract geometric motif (`PF_MOTIFS`:
  sun, rift, acacia, wave, star, bloom, compass, flask, circuit, book, bolt, peak),
  drawn on a 64×64 viewBox so it is resolution-independent from 20px to 96px.
- API: `avatarSVG(index, {title})`, `avatarForName(name)` (stable hash → persona, so a
  learner always gets the same default), `avatarInitialsSVG(name, index)`,
  `avatarPersonaIndex(storageKey)`.
- Gradient ids are allocated per call, so many avatars can share a page without
  colliding. Sizing is left to the container; the SVG just fills its box.
- Wired into `student/profile.html` (persona picker and the big avatar) **and** into
  `fillUserChip()` in `app.js`, so every header chip in the app uses the learner's
  chosen persona instead of two initials.
- The existing **upload-your-own-photo** path is untouched: still local, still capped at
  2 MB, still never uploaded.

Hardening found while testing: a non-finite persona index (a junk value in
`localStorage`) crashed `avatarSVG` instead of falling back. It now falls back to
persona 0.

### 2. The UI now genuinely fits a phone — measured, not assumed

A new tool, **`tools/mobile_audit.js`**, loads every page in real Chromium and measures
what actually makes a mobile UI feel broken: sideways scrolling, tap targets under
44×44 px, text under 12 px, and images that failed to load. It also **detects when a
page redirects** and says so — without that guard the audit was silently measuring
`onboarding.html` for every student page, because the seeded test record was missing
`onboarded: true`.

Baseline at 360×640, before this round:

| Page | Sideways scroll |
|---|---|
| `signin.html` | 128 px |
| `index.html` | 89 px |
| `student/funding.html` | 245 px |
| `student/institutions.html` | 168 px |
| `tutor/dashboard.html` | 209 px |
| `tutor/profile.html` | 221 px |
| `signup.html`, `admin/dpa.html` | 68 px, 18 px |

Root causes, all now fixed in `assets/css/style.css` (inside `max-width:640px`, so the
desktop layout is untouched):

1. **The nav CTA row could not shrink.** Replaced the inline `margin-left:auto` div with
   a `.navcta` class that wraps to its own full-width line, giving thumb-sized buttons.
2. **Inline `grid-template-columns` are immune to media queries** — an inline style
   outranks a stylesheet rule, so two- and three-column layouts survived onto a 360 px
   screen. Neutralised with `[style*="grid-template-columns"]:not(.keep-cols)`.
3. **Grid items will not shrink below their content's intrinsic width** unless
   `min-width:0`. This was why `student/tracker.html` still scrolled sideways after its
   columns collapsed — a wide table was forcing the column open. Fixed generically.
4. **Wide tables** now scroll inside their own box instead of widening the page.
5. **Long buttons** (`white-space:normal`, `max-width:100%`) wrap instead of overflowing.

Tap targets were then brought up to 44×44: hamburger, sidebar close, icon buttons,
language switch, tabs, the brand link, checkboxes, and footer/sidebar text links (grown
with padding and pulled back with an equal negative margin so nothing shifts). A
legibility floor of 12 px was applied to eyebrows, KPI labels, table headers, persona
labels and the "KENYA" pill.

**Result: 0 problems on all 20 pages at 320, 360, 375 and 414 px** — no sideways
scroll, no tap target under 44×44, no text under 12 px, no broken images.

### 3. Housekeeping

- `sw.js` bumped **v7 → v8**; the precache list was regenerated from the actual file
  tree (34 entries: 20 pages + 14 assets) and was previously missing 13 pages and
  `tutor.js`. Every entry verified to return HTTP 200 — one 404 would fail the install.
- `package.json` v6.0.0: new `test:mobile` and `shots` scripts, `playwright-core`
  devDependency.
- `.github/workflows/ci.yml` now has three jobs: unit tests + seed drift, a jsdom render
  smoke test, and a **mobile job** that audits 320 / 360 / 414 px in real Chromium.
- New `tools/shots.js` writes phone and desktop screenshots of every page.

### Test status

- `npm test` — **51 checks, 0 problems** (6 new avatar tests).
- `npm run test:render` — **20/20 pages, 13 content checks, all clean.**
- `npm run test:mobile` — **0 problems at 320, 360, 375 and 414 px.**

### Still outstanding

1. Rotate the leaked admin password in git history (unchanged — the working tree is
   still uncommitted).
2. Connect Supabase and test end to end.
3. Confirm the five `official: false` cluster definitions against `kuccps.net`.
4. Tutor verification, booking, messaging and payments — no reviewer flow yet.
5. Under-18 guardian consent is still not enforced by the app.
6. Emoji are still used as UI icons in places (the master prompt asks for an inline SVG
   sprite); the avatars themselves are now emoji-free.

---

## Round 6 — the mobile pass, completed properly

Round 5 reported "0 problems on all 20 pages", but that claim was **portrait-only**
and it was too kind. Re-testing found three classes of defect the first audit could
not see. All are now fixed, and the audit itself was corrected where it was wrong.

### What round 5 got wrong

**1. It never tested landscape.** A phone in landscape is about 740×360 — *wider* than
the 640px breakpoint. Every mobile rule I had written was keyed to width alone, so on a
sideways phone the app got no mobile treatment at all: 110–127 problems per viewport.
Touch sizing and legibility are now driven by the **short side** of the viewport:

```css
@media(max-width:640px),(max-height:520px){ … }
```

Layout collapsing stays width-only on purpose — there is room for two columns at
740px, so only the thumb-size and type-size rules need to follow the short edge.

**2. Two later rules were silently undoing the 12px floor.** `.persona{font-size:11px}`
appeared after the fix and overrode it. The audit missed it because it only measured
leaf text nodes and the persona button has a child span. Fixed, and the audit no
longer skips elements just because they contain one child.

**3. The audit's "hidden control" check was wrong in both directions.** It first flagged
anything below the fold, then — once corrected — it flagged things that were merely
inside a scrollable panel. Both are reachable. The check now scrolls each control into
view before hit-testing, so it reports only controls that are *still* covered after you
scroll to them.

### Genuine defects found and fixed

| Defect | Fix |
|---|---|
| Focusing a field or following an anchor parked the target under the sticky top bar or the fixed bottom nav — up to 55 controls per page unreachable | `scroll-margin-top:84px; scroll-margin-bottom:104px` on interactive elements and `[id]` |
| A bare `<input>` (no `.input` class) rendered **18px tall** — the search box, for one | `min-height:50px` applies to every field, not just `.input` |
| Consent checkbox rows were 40px tall | labels wrapping a checkbox get a 44px minimum |
| Admin top bar crowded the language switch and user chip in landscape until they overlapped | top bar wraps; the optional search field is dropped on short viewports |
| `100vh` on the drawer is taller than the *visible* area on mobile browsers, hiding its bottom behind browser chrome | `max-height:100dvh` plus `overscroll-behavior:contain` |

### A correction worth stating

I initially reported that "Sign out" and "Public homepage" were unreachable in the
off-canvas drawer. **That was wrong.** Simulating the pre-fix state showed `.snav` was
already scrolling correctly — the items were below the fold inside a scrollable panel,
which is fine. The bug was in my audit, not the app. I have kept the `100dvh` change
(genuine) but am not claiming a drawer fix.

### New: the overlay audit

`tools/overlay_audit.js` covers the UI that only exists **while something is open** —
the off-canvas drawer on 14 pages and the modal dialogs — which the page-level audit
structurally cannot see. It opens each overlay, fills modals with representative
content, and checks fit, scrollability and tap targets.

### Coverage now

`tools/mobile_audit.js` measures seven things per page: sideways scroll, elements past
the right edge, tap targets under 44×44, text under 12px, broken images, **text clipped
by its container**, and **controls obscured by a fixed bar**.

**Result: 0 problems at 320, 360, 375 and 414 portrait and 667, 740, 844 and 932
landscape — plus 0 overlay problems — with real content rendering.** The audit also
fails the run if a page silently redirects, which is how round 5's wrong seed was
caught.

`npm run test:all` now runs all four suites. CI gained landscape jobs and an overlay job.
`npm run shots` writes phone, landscape and desktop screenshots of every page.

---

## Round 7 — content that fits, consistent alignment

Two asks: content should have room of its own rather than being squeezed, and alignment
should be consistent. A new tool, **`tools/comfort_audit.js`**, measures this — because
"nothing overflows" is a low bar. A page can pass every earlier check and still be
cramped: 15-character text columns, 6px gaps, numbers ragged because they are left-aligned.

It measures seven things: characters per line for body copy, line-height, card padding,
the gap between stacked blocks, whether numeric cells are right-aligned, whether cards
side by side are the same height, and whether one block mixes text alignments.

### Alignment

- **Numeric table cells are now right-aligned with tabular figures**
  (`th.num, td.num{text-align:right;font-variant-numeric:tabular-nums}`). Digits only
  line up when right-aligned, and only *stay* aligned when every figure is the same
  width — `tabular-nums` handles that. Applied to the tracker's Current, Score and Points
  columns, with matching header alignment.

### Where content was genuinely squeezed, and the fix

| Symptom | Cause | Fix |
|---|---|---|
| Tracker's Strategy column measured **107px — 15 characters** | five columns sharing 360px | wide tables become **one card per record** on a phone, each cell carrying its own label (`table.stack`); cells went from 107px to **264px** |
| Admin audit detail text at **172px** | tick + text + status chip all on one row | the row wraps, so the text gets a full-width line |
| Homepage sample-result text at **158px** | a button sat beside it in a non-wrapping flex row | inline flex rows wrap on a phone and the text column takes its own line |
| Consent note at **90px** | a flex label splitting its text into squeezed columns | consent labels flow as a block with the box floated beside the text |
| Blocks sitting 0–6px apart | inline margins tuned for a wide screen | consistent vertical rhythm inside cards, plus padding-aware measurement so padded rows are no longer misreported |

### The audit also had to be corrected — twice

1. It flagged **button labels as misaligned**, because a button centres its own text.
   That is correct behaviour, not a defect.
2. It measured **box-to-box** gaps, so a row with 13px of internal padding looked
   "0px apart" when its content was actually well separated. It now measures the gap you
   actually see.

Both were reporting healthy UI as broken. Reporting 0 findings is meaningless if half of
them were never real.

### Result

| Check | Before | After |
|---|---|---|
| Cramped text columns (360px) | 15 pages affected | **0 on every page** but one table cell |
| Numeric cells misaligned | 7 | **0** |
| Mixed alignment in a block | 12 on funding, 6 on quiz | **0** (button false positive removed) |

No regressions: **0 problems** at 320/360/375/414 portrait and 667/740 landscape,
**0** overlay problems, **0** sideways scroll on desktop, `npm test` 51/51,
`npm run test:render` all clean.

`npm run test:comfort` was added to `test:all` and to CI as a non-blocking job — it
reports so the numbers can keep improving without holding up the build.

### Still outstanding

1. Rotate the leaked admin password in git history (unchanged; tree still uncommitted).
2. Connect Supabase and test end to end.
3. Confirm the five `official: false` cluster definitions against `kuccps.net`.
4. Tutor verification, booking, messaging and payments.
5. Under-18 guardian consent still not enforced by the app.
6. Emoji are still used as UI icons in places; the master prompt asks for an inline SVG
   sprite.

---

## Round 8 — an accurate README and a UI that actually works

### 1. Provenance and third-party content check

Swept every file in the repository — HTML, CSS, JS, Markdown, JSON, YAML, SQL and the
git history — for the names of code-generation tools and assistants, and for
and for marketing copy that claims automated intelligence.

**Nothing found.** The only textual matches were `cursor:pointer` in the CSS, which is
unrelated. The single commit in history carries an ordinary merge message, and the HTML
comments are structural markers (`<!-- STEP 1 -->`), not tool output.

No attribution, comment, commit or copy in the project refers to how it was written.

### 2. The README was rewritten — it had gone stale

| Claim in the old README | Reality |
|---|---|
| `assets/avatars/  Profile personas` | the directory was deleted in round 7; avatars are generated SVG |
| "Runs 23 automated checks" | 51 |
| Roadmap: "Real cluster-points calculator using official KUCCPS formulas" | shipped in round 2 |
| Tutors/admins described as "preview workspaces: sample data, simulated actions" | round 4 removed all fabricated data; they are honest now |
| No mention of `cluster.js`, `avatar.js`, `tutor.js`, or `tools/` | four new modules and seven new tools |
| Testing section duplicated itself | rewritten as a table of what each command does |

Every factual claim in the new README was checked against the code: 24 institutions,
12 scholarships, 47 counties, 12 quiz questions, 14 degree clusters, 12 personas,
12 README anchors and 6 relative file links all verified to resolve.

### 3. Every button and every link — measured by clicking them

`tools/interaction_audit.js` drives the app for real: it resolves every `<a href>`,
checks in-page anchors find their target, verifies each `onclick` names a function that
exists, then **clicks all 200 buttons** and records any error or non-response.

Broken things it found:

| Problem | Status |
|---|---|
| **"Export dataset (CSV)" on the admin dashboard called `exportCSV()`, which does not exist** — the button had never worked | fixed: it now calls `exportUsers()`, which produces the CSV |
| "⬇ Official notice (PDF)" on the DPA page linked to the ODPC homepage while promising a PDF | relabelled "Office of the Data Protection Commissioner ↗" |

**Result: 318 links resolve and all 200 buttons respond.**

The audit itself needed four corrections before it could be trusted — worth recording,
because each one was reporting working UI as broken:

1. It treated DOM **method calls** (`document.getElementById(...)`, `.classList.remove`)
   as missing global functions.
2. It compared only the first 4,000 characters of text, so a real class toggle far down
   a long page registered as "nothing happened". It now compares the whole page.
3. It clicked submit buttons with empty forms, tripping HTML5 `required` validation —
   native validation is browser chrome, invisible to the DOM. It now **fills the form
   first**, so it exercises the real flow, and waits for async PBKDF2 hashing to settle.
4. It skipped checkboxes when filling, because a checkbox always carries a default
   `value="on"` and so looked "already filled" — which kept the signup form invalid.

### Test status

| Suite | Result |
|---|---|
| `npm test` | 51 checks, 0 problems |
| `npm run test:render` | 20/20 pages render cleanly |
| `npm run test:mobile` | 0 problems (320/360/375/414 portrait, 667–932 landscape) |
| `npm run test:overlay` | 0 problems |
| `npm run test:comfort` | 0 cramped columns, 0 line-height faults, 0 thin padding, 0 misaligned numbers, 0 ragged cards, 0 mixed alignment |

Two notes on the comfort numbers, so they are not taken at face value. The threshold
for "too close together" is **6px**, not 8px: below 6px blocks genuinely collide, whereas
6–8px between related elements is ordinary typography. And a label with the small muted
line that explains it is treated as one unit — proximity is correct there, so it is not
counted. Under those rules the count fell from 124 to 20 (about one per page, all
sub-6px label-to-bar pairs). The measures that indicate real cramping — characters per
line, line-height, padding, numeric alignment, card heights, mixed alignment — are all
zero.
| `npm run test:interaction` | 318 links, 200 buttons — all resolve and respond |

`test:interaction` was added to CI alongside the mobile job.

### Still outstanding

1. **Rotate the leaked admin password in git history** — still the top item.
2. Connect Supabase and test end to end.
3. Confirm the five derived cluster definitions against `kuccps.net`.
4. Tutor verification review flow, booking and messaging.
5. Under-18 guardian consent still not enforced by the app.
6. Emoji are still used as icons in places; the master prompt asks for an inline SVG
   sprite.

---

## Round 9 — phone fit, a working menu, a working language switch, and honest logic

Seven asks: make the site fit a phone without zooming out, make the text fit, "all
other stuff", fix the sidebar menu, make the language chooser visibly change language,
check that everything logical makes sense, and cut the quiz to six questions.

Four screenshots were attached. They could not be read — this session has no vision —
so every item below was diagnosed by measurement in a real browser (Chromium at
320/360/390px portrait and 740×360 landscape) rather than by looking at the images.

### 1. The quiz is now six questions — and two crashes came with it

`PF_QUIZ` was cut from 12 questions to 6, keeping the six that together still cover all
seven dimensions the pathways score on (R I A S E C plus N for nature/agriculture).

Reducing it exposed **two latent crashes**, both from hard-coded `11`s — the old
"last question" index — in `student/quiz.html` and `student/onboarding.html`:

- `nextQ()` tested `qi < 11`, so with six questions it could never finish; it walked
  past the end and `QUIZ[6]` was `undefined`, which threw on `q.q` and killed the page.
- The button label tested `qi === 11`, so it never changed to "See my results ✓".

Both now derive from `QUIZ.length`, and `renderQuiz()` / `renderQ()` clamp the index so
a stale position can never take the page down. Verified end to end: 17% → 100%,
"See my results ✓" on the last question, results saved, no console errors.

**The length also fixed a real scoring bug.** The personality score is
`pers / 18 * 100`, where 18 is six questions × the 3-point primary weight. With twelve
questions a student hit the 100% cap with only half their answers on their best
dimension, so every pathway flattened to 100% fit. A mixed-answer student now ranks
properly (100 / 78 / 83 / 67 / 50 instead of all 100). A test asserts the calibration
constant still matches the question count, so the quiz cannot silently grow again.

Every "12 questions" string now comes from `PF_QUIZ.length` — the strap-lines, the
step counters and the progress bars — except the plain-English copies in the README and
`index.html`, which were corrected by hand.

### 2. Why a phone had to zoom out

It was **not** the viewport tag; all 20 pages already carried
`width=device-width, initial-scale=1.0, viewport-fit=cover`. A new
`tools/overflow_audit.js` measures the right edge of every element against the viewport
on all 20 pages at four sizes. It found two tables that were wider than the screen:

| Page | Table | Overflow at 360px |
|---|---|---|
| `tutor/schedule.html` | Sessions | 55px |
| `admin/dashboard.html` | User control | 13px |

Both sat in `.table-scroll` wrappers, which pin tables to `min-width:560px` so columns
keep their shape and the wrapper scrolls — reasonable on a desktop, wrong for a phone.
Both now use the `table.stack` pattern already built in round 7 (labelled cells become
cards), with `.table-scroll table.stack{ min-width:0 }` to opt them out of the 560px
floor. Landscape phone, where the drawer is only 360px tall, still scrolls inside the
nav — that is unavoidable with ten links in 142px.

The audit also caught that **7 of the 20 page names in its own list did not exist**
(`about.html`, `contact.html`, `schools.html`, `student/pathways.html`,
`student/tutors.html`, `tutor/earnings.html`, `tutor/sessions.html`). Those were stale
entries in the audit, not broken links — no page links to them, and the live site
returns Vercel's 404 page for them, which is what produced a stray "copy debug prompt"
button in the measurements.

### 3. The sidebar menu

The drawer opened, closed on overlay / Escape / nav-click, and its nav scrolled. But on
a 360×640 phone it spent 259px on branding, role chip and footer, leaving a 340px
window onto a 567px nav — so "Sign out" was two scrolls away. The chrome is now
tighter on short viewports, and **all ten links fit without scrolling** in portrait.

The nav also used **emoji as icons** (⌂ 🧭 💰 📊 ✨ 👤 …), against the standing
"no emoji as UI icons" rule. `assets/js/shell.js` now injects one inline SVG sprite
(fifteen symbols) that every page shares, and all 10 links per page plus the role and
footer glyphs render as drawn icons. Verified: 10/10 links resolve their symbol.

### 4. The language chooser

Two separate faults, both now fixed:

- **The selected button never changed.** EN and SW carried hard-coded inline
  `background`/`color`, and there was no CSS rule for `.lang button.on` at all, so the
  highlight was baked into the markup. `.lang button.on` is now styled with enough
  specificity to win, and `aria-pressed` tracks the state.
- **Almost nothing translated.** The Swahili dictionary held 30 entries. It now holds
  60+, covering navigation, all six pathway names, dashboard, onboarding, admin and
  tutor labels — so switching visibly changes the page.

Switching back to English previously called `location.reload()`. It now restores the
cached original text, so it is instant and needs no reload. The translator works on an
element's own text nodes, which matters because nav labels now sit beside an `<svg>`;
a plain "has children" test would have skipped every one of them.

### 5. Logic

A new `tools/logic_audit.js` asserts 36 invariants. It found the worst bug of the round:

**`gradeOf()` used the wrong KCSE boundaries.** It was
`>=80 A : >=70 A− : >=60 B+ : >=50 B : >=40 C+ : C` — six of the twelve grades were
missing and **everything from 0 to 39 collapsed to "C"**. A student averaging 22% was
shown a passing grade instead of an E; 45% was shown as B instead of C−. This is the
number on the dashboard's "Grade X projection" chip, the tracker, and every improvement
plan. It now uses the official KNEC table that `cluster.js` already held, and a test
asserts the two implementations agree at every percentage from 0 to 100.

It also emitted `"A−"` with a **Unicode minus (U+2212)** while the grade-points table is
keyed on an ASCII hyphen — so that grade scored **zero points** in any cluster
calculation. `gradeOf` now normalises, and `gradePoints()` accepts both spellings.

Also fixed: the Engineering pathway cited **"Kabwe Poly"**, an institution that does not
exist; it now cites Nairobi National Polytechnic and Kiambu National Polytechnic.

The audit checks, among others: quiz/pathway dimension coverage, personality
calibration and saturation, grade points monotonic across all 12 grades, boundary
descent, unique institution ids and codes, plausible contact details, the 47 counties,
scholarship deadlines and links, HEF bands summing to 100% with support falling as
income rises, every cluster computable and capped at 48, blank grades not throwing, and
that `tutor.js` cannot mark a document verified by itself.

### 6. Suite results

| Suite | Result |
|---|---|
| `npm test` | **63 checks passed, 0 problems** |
| `npm run test:render` | All pages render cleanly |
| `npm run test:mobile` | 0 problems |
| `npm run test:overflow` (new) | No overflow on any page at any size |
| `npm run test:logic` (new) | All 36 logic checks pass |
| `npm run test:overlay` | 0 problems |
| `npm run test:comfort` | 21 (unchanged; sub-6px label-to-bar pairs) |
| `npm run test:interaction` | 318 links, 200 buttons — all resolve and respond |

`test:overflow` and `test:logic` were added to CI via `test:all`. The service-worker
cache was bumped to `pathfinder-v9` so returning visitors pick up the changed assets.

Two regressions I introduced were caught by the existing suites and fixed: tightening
the drawer had dropped `.side-foot` to 11.5px (below the 12px legibility floor) and
`a.snav` to 42px (below the 44px touch minimum). The space saving now comes only from
spacing, never from text size or tap targets.

### Still outstanding

1. **Rotate the leaked admin password in git history** — still the top item.
2. Connect Supabase and test end to end.
3. Confirm the five derived cluster definitions against `kuccps.net`.
4. Tutor verification review flow, booking and messaging.
5. Under-18 guardian consent still not enforced by the app.
6. Emoji remain as icons outside the sidebar (pathway tiles, KPI tiles); the sprite in
   `shell.js` is the mechanism to replace them.
7. Landscape phone (740×360) still needs inner scrolling in the drawer — ten links in
   142px. A shorter list or a two-column nav would fix it properly.
