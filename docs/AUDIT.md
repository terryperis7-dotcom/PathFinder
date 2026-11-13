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
