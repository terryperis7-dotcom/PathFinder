# Security and privacy

PathFinder handles two sensitive things: **KCSE results** and **messages between
minors and adults**. Both are treated as data that should not leave the device
unless the deployment explicitly opts in.

## Data flows

| Mode               | What is stored                                                                                                  | Where                                                                 | Leaves the device?                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| **Demo (default)** | account (name, email, role, county, salt, PBKDF2 hash), profile, grades, assessments, shortlist, bookings, chat | `localStorage` under `pf-accounts-v1`, `pf-session-v1`, `pf-state-v1` | **No.** Zero network calls                      |
| **Supabase**       | the same rows                                                                                                   | your Supabase project, RLS-protected                                  | Yes, over HTTPS to `https://*.supabase.co` only |

No analytics, no third-party script, no CDN, no advertising pixel, no cookie.

## Local credentials

`hashPw()` in `assets/js/core.js`:

```
PBKDF2-SHA256(password, per-account 10-char salt, 60 000 iterations) → hex
```

- Plain passwords are never stored, logged or put in a toast.
- Each account gets an independent random salt.
- The hash is compared as a string; a mismatch throws `Wrong password.` and the
  session is not created.
- Demo mode is deliberately _not_ claimed to be production auth: it protects
  against shoulder-surfing and casual inspection, not a determined attacker with
  the device. Real accounts belong on Supabase Auth.

## Supabase mode

- `supabase-config.js` holds the **anon** key only. The `service_role` key must
  never appear in this repository — it bypasses every policy.
- `supabase/schema.sql` enables RLS on every table. Representative policies:
  - `profiles` — `select`/`update` only where `auth.uid() = id`; inserts limited to the caller's own id.
  - `learner` — owner-only read/write; admins via `is_admin()`.
  - `tutor` — readable by the assigned student and the tutor; writes tutor-only.
  - `safety` — insert by any authenticated user, read by admins only.
  - `reference` — read-only to `authenticated`, written by service role.
- `is_admin()` is a `security definer` function reading `profiles.role`, so a
  client cannot fake the claim.
- Writes go through `sb.upsert()`; when offline they are queued in
  `S.syncQueue` and replayed on the next page load. The queue is local, so a
  failed replay never loses the local copy.

## Content Security Policy

`_headers` (Vercel/Netlify format):

```
default-src 'self'; img-src 'self' data:;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
script-src 'self'; connect-src 'self' https://*.supabase.co;
frame-ancestors 'self'; base-uri 'self'; form-action 'self'
```

- `script-src 'self'` — **no inline JavaScript anywhere**. `tools/check_html.py`
  fails CI if an inline `<script>` or `onclick=` appears.
- `style-src 'unsafe-inline'` is required because some layout values are computed
  inline (progress widths, avatar colours); no user-supplied CSS is ever injected.
- `frame-ancestors 'self'` blocks clickjacking embeds.
- Also set: `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, `Permissions-Policy` (geolocation, camera and
  microphone denied), `Strict-Transport-Security` on HTTPS deployments.

## Output escaping

Every interpolation of user-controlled text goes through `esc()` (`core.js`),
which escapes `& < > " '`. That covers names, counties, school names, chat
messages and tutor bios. Attribute values are always quoted. URLs coming from
data files are validated as `https:` at seed time and in the tests.

`genAvatar()` never injects the raw name: it takes the **initials only**, upper-
cased and length-capped, and derives the gradient from a numeric hash — so a
crafted name cannot break out of the SVG.

## Chat moderation

`safetyCheck()` (also enforced inside `sendMessage`) blocks, before the message is
stored:

- phone numbers — any 10-digit Kenyan sequence, spaced, dashed or with `+254`;
- `@handles`, email addresses, WhatsApp/Telegram/Facebook/Instagram/TikTok/X/Snap mentions;
- profanity from a fixed list, in English and Swahili;
- messages that ask a student to meet offline or to pay outside the platform.

Blocked text is not silently dropped: the student sees "Message not sent — phone
numbers and social handles are not allowed here." Reports go to the admin
**Safety** queue with the tutor, the reason and the timestamp.

## Data-protection posture (Kenya DPA 2019)

- **Lawful basis:** consent at sign-up, with a plain-language notice in `legal/privacy.html`.
- **Data minimisation:** name, email, county, grades, role. No ID number, no birth
  date, no photograph, no location, no device fingerprint.
- **Minors:** under-18s are the primary users, so there is no public profile, no
  discovery, no direct messaging between students, and tutors are role-gated.
- **Right to erasure:** _Profile → Delete my data_ clears the three local keys and,
  in Supabase mode, the caller's rows via RLS.
- **Portability:** _Profile → Export my data_ downloads a JSON snapshot.
- **Retention:** demo data lives until the user clears it; Supabase deployments
  should schedule deletion of inactive learner rows after one admission cycle.
- **Breach path:** `admin/dpa.html` records the register — DPO contact, 72-hour
  notification to the ODPC, and the affected-table list.

## Known limitations (publish these)

1. Demo mode is device-local; clearing the browser erases the account. There is
   no password reset in demo mode.
2. There is no server-side rate limiting on the static build — put Supabase (or a
   WAF) in front of any public deployment.
3. The safety filter is a blocklist: it stops the obvious attempts, not a
   determined user. Human moderation of the admin queue is still required.
4. Tutor verification is a workflow, not a cryptographic guarantee; the admin
   queue is the control.
5. Third-party links (HELB, KUCCPS, foundations) open in a new tab and are the
   responsibility of those sites.

## Reporting

Security issues: open a private security advisory on the repository rather than a
public issue. Expect an acknowledgement within 72 hours.

## Notifications

- Notes live in `pf-state-v1` on the device, scoped by audience
  (`student` / `tutor` / `admin` / `all`). They are read back per role, so a
  learner session cannot render an admin or tutor note.
- Notification bodies never carry contact details. A blocked-message note names
  the _reason_ (phone number, social handle, offensive language), not the text.
- Seeded rows are marked `DEMO` and the panel says where notes are kept. The
  announcement composer states that delivery is device-local — nothing here
  claims an email or SMS was sent, and no mail credentials are used.
- Opening a note only routes to an in-app view through `go()`; `link` values are
  view names, never URLs, so a note cannot become an open redirect.

## Admin accountability

- Every consequential admin action appends to `S.adminLog` (client) and
  `public.admin_actions` (database). The table is append-only: admins can insert
  and select, never update or delete, so a decision cannot be quietly rewritten.
- Report outcomes are stored with the text the learner was shown, and the report
  row keeps `resolution`, `resolved_at` and `resolved_by`.
- Verifying a tutor is a separate, logged act from submitting evidence: a tutor
  may file a reference, only an admin can flip the badge, and both appear in the
  trail.
- Reviews are private to the learner and the tutor they concern until published;
  `reviews.published` defaults to false, and only the author may update the row.
