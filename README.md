# PathFinder Kenya — v5 (organised, secure, mobile-app ready)
© 2026 PathFinder Kenya. All rights reserved. See `LICENSE`.

Free KUCCPS, HELB, TVET, KCSE & CBC guidance for Kenyan students, parents and tutors.
Plain HTML + CSS + JavaScript + Supabase (optional, graceful fallback). No build step.

## Folder structure (each file in its destination)
```
pathfinder-kenya/
├── index.html                  ← Public homepage
├── signin.html / signup.html   ← Auth (local demo + Supabase when configured)
├── manifest.json               ← PWA manifest (installable app)
├── sw.js                       ← Service worker (offline cache, fast repeat loads)
├── robots.txt / _headers       ← SEO + security headers (Netlify/Cloudflare)
├── LICENSE                     ← Proprietary licence (© 2026 PathFinder Kenya)
├── .well-known/security.txt    ← Security contact
├── assets/
│   ├── css/style.css           ← Design system v5 (mobile-first, collapsible sidebar)
│   ├── js/
│   │   ├── app.js              ← Auth, guards, engine, search, i18n (XSS-safe)
│   │   ├── data.js             ← REAL data: 24 institutions, 12 scholarships, 9 tutors, 47 counties
│   │   ├── supabase.js         ← Supabase layer (cache-first, background sync)
│   │   ├── supabase-config.js  ← PASTE SUPABASE URL + ANON KEY HERE to go live
│   │   └── shell.js            ← Sidebar toggle, bottom nav, offline, PWA install
│   └── avatars/*.jpg           ← 12 PFPs (10 anime + 2 realistic, 256px, ~196KB total)
├── student/                    ← onboarding, dashboard, quiz, institutions, funding, tracker, profile
├── tutor/                      ← dashboard, students, schedule, profile
├── admin/                      ← dashboard, deployment, dpa
├── legal/                      ← privacy.html, terms.html (DPA 2019)
├── supabase/                   ← schema.sql, seed.sql, README.md (go-live guide)
├── docs/                       ← DESIGN.md, SECURITY.md
└── archive/                    ← legacy-single-file.html (old SPA backup, not linked)
```

## Phone-app experience
- **Collapsible sidebar**: desktop collapses to icon rail (☰ in topbar); phones get a slide-in drawer with ✕ close + tap-outside-to-close + ESC.
- **Bottom navigation** on phones (Home · Quiz · Unis · Funding · Profile) — feels like a native app.
- **Safe-area aware** (notch/gesture bar), 44px+ touch targets, 16px inputs (no iOS zoom), tables scroll horizontally, modals become bottom sheets.
- **Offline-ready**: service worker caches the app shell; offline banner appears when connection drops.

## Security & legal
- XSS-safe rendering (`esc()` + `textContent` toasts), CSP meta on every page, security headers in `_headers`, `rel="noopener noreferrer"` on external links, 30-min idle sign-out, suspended-account blocking.
- **Legal**: `LICENSE`, `/legal/privacy.html`, `/legal/terms.html`, copyright footers on every page, DPA 2019 compliance. See `docs/SECURITY.md` for prototype limitations (migrate to Supabase Auth before production).

## Data (real & accurate)
- **REAL**: 24 CUE/KUCCPS/TVETA institutions with official websites, addresses, phones, intakes & campuses; 12 scholarships linking to official sites (new tab); 47 counties; HEF Bands 1–5.
- **MOCK**: only in demo accounts + tutor/admin pilot samples — always badged `⚠ MOCK DATA`.
- Always verify cut-offs/fees on the official websites linked in the app.

## Accounts
- **SuperAdmin:** emmanuelmwangi88@gmail.com / #Chege888 · code 888888 · 0758382850
- **Demo:** one-click buttons on signin.html (only place mock data appears)
- **Real students:** start empty → must complete onboarding (results + 12Q×6 quiz, redo anytime)

## Run
```bash
cd pathfinder-kenya && python3 -m http.server 8000
# then open http://localhost:8000
```

## Supabase (fast-first)
- Instant UI from local cache (<50 ms); background sync when keys are set.
- Setup: `supabase/README.md` (5 minutes). No keys? Fully offline local mode.
