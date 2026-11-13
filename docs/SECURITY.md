# PathFinder Kenya — Security notes

© 2026 PathFinder Kenya. All rights reserved.

## What is implemented
- **XSS-safe rendering**: user-controlled text is escaped with `esc()` before it goes into HTML; toasts use `textContent`.
- **Content Security Policy** on every page (meta tag) and as an HTTP header (`vercel.json` / `_headers`), restricting scripts to the site itself and jsDelivr.
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`.
- **Auth**
  - With Supabase configured: Supabase Auth (server-side password handling, rate limiting, email confirmation). The role comes from the `profiles` table.
  - Local demo mode: passwords are salted and hashed with PBKDF2-SHA-256 (150,000 iterations), compared in constant time, with a 30-second lockout after 5 failures.
  - SuperAdmin accounts can **not** be self-registered.
- **Database**: Row Level Security everywhere; clients can't change `role`; audit log is insert-only for users. See [`supabase/schema.sql`](../supabase/schema.sql).
- **Open-redirect protection** on the `?next=` sign-in parameter.
- **CSV export hardening** against spreadsheet formula injection.
- **Service worker** only handles same-origin requests, so API responses (private data) are never cached.
- **External links** use `rel="noopener noreferrer"`; `window.open` calls drop the opener.
- **Session hygiene**: 30-minute idle sign-out; sign-out also ends the Supabase session.

## Known limitations (read before launch)
1. **Front-end page guards are not a security boundary.** Anyone can edit `localStorage` in their own browser. Real protection is Supabase Auth + RLS, so never put sensitive data behind local mode.
2. **Local demo mode is not secure storage.** Use it for demos only; connect Supabase before collecting real student data.
3. The demo accounts (`Continue as … (Demo)`) are intentionally password-less and show clearly labelled mock data.
4. The Supabase script is loaded from jsDelivr using `@2`. For stricter supply-chain control, pin an exact version and add a Subresource Integrity hash.
5. Tutor and admin workspaces are **previews**: sample data, simulated actions.

## History: credentials that were committed
Earlier versions of this repository contained a hard-coded SuperAdmin email, phone number, password and access code in `assets/js/app.js`, `signup.html`, `signin.html` and `supabase/README.md`. They were removed, but **they remain in git history**. Treat them as compromised: change that password everywhere it is used, never reuse that access code, and consider rewriting history (e.g. `git filter-repo`) if the repository is public.

## Reporting
Email the address in [`.well-known/security.txt`](../.well-known/security.txt) (replace the placeholder domain with one you own). Please don't disclose publicly until it is fixed.

## Deploy headers
- **Vercel**: `vercel.json` (this repo).
- **Netlify / Cloudflare Pages**: `_headers`.
- **Apache / Nginx**: copy the headers from `vercel.json` into your server config.
