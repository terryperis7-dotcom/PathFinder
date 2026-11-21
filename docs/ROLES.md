# What each role can do

Three roles, three workspaces, one codebase. Every row below is implemented,
reachable from the UI, covered by `npm test` (unit + static), `npm run test:roles`
(behaviour) or `npm run test:clicks` (nothing throws), and — where it writes —
stored in `localStorage` in demo mode and in the matching Supabase table when a
project is connected.

Legend: **✓** works in demo mode today · **‑** works when `supabase-config.js`
holds a project (the UI states this) · **✗** deliberately not built, with the
reason.

---

## Learner (`student/…`)

| Capability                                                  | Where                      | Persists to                       |
| ----------------------------------------------------------- | -------------------------- | --------------------------------- |
| Enter grades, county, budget                                | Onboarding                 | `grades`, `profiles`              |
| Six-question career check → ranked pathways                 | Career check               | `quiz_answers`, `pathway_matches` |
| Cluster points for all 14 groups, biggest single lift       | Cluster points             | — (derived)                       |
| Search, filter, star and compare institutions               | Institutions               | `shortlists`                      |
| Funding bands, 12 scholarships, deadline rail               | Funding                    | —                                 |
| Set a target grade per subject, log mock scores, CSV export | My progress                | `targets`, `assessments`          |
| **Progress-over-time graph** drawn from logged scores       | Overview                   | — (derived)                       |
| Request a session, **change the slot** on an open request   | Find a tutor               | `bookings`                        |
| Moderated chat (numbers, handles, abuse blocked)            | Find a tutor → Chat        | `messages`, `safety_log`          |
| **Review a completed session** (stars + comment)            | Find a tutor → Sessions    | `reviews`                         |
| Report a tutor — goes straight to the safety queue          | Find a tutor → Report      | `reports`                         |
| Notification bell: decisions, blocked messages, reviews     | Every page                 | `notifications`                   |
| Export everything, delete the account                       | My profile · Account sheet | — (local wipe)                    |

## Tutor (`tutor/…`)

| Capability                                                         | Where               | Persists to               |
| ------------------------------------------------------------------ | ------------------- | ------------------------- |
| Accept / decline a request (messages the learner)                  | Overview · Requests | `bookings`, `messages`    |
| See every learner and their next session                           | My students         | `bookings`                |
| Open / close the 35 weekly slots learners can request              | Availability        | `availability`            |
| **Mark a session complete** → timestamp + ledger row               | Session log         | `bookings`, `session_log` |
| **Earnings ledger**: value at the published rate, last 7 days, CSV | Session log         | `session_log`             |
| **Submit verification evidence** for a missing check               | Verification        | `verify_submissions`      |
| Read the four-check state learners see                             | Verification        | `verify_checks`           |
| Rate estimator (rate × hours × 4)                                  | Overview            | `S.tutorRate`             |
| Bell: new requests, slot changes, reviews, suspensions             | Every page          | `notifications`           |

## Admin (`admin/…`, seven tabs)

| Capability                                                              | Where                     | Persists to                           |
| ----------------------------------------------------------------------- | ------------------------- | ------------------------------------- |
| Overview KPIs + **what needs attention** + **action trail**             | Overview                  | `admin_actions`                       |
| Approve / decline / hold / reopen a learning request                    | Requests                  | `bookings`                            |
| Masked contact, reveal per row (logged)                                 | Requests                  | `admin_actions`                       |
| Search + status filters (survive navigation)                            | Requests · Users · Safety | `S.adQ` / `S.adFilter`                |
| Role change per account, remove account (two-tap), CSV export           | Users & roles             | `profiles`                            |
| Record / revoke each verification check, with submitted evidence inline | Users & roles → Verify    | `verify_checks`                       |
| Approve / reject a tutor application with a stored decision             | Users & roles             | `tutor_applications`                  |
| **Resolve a report with a written outcome** the learner receives        | Safety                    | `reports.resolution`, `notifications` |
| Suspend / reinstate a tutor, dismiss / reopen a report                  | Safety                    | `suspensions`, `reports`              |
| Blocked-message log                                                     | Safety                    | `safety_log`                          |
| Reference-data audit (24 listings, 12 scholarships, 14 clusters) + CSV  | Data audit                | — (derived)                           |
| Live build checks, path to hosted auth                                  | Deployment                | —                                     |
| Kenya DPA 2019 posture, data inventory, launch gaps                     | Data protection           | —                                     |
| Announcement to everyone / students / tutors / admins                   | Bell → Announce           | `notifications`                       |
| Action trail export                                                     | Overview                  | —                                     |

---

## Deliberately not built (and why)

| Not built                         | Why                                                                                                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payments, payouts, commissions    | PathFinder takes no money. The ledger is labelled "planning log — payments are not live" and shows a derived fee, never a balance.                                           |
| Email or SMS notifications        | A static build has no mail server. The composer says delivery is device-local. Connecting an edge function + provider is documented in `supabase/README.md`.                 |
| File uploads for certificates     | Evidence is a **reference** the reviewer checks; uploading ID documents without a storage bucket, retention policy and consent flow would be worse than not collecting them. |
| Impersonation / "view as learner" | An admin must never read learner marks; the console head says so and no route exists.                                                                                        |
| Automatic bans                    | Suspension is a decision a named admin records, and it is logged.                                                                                                            |
| Bulk role changes                 | A one-tap bulk promote is how a pilot leaks admin rights.                                                                                                                    |

## Where the capabilities live in code

| Concern                                        | File                                              |
| ---------------------------------------------- | ------------------------------------------------- |
| Learner directory, chat, reviews, slot changes | `assets/js/pages/tutors.js` + `assets/js/chat.js` |
| Tutor workspace, ledger, evidence              | `assets/js/pages/tutor-workspace.js`              |
| Console, filters, trail, decisions             | `assets/js/pages/admin.js`                        |
| Bell, inbox, announcements                     | `assets/js/notify.js`                             |
| Charts                                         | `assets/js/charts.js`                             |
| Shared state, downloads, helpers               | `assets/js/core.js`                               |
| Schema, policies, triggers, seed               | `supabase/`                                       |
