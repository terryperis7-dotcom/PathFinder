# Design system

The UI is a single violet-on-cream language shared by all 25 pages. Nothing here
depends on a framework — every rule lives in `assets/css/style.css` (tokens,
layout, components) and `assets/css/app.css` (page-specific modules).

## Colour

All colour comes from custom properties declared on `:root`. Never type a hex
value into a page.

| Token                               | Value                                   | Use                                                |
| ----------------------------------- | --------------------------------------- | -------------------------------------------------- |
| `--pine`                            | `#7c5cff`                               | primary violet — buttons, active nav, focus rings  |
| `--pine2`                           | `#6d4aff`                               | pressed / hover state                              |
| `--pine3`                           | `#2e1065`                               | headings and the darkest ink                       |
| `--pine-soft`                       | `#a78bfa`                               | disabled accents, chart fills                      |
| `--accent-soft`                     | `#ede9ff`                               | tinted panels, chips, selected rows                |
| `--cream`                           | `#faf7ff`                               | page background                                    |
| `--cream2`                          | `#f3efff`                               | alternating section background                     |
| `--card`                            | `#ffffff`                               | surfaces                                           |
| `--ink` / `--muted`                 | `#2e1065` / `#7a6fa8`                   | body copy / secondary copy                         |
| `--terra`                           | `#ff7a59`                               | the one warm accent: deadlines, warnings, "SAMPLE" |
| `--amber` `--green` `--red` `--sky` | `#ffb020` `#10b981` `#e11d48` `#38bdf8` | status                                             |

`--lime` and `--lime-soft` are aliases kept for older markup; they resolve to the
violet. Do not add new colours — use a status token or a tint of `--pine`.

## Type

- Display: **Manrope** 700–800 (`--font-d`) — headings, KPI numbers, buttons.
- Body: **DM Sans** 400–600 (`--font-b`) — everything else.
- Both load from Google Fonts with `display=swap`; the stack falls back to
  `system-ui` so the site is readable with no network at all.
- Numerals in KPIs and the cluster table are tabular so columns do not jiggle.

Sizes are fluid: headings use `clamp()`, so a 360 px phone and a 1440 px laptop
get the same hierarchy without a second stylesheet.

## Space, radius, depth

- 4 px spacing scale; sections breathe at 40–64 px on mobile, 72–96 px on desktop.
- `--r: 24px` for cards and panels; 12–14 px for chips, inputs and icon buttons; 999 px for pills.
- Two shadows only: `--shadow` (resting card) and `--shadow2` (raised / hover). They are violet-tinted, never grey.
- Borders are `1px solid var(--line)` — a 12 % violet hairline that reads as an edge, not a box.

## Components

