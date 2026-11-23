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

- `supabase-config.js` holds the publishable (anon) key only. It is meant to be
  public; what it can reach is decided by row level security. The `service_role`
  key must never appear in this repo.
- Every table has RLS on. `supabase/schema.sql` is the source of truth.
- **Profiles are created by a trigger** (`handle_new_user`) from the sign-up
  metadata. The browser cannot insert a profile, and a sign-up that asks for
  `admin` gets `student`. Admins are made by hand in the SQL editor.
- **Column guards.** RLS decides which rows you touch; `BEFORE UPDATE` triggers
  decide which columns. A user cannot change their own `role`, `email` or
  `suspended`; a tutor cannot set their own verification checks or lift a
  suspension; a learner cannot approve their own booking or re-route it; a
  learner cannot publish their own review.
- `is_admin()` is `security definer` with a pinned `search_path`, and reads
  `profiles.role` on the server. Editing `localStorage` can change what the
  screen shows, never what the database returns.
- Messages can only be posted by the two parties on a booking.
- The admin console reads every profile through the admin RLS policy and writes
  an `admin_actions` row for each decision. Removing an account suspends it
  instead: deleting an auth user needs the service key, which never ships to a
  browser.
- Offline writes wait in `S.syncQueue` and replay in order. A row the server
  rejects for good is dropped so it cannot jam the queue.

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

## Chat safeguarding

Built for minors first. Every message passes three checks, in the browser for
instant feedback and again in the database, which is the copy that counts (a
message sent straight to the API goes through `screen_message()` too).

1. **Who may chat** (`chat_gate`): the safety check is signed; learners are 13+;
   under-18s have a guardian on record who knows; the account is not suspended,
   muted or locked; learners are out of quiet hours (chat is closed 9 pm to
   6 am Nairobi time); and no more than 15 messages a minute.
2. **What is in it** (`safety_scan`): phone numbers (digits, spaced, spelled out
   in English or Swahili), social handles and apps, email addresses, links,
   payment outside the platform, profanity (English and Swahili, with spacing
   and symbol tricks such as `f u c k`, `sh1t`), threats, and grooming language:
   secrecy, photo requests, sexual content, meeting alone, gifts or money.
3. **What happens next** (`safety_intake`), the strike ladder:

| Finding | Message | Sender | Admins |
| --- | --- | --- | --- |
| Mild language | Blocked, shown as `####` | Warning, no strike | Flag in queue |
| Contact details, abuse, threats | Blocked | Warning, strike 1 of 3 | Flag in queue |
| Second strike in 30 days | Blocked | Chat muted 24 h | Flag in queue |
| Third strike | Blocked | Chat locked for review | Flag in queue |
| Grooming language | Blocked | Chat locked at once | **Urgent** alert |
| Self-harm wording | Delivered | Pointed to Childline Kenya 116 | Alert |

The sender sees their own message with the bad part replaced by `####` and a
plain-language warning. The recipient sees nothing: blocked rows are hidden from
them by row level security. Admins see the original (first 300 characters) in
the **Safeguarding queue** and can dismiss a false alarm, warn, mute for 24
hours, lock the chat, or suspend the account. Each action is recorded in the
audit log, and admins cannot be actioned from the queue.

Limits to keep in mind: a blocklist stops the obvious attempt, not a determined
adult, so the report button and a human reading the queue stay essential. The
quiet-hours rule treats every learner as a possible minor. A flagged message
keeps its excerpt for review. `purge_old_safeguarding()` runs nightly (pg_cron) and deletes
dismissed or warned flags after 12 months, lapsed mutes after a week and read
notifications after six months. Open cases and active restrictions are never touched.

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
   determined user. Human moderation of the safeguarding queue is required.
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

## Pictures and accounts on a shared phone

A profile (picture, county, school) belongs to the account that owns it, not to
whoever is signed in. `S.profileOwner` records the owner when the profile is
loaded; saves write to that owner's shelf, signing out shelves it and leaves a
blank profile behind, and a new account never inherits a picture. `genAvatar()`
draws the saved picture only for the signed-in person's own name; everyone else
gets their initials. Photos are cropped to 160 px and stay on the device: they are
never uploaded, which matters when the people in them are children.

The camera needs `Permissions-Policy: camera=(self)` (set in `vercel.json` and
`_headers`) and HTTPS. A policy of `camera=()` blocks it even when the user taps
Allow; a test fails if that ever comes back.

## Tutor directory

In live mode learners see only tutors an admin has verified (all four checks and a
`verified_at`), read from the `tutor_directory` view, which exposes a name, subjects,
area, rate, bio and open slots, and nothing else. The nine sample tutors appear in
demo mode only, labelled as samples.
