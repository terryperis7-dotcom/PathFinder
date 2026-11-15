<div align="center">

# 🧭 PathFinder Kenya

**Free KUCCPS, HELB, TVET, KCSE & CBC guidance for Kenyan students, parents and tutors.**

[Live demo](https://pathfinder-two-tau.vercel.app) · [Supabase setup](supabase/README.md) · [Security notes](docs/SECURITY.md) · [Audit report](docs/AUDIT.md)

`HTML` · `CSS` · `JavaScript` · `Supabase (optional)` · `PWA` · `No build step`

</div>

---

## Table of contents

[About](#about) · [Features](#features) · [Quick start](#quick-start) · [Connect Supabase](#connect-supabase-real-accounts) · [Deploy](#deploy) · [Project structure](#project-structure) · [Testing](#testing) · [Data & accuracy](#data--accuracy) · [Accessibility & mobile](#accessibility--mobile) · [Security](#security) · [Status & roadmap](#status--roadmap) · [License](#license)

## About

PathFinder helps a student answer two questions: **what should I study, and how do I pay for it?**

A student enters their KCSE subject scores and takes a 6-question career-interest quiz. PathFinder ranks six career pathways by combining *personality fit* (55%) with *grade feasibility* (45%), shows which grades to raise, computes their real KUCCPS weighted cluster points, and points them to institutions and funding.

It is plain HTML, CSS and JavaScript with **no build step**. It runs entirely in the browser in *local demo mode*, and switches to real accounts and cloud sync the moment you add [Supabase](https://supabase.com) keys.

> ⚠️ PathFinder gives **guidance, not official placement results**. Official cluster points, cut-offs and funding decisions come from [KUCCPS](https://www.kuccps.net), [HEF](https://www.hef.co.ke) and [HELB](https://www.helb.co.ke). Verify anything consequential on those sites.

## Features

**Students**
- **KUCCPS cluster points calculator** using the official weighted formula
  `w = √( ( r / 48 ) × ( t / 84 ) ) × 48`, where `r` is your points in the four cluster
  subjects and `t` is your best-seven aggregate. It picks your strongest valid subject
  combination, checks the KUCCPS minimum grade for each required subject, compares you
  against indicative cut-offs, and names the single subject that would lift you most.
- Onboarding: subject results + 6-question RIASEC quiz → ranked pathways and a
  per-subject improvement plan.
- Dashboard with your average, strongest and weakest subject, and a scores-vs-targets chart.
- Academic tracker: set targets, log assessments, export CSV.
- Institutions explorer: 24 listings with search, filters, comparison and a shortlist.
- Funding hub: HEF bands 1–5, HELB, and 12 scholarships, each linking to the official source.
- Profile with a **generated avatar**, stage, county, school and JSON export.
- English / Kiswahili toggle for key labels.

**Tutors**
- Dashboard, students, schedule and profile workspaces.
- Verification checklist (TSC, ID, good conduct, safeguarding). Nothing is shown as
  verified until a reviewer records it — the app never claims a check that was not made.
- Session logging and a monthly estimate at a fixed pilot rate, with no payment taken in-app.

**Admins**
- Dashboard with real account counts, user management, and a **live reference-data audit**
  over the shipped institutions, scholarships, counties and cluster definitions.
- Deployment Centre running live checks: HTTPS, Supabase, service worker, manifest and
  security headers.
- Data Protection page covering Kenya's Data Protection Act 2019.

**App-like**
- Installable PWA with an offline app shell.
- Mobile-first: tested at 320, 360, 375 and 414px portrait *and* 667–932px landscape.
- Minimum 44×44px tap targets, 12px minimum type, 16px form fields so iOS does not zoom.

### Avatars are generated, not sourced

Every profile avatar is drawn at runtime by `assets/js/avatar.js` as inline SVG — a
two-colour gradient plus one abstract geometric motif, across 12 personas each with an
English and a Swahili name. **The project ships no image files of people**, so there are
no photographs of minors, no licensed artwork and no third-party images to clear.

## Quick start

```bash
git clone https://github.com/terryperis7-dotcom/PathFinder.git
cd PathFinder
npm start            # or: python3 -m http.server 8000
```

Open <http://localhost:8000>. Use localhost or HTTPS — the service worker and password
hashing both need a secure context.

Without Supabase keys the app runs in **local demo mode**, where accounts live in your
browser. Use the one-click demo buttons on the sign-in page; demo data is always labelled.

## Connect Supabase (real accounts)

1. Create a Supabase project, then run `supabase/schema.sql` followed by `supabase/seed.sql`.
2. Put the project URL and **anon** key in `assets/js/supabase-config.js`.
3. Turn on email confirmation and set your Redirect URLs.
4. Create your admin account and promote it with one SQL line.

Step-by-step: **[supabase/README.md](supabase/README.md)**. Never commit the `service_role` key.

## Deploy

It is a static site — upload the folder anywhere.

| Host | Notes |
| --- | --- |
| **Vercel** | No build command; output directory = repo root. Security headers come from `vercel.json`. |
| **Netlify / Cloudflare Pages** | Headers come from `_headers`. |
| **GitHub Pages** | Works, but custom security headers are not supported. |

`assets/js/data.js` is the single source of truth for institutions and scholarships.
After editing it, regenerate the database seed so the two cannot drift:

```bash
npm run seed      # rewrites supabase/seed.sql from assets/js/data.js
```

After deploying, open **Admin → Deployment Centre** to see which checks pass.

## Project structure

```
PathFinder/
├── index.html · signin.html · signup.html     Public pages
├── student/    onboarding, dashboard, quiz, tracker, institutions, funding, profile, cluster
├── tutor/      dashboard, students, schedule, profile
├── admin/      dashboard, deployment, dpa
├── legal/      privacy.html, terms.html
├── assets/
│   ├── css/style.css          Design system
│   ├── icons/                 PWA + favicon icons
│   └── js/
│       ├── app.js             Sessions, auth, recommendation engine, shared helpers
│       ├── data.js            Institutions (24), scholarships (12), counties, quiz
│       ├── cluster.js         KUCCPS weighted cluster points engine
│       ├── avatar.js          Generated SVG avatars — no image files
│       ├── tutor.js           Tutor verification, availability and session layer
│       ├── supabase.js        Supabase layer: auth, queued sync, cache hydration
│       ├── supabase-config.js Your project URL + anon key
│       └── shell.js           Sidebar, bottom nav, offline banner, install prompt
├── supabase/   schema.sql · seed.sql · README.md
├── tests/      app.test.js · check_html.py
├── tools/
│   ├── gen_seed.js            Regenerates supabase/seed.sql from data.js
│   ├── render_check.js        Loads every page in jsdom and runs its scripts
│   ├── mobile_audit.js        Real Chromium: overflow, tap targets, type size
│   ├── overlay_audit.js       Drawers and modals, which only exist while open
│   ├── comfort_audit.js       Reading comfort, spacing density, alignment
│   ├── interaction_audit.js   Clicks every button, resolves every link
│   └── shots.js               Phone / landscape / desktop screenshots
├── docs/       SECURITY.md · AUDIT.md · DESIGN.md
├── sw.js · manifest.json · robots.txt
├── vercel.json · _headers     Security headers (Vercel / Netlify + Cloudflare)
└── .github/workflows/ci.yml   Tests, render, mobile and overlay checks on every push
```

## Testing

```bash
npm test              # unit + HTML/JS checks — no dependencies needed
npm run test:all      # everything below
```

| Command | What it does |
| --- | --- |
| `npm test` | 51 unit checks (accounts, escaping, scoring, cluster engine, avatars) plus a static check of every HTML file |
| `npm run test:render` | Renders all 20 pages in jsdom and runs their scripts |
| `npm run test:mobile [w] [h]` | Real Chromium: sideways scroll, 44px tap targets, 12px type, clipped text, controls hidden behind fixed bars |
| `npm run test:overlay [w] [h]` | Drawers and modals, which the page audits cannot see |
| `npm run test:comfort [w] [h]` | Characters per line, line-height, spacing density, numeric alignment |
| `npm run shots` | Screenshots of every page at phone, landscape and desktop |
| `npm run seed` | Regenerates `supabase/seed.sql` from `data.js` |

The browser-based tools need `npm install` once (they use `playwright-core`); everything
else runs on a bare checkout. `npm test` is the only one CI requires.

## Data & accuracy

Institutions, cut-offs, fees, HEF bands and scholarship details in `assets/js/data.js` are
**compiled from public sources and are indicative**. They change every year — verify on
official sites before relying on them.

Where a value is derived rather than published, `data.js` says so. The admin dashboard's
reference-data audit reports this openly: it separates hard errors from advisories and
names the cluster definitions still to be confirmed against `kuccps.net`.

`supabase/seed.sql` is generated from `data.js` — edit the data in one place, then run
`npm run seed`. CI fails if the two ever drift apart.

## Accessibility & mobile

The layout is built phone-first and verified by measurement rather than by eye:

- No sideways scrolling at 320, 360, 375 or 414px portrait, or 667–932px landscape.
- Touch rules key off the **short side** of the viewport
  (`@media(max-width:640px),(max-height:520px)`), because a phone in landscape is wider
  than 640px and would otherwise be missed entirely.
- `scroll-margin` keeps a focused field or anchor target clear of the sticky top bar and
  the fixed bottom nav.
- Wide data tables become one card per record on a phone, each cell carrying its own
  label, instead of squeezing five columns into 360px.
- Numeric columns are right-aligned with tabular figures so digits line up.

## Security

Short version: no credentials in code, PBKDF2-hashed passwords in local mode, Supabase
Auth + Row Level Security for real data, admin role only assignable from the database, CSP
and security headers, escaped output. Read the limitations before launch:
**[docs/SECURITY.md](docs/SECURITY.md)**.

## Status & roadmap

Honest status and the full to-do list live in **[docs/AUDIT.md](docs/AUDIT.md)**. The
remaining big items:

- [ ] Connect Supabase and test with real users (RLS policies are written but need a live run-through)
- [ ] Rotate a demo password that was committed to git history before this repository was cleaned up
- [ ] Tutor verification review flow, booking and messaging (the data layer is honest and ready; no reviewer flow yet)
- [ ] Guardian co-viewing and enforced under-18 consent
- [ ] Confirm the five derived cluster definitions against `kuccps.net`
- [ ] Replace the remaining emoji used as icons with an inline SVG sprite
- [ ] Add your own domain, contact addresses and Data Protection Officer to the legal pages

## License

© 2026 PathFinder Kenya. All rights reserved. Proprietary licence — see [LICENSE](LICENSE).