| Component             | Class                                         | Notes                                                                                                                                                   |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                | `.btn`, `.btn.ghost`, `.btn.terra`, `.btn.sm` | 44 px minimum height, full-width under 480 px                                                                                                           |
| Card                  | `.card`                                       | white surface, `--r`, `--shadow`                                                                                                                        |
| Panel                 | `.panel`                                      | tinted section inside a card (`.panel.soft`, `.panel.warn`)                                                                                             |
| Chip / pill           | `.chip`, `.chip.demo`, `.pill`                | status and metadata                                                                                                                                     |
| KPI tile              | `.kpi`                                        | label, big tabular number, delta line                                                                                                                   |
| Field                 | `.field` + `.input` / `.select` / `.textarea` | 16 px text so iOS does not zoom on focus                                                                                                                |
| Toggle                | `.switch`                                     | 44 × 26 px, keyboard operable                                                                                                                           |
| Progress              | `.bar > i`, `.ring`                           | CSS-only, no canvas                                                                                                                                     |
| Accordion             | `.acc`                                        | `<button aria-expanded>` + region                                                                                                                       |
| Modal                 | `#modalBg` + `.modal`                         | `role="dialog"`, focus trap, Esc closes, backdrop click closes                                                                                          |
| Toast                 | `#toastWrap` → `.toast`                       | bottom-centred on mobile, bottom-right on desktop                                                                                                       |
| Avatar                | `genAvatar(name)`                             | an illustrated face (`assets/avatars/a1…a10.jpg`, 41 KB the set), or an inline SVG monogram — 14 colours × 8 backgrounds — or your own photo            |
| Avatar picker         | `openAvatarPicker()`                          | Faces / Initials / Photo · face edges plain/ring/glow · drafts repaint a live preview · an old emoji preference is mapped to a face                     |
| Camera sheet          | `pfOpenCamera({facing, square, onShot})`      | live `getUserMedia` viewfinder, flip, capture, mirror-corrected still; `false` return means "fall back to the file input"                               |
| Account isolation     | `pfSwitchAccount(prevId, acc)`                | personal slices shelved per account id; a new account gets blank defaults and demo-seeded rows are cleared                                              |
| Institution directory | `PF_INST` + `instCounts()`                    | 86 entries: 38 public + 32 private universities, 10 university colleges, 6 TVET; counts always derived from the data                                    |
| Console head          | `.ac-head`                                    | warm-to-violet panel that opens the admin console                                                                                                       |
| Tab strip             | `.ac-tabs` / `.ac-tab`                        | horizontal, scrollable, real `<a href>` links to the nine admin pages; `.on` is the filled violet state, `.n` carries a count and `.n.hot` a rose count |
| Console KPI           | `.ac-kpi`                                     | label, big tabular number, one-line note; `.warn` / `.good` tint the number                                                                             |
| Request / report card | `.ac-req`                                     | learner or tutor line, quoted reason with a warm left rule, status pill, masked contact, action row                                                     |
| Console list row      | `.ac-li` + `.ac-dot`                          | icon tile (violet / rose / amber / green / sky), title, one-line explanation, right-aligned action                                                      |
| Source row            | `.ac-src`                                     | official-link list: name, domain, what it is for                                                                                                        |
| Console head mark     | `.ac-mark`                                    | oversized translucent shield, decoration only (`aria-hidden`)                                                                                           |
| Sidebar footer row    | `.foot-link`                                  | full-width text button used by Safety centre / Sign out — two rows, not three                                                                           |
| Profile card          | `.prof-pop` + `.pp-*`                         | the floating card behind the top-bar picture: identity, three facts, inline edit, photo, safety, export, sign out                                       |
| Setup card            | `.onb-card`, `.onb-field`, `.onb-hero`        | one card per question in the sign-up flow, no sidebar on those two pages                                                                                |
| Date field            | `pfDateWire(input)`                           | a text box that formats itself as dd/mm/yyyy and hands the state an ISO date                                                                            |
| Band card             | `.band-card` + `.tone-*`                      | five vertical HEF cards, each with its own colour, a scholarship/loan bar and the one-line explanation                                                  |
| Institution card      | `.inst-card-3` (3 per row)                    | logo, type/region/field, cut-off bar out of 48, fees, funding, programme list, compare + details                                                        |
| Icon                  | `<svg><use href="#i-name"/></svg>`            | sprite injected by `icons.js`; `npm run check` rejects unknown ids                                                                                      |

## Layout

- App pages: fixed sidebar (280 px) + content column, collapsing to a bottom tab
  bar (5 items) under 980 px. `padding-bottom` always includes `--safe-b` for
  iPhone home-bar clearance.
- Public pages: centred column, max 1120 px, no sidebar, sticky header.
- Grids: `repeat(auto-fit, minmax(240px, 1fr))` — no media queries needed for most
  card walls.

## Mobile rules (non-negotiable)

