<div align="center">

# 🧭 PathFinder Kenya

**Free KUCCPS, HELB, TVET, KCSE & CBC guidance for Kenyan students, parents and tutors.**

[Live demo](https://pathfinder-two-tau.vercel.app) · [Supabase setup](supabase/README.md) · [Security notes](docs/SECURITY.md) · [Audit report](docs/AUDIT.md)

`HTML` · `CSS` · `JavaScript` · `Supabase (optional)` · `PWA` · `No build step`

</div>

---

## Table of contents
[About](#about) · [Features](#features) · [Quick start](#quick-start) · [Connect Supabase](#connect-supabase-real-accounts) · [Deploy](#deploy) · [Project structure](#project-structure) · [Testing](#testing) · [Data](#data--accuracy) · [Security](#security) · [Status & roadmap](#status--roadmap) · [License](#license)

## About
PathFinder helps a student decide **what to study and how to pay for it**. The student enters their subject scores and takes a 12-question career-interest quiz. PathFinder ranks six career pathways by combining *personality fit* (55%) with *grade feasibility* (45%), shows which grades to raise, and points to institutions and funding options.

It is plain HTML, CSS and JavaScript with **no build step**. It runs fully in the browser in *local demo mode*, and switches to real accounts and cloud sync when you add [Supabase](https://supabase.com) keys.

> ⚠️ PathFinder gives **guidance, not official placement results**. Official cluster points and cut-offs come from [KUCCPS](https://www.kuccps.net); funding rules from [HEF](https://www.hef.co.ke) and [HELB](https://www.helb.co.ke).

## Features
**Students** (fully working)
- Onboarding: results + 12-question RIASEC quiz → ranked pathways and a per-subject improvement plan
- Dashboard with average, strongest/weakest subject and a scores-vs-targets chart
- Academic tracker: edit targets, log assessments, export CSV
- Institutions explorer (24 listings): search, filter, compare, personal shortlist
- Funding hub: HEF bands 1–5, HELB, scholarships (links to official sites)
- Profile: avatar, stage, county, school, JSON data export
- English / Kiswahili toggle for key labels

**Tutors and admins** (*preview workspaces*: sample data, simulated actions, clearly labelled)
- Tutor: dashboard, students, schedule, profile
- Admin: dashboard (user management in local mode), Data Protection page, Deployment Centre with **live** checks (HTTPS, Supabase, service worker, manifest, security headers)

**App-like**: installable PWA, offline app shell, mobile-first layout with bottom navigation.

## Quick start
```bash
git clone https://github.com/terryperis7-dotcom/PathFinder.git
cd PathFinder
npm start            # or: python3 -m http.server 8000
```
Open <http://localhost:8000>. Use localhost or HTTPS (the service worker and password hashing need a secure context).

Without Supabase keys the app is in **local demo mode**: accounts live in your browser. Try the one-click demo buttons on the sign-in page. Demo data is always labelled **MOCK DATA**.

## Connect Supabase (real accounts)
1. Create a Supabase project, run `supabase/schema.sql` then `supabase/seed.sql`.
2. Put the project URL and **anon** key in `assets/js/supabase-config.js`.
3. Turn on email confirmation and set your Redirect URLs.
4. Create your admin and promote it with one SQL line.

Step-by-step: **[supabase/README.md](supabase/README.md)**. Never commit the `service_role` key.

## Deploy
It's a static site. Upload the folder anywhere.

| Host | Notes |
| --- | --- |
| **Vercel** | No build command; output directory = repo root. Security headers come from `vercel.json`. |
| **Netlify / Cloudflare Pages** | Headers come from `_headers`. |
| **GitHub Pages** | Works, but custom security headers are not supported. |

After deploying, open **Admin → Deployment Centre** to see which checks pass.

## Project structure
```
PathFinder/
├── index.html · signin.html · signup.html     Public pages
├── student/    onboarding, dashboard, quiz, tracker, institutions, funding, profile
├── tutor/      dashboard, students, schedule, profile        (preview)
├── admin/      dashboard, deployment, dpa                    (preview + live checks)
├── legal/      privacy.html, terms.html
├── assets/
│   ├── css/style.css          Design system
│   ├── icons/                 PWA + favicon icons
│   ├── avatars/               Profile personas
│   └── js/
│       ├── app.js             Sessions, auth, recommendation engine, shared helpers
│       ├── data.js            Institutions, scholarships, tutors, counties, quiz
│       ├── supabase.js        Supabase layer: auth, queued sync, cache hydration
│       ├── supabase-config.js Your project URL + anon key
│       └── shell.js           Sidebar, bottom nav, offline banner, install prompt
├── supabase/   schema.sql · seed.sql · README.md
├── tests/      app.test.js · check_html.py
├── docs/       SECURITY.md · AUDIT.md · DESIGN.md
├── sw.js · manifest.json · robots.txt
├── vercel.json · _headers     Security headers (Vercel / Netlify + Cloudflare)
└── .github/workflows/ci.yml   Runs the tests on every push
```

## Testing
```bash
npm test
```
Runs 23 automated checks (account creation and login, lockout, role whitelisting, recommendation engine, CSV/XSS helpers, Supabase sync format) plus an HTML/JavaScript well-formedness check of every page. The same command runs in GitHub Actions.

## Data & accuracy
Institutions, cut-offs, fees, HEF bands and scholarship details in `assets/js/data.js` are **compiled from public sources and are indicative**. They change every year, so verify them on official sites before relying on them. `supabase/seed.sql` is generated from `data.js`; edit the data in one place and regenerate.

## Security
Short version: no credentials in code, hashed passwords in local mode, Supabase Auth + Row Level Security for real data, admin role only assignable from the database, CSP and security headers, escaped output. Read the limitations before launch: **[docs/SECURITY.md](docs/SECURITY.md)**.

## Status & roadmap
Honest status and the full to-do list live in **[docs/AUDIT.md](docs/AUDIT.md)**. Next big items:
- [ ] Connect Supabase and test with real users (RLS policies are written but need a live run-through)
- [ ] Real cluster-points calculator using official KUCCPS formulas
- [ ] Guardian co-viewing, tutor verification and booking (currently previews)
- [ ] Verify all institution and funding data against official sources; set up a yearly update routine
- [ ] Add your own domain, contact addresses and Data Protection Officer to the legal pages

## License
© 2026 PathFinder Kenya. All rights reserved. Proprietary licence — see [LICENSE](LICENSE).
