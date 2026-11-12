# PathFinder Kenya — Security Notes
© 2026 PathFinder Kenya. All rights reserved. See /LICENSE.

## What is implemented
- **XSS-safe rendering**: all user input is escaped (`esc()` in `assets/js/app.js`) and toasts use `textContent`, never `innerHTML` with user data.
- **Content Security Policy**: meta CSP on every page + `_headers` for Netlify/Cloudflare (see below). Scripts only from `self` + jsDelivr; no inline event handlers are trusted beyond the app's own code.
- **Security headers** (`_headers`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`.
- **External links**: all `target="_blank"` links carry `rel="noopener noreferrer"` (prevents reverse tabnabbing).
- **Session hygiene**: 30-minute idle auto sign-out; sign-out clears session + timestamp; suspended accounts are blocked at sign-in.
- **Input limits**: avatar upload capped at 2 MB; forms use `type="email"`/`required`; search is debounced (120 ms) to avoid abuse.
- **Privacy**: no third-party trackers; local storage only for session + preferences; DPA 2019 rights honoured (see `/legal/privacy.html`).

## Prototype limitations (must fix before production)
- **Auth is localStorage-based** (demo). Passwords are not hashed server-side. **Before launch, migrate to Supabase Auth** (see `supabase/README.md`): enable email/password auth, Row-Level Security, and remove `checkPassword()` demo logic.
- **SuperAdmin credentials** are seeded in `assets/js/app.js` for the prototype. In production, create the SuperAdmin via Supabase Auth + a `profiles` row with `role='superadmin'`, and delete the seeded constant.
- **No rate limiting** on sign-in (local). Supabase Auth provides rate limiting in production.

## Reporting
Found a vulnerability? Email **security@pathfinder.ke** (see `/.well-known/security.txt`). Please do not disclose publicly until we have had a chance to fix it.

## Deploy headers
- **Netlify / Cloudflare Pages**: `_headers` in repo root is picked up automatically.
- **Apache**: add the headers from `_headers` to `.htaccess`.
- **Nginx**: add equivalent `add_header` directives.