1. Every tappable thing is at least **44 × 44 px**.
2. Inputs are **16 px** minimum — smaller triggers iOS zoom.
3. Nothing scrolls horizontally; long words break, tables scroll inside their card.
4. Bottom nav, sticky CTAs and modals respect `env(safe-area-inset-*)`.
5. Animations are transform/opacity only and are disabled entirely under
   `prefers-reduced-motion: reduce` (`motion.js`).
6. The app must be usable at 320 px width with the keyboard open.

## Accessibility

- Landmarks on every page: `<header>`, `<nav aria-label>`, `<main id="main">`, `<footer>`.
- A skip link is the first focusable element.
- Focus is always visible (`:focus-visible` violet ring, 3 px offset).
- Colour is never the only signal — status chips carry text, grades carry letters.
- Dialogs move focus in, trap it, and return it to the trigger on close.
- Every icon-only control has an `aria-label`; decorative SVGs are `aria-hidden`.

## Copy

Sentence case, British/Kenyan English (organisation, programme, county), numbers
as digits. Say what the user can do next, not what the system did. Never promise
placement: every score screen carries "Guidance only — official decisions come
from KUCCPS, HEF and HELB."

### Notifications (bell + panel)

| Part         | Class                          | Notes                                                                                                                                  |
| ------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Bell button  | `.notif-btn`                   | 40 px circle in the top bar, 19 px bell glyph, `aria-expanded` on the trigger                                                          |
| Unread badge | `.notif-badge`                 | Brand terra, tabular figures, `9+` cap, `[hidden]` when the count is zero, gentle tap animation only while unread                      |
| Panel        | `.notif-pop`                   | 380 px card anchored right; becomes a full-width sheet under 640 px                                                                    |
| Row          | `.nitem` / `.ntile` / `.nmain` | 34 px tinted icon tile per kind (`lav`, `sky`, `rose`, `vio`, `peach`, `mint`), two-line clamp on the body, `DEMO` chip on seeded rows |
| Footer       | `.np-foot`                     | Storage mode on the left, _Announce_ (admins) and _Mark all read_ on the right                                                         |

Rules: one accent (violet) for state, terra only for the badge and the target
rule, nothing blinks. The panel is a popover, not a modal — it never traps focus
and closes on outside click or `Escape`.

### Charts

`assets/js/charts.js` renders SVG only — no canvas, no library, no chart
framework to keep in sync.

| Piece   | Class                   | Notes                                                                                                   |
| ------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Wrapper | `.gchart`               | `viewBox` 640 × 190, `width:100%`, so it is fluid down to 320 px                                        |
| Grid    | `.gc-grid` / `.gc-ax`   | Three dashed rules at 0 / 50 / 100 with unit labels                                                     |
| Series  | `.gc-line` / `.gc-area` | 2.5 px violet stroke over a gradient fill (`stop-opacity` .38 → 0)                                      |
| Points  | `.gc-dot`               | White fill, violet ring; each carries a `<title>` with the real value so hover and screen readers agree |
| Target  | `.gc-tgt`               | Dashed terra rule plus a small "target 88%" label                                                       |
| Legend  | `.gc-legend`            | Series key, target key, and the sample size on the right                                                |

`pfBarChart()` stays for subject-by-subject comparison; the line chart is for
anything that moves over time. An empty series draws nothing at all — the caller
shows an empty state and says why.

### Console filters and outcome notes

| Part         | Class              | Notes                                                                                             |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------------- |
| Filter row   | `.ac-filter`       | Search field plus status chips, wrapping to two rows on a phone                                   |
| Search       | `.ac-search`       | 42 px shell with a leading icon; focus ring uses the violet accent                                |
| Chips        | `.ac-chip` / `.on` | Pill buttons; the active one takes the violet tint, never a solid fill                            |
| Outcome note | `.ac-note`         | Mint card with a check glyph, used for a report's outcome and the decision text on an application |

Filters live in state (`S.adQ`, `S.adFilter`) so a re-render or a page change does
not lose them, and the same component is used on Requests, Users and Safety.
