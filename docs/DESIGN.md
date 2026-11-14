---
name: Kenyan Educational Pathway
colors:
  surface: '#faf7ff'
  surface-dim: '#ded9ea'
  surface-bright: '#faf7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3efff'
  surface-container: '#ede9ff'
  surface-container-high: '#e4dcf7'
  surface-container-highest: '#d9cef2'
  on-surface: '#2e1065'
  on-surface-variant: '#7a6fa8'
  inverse-surface: '#3b2a6b'
  inverse-on-surface: '#f3efff'
  outline: '#7a6fa8'
  outline-variant: '#cdc4e8'
  surface-tint: '#7c5cff'
  primary: '#7c5cff'
  on-primary: '#ffffff'
  primary-container: '#ede9ff'
  on-primary-container: '#2e1065'
  inverse-primary: '#c4b5fd'
  secondary: '#6d4aff'
  on-secondary: '#ffffff'
  secondary-container: '#e5dfff'
  on-secondary-container: '#2e1065'
  tertiary: '#ff7a59'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffedd5'
  on-tertiary-container: '#c2410c'
  error: '#e11d48'
  on-error: '#ffffff'
  error-container: '#fdecea'
  on-error-container: '#7a1f14'
  primary-fixed: '#ede9ff'
  primary-fixed-dim: '#c4b5fd'
  on-primary-fixed: '#2e1065'
  on-primary-fixed-variant: '#5b3fd6'
  secondary-fixed: '#e5dfff'
  secondary-fixed-dim: '#c7bcf5'
  on-secondary-fixed: '#1e0f4d'
  on-secondary-fixed-variant: '#4c33b8'
  tertiary-fixed: '#ffedd5'
  tertiary-fixed-dim: '#ffbfa5'
  on-tertiary-fixed: '#5c1a05'
  on-tertiary-fixed-variant: '#9a3c1c'
  background: '#faf7ff'
  on-background: '#2e1065'
  surface-variant: '#ede9ff'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
  headline-xl-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
  headline-lg:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: DM Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: DM Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: DM Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 2rem
  margin-lg: 3.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a warm, deeply grounded, and authoritative visual environment tailored for Kenyan secondary school graduates, university applicants, parents, and career seekers. The aesthetic is intentionally authentic to East African vitality—stepping away from cold, generic Western EdTech in favor of lush highlands, agricultural richness, and civic trust.

The design movement mixes **Modern Tactile Minimalism** with **Warm Civic Functionalism**:
- **Personality:** Authoritative, empathetic, uplifting, anchored, and clear.
- **Visual Weight:** Generous touch targets, high-contrast text rendering for varying screen glass qualities, tactile card elevations, and human-centered editorial spacing.
- **Emotional Response:** Inspires reassurance and aspiration. The interface feels like a reliable mentor—clarifying high-stakes university entry qualifications, TVET certifications, and career trajectories without overwhelming bureaucratic friction.

## Colors

The v5 palette is a **single violet accent family** on a warm-tinted off-white. It is deliberately narrow: one accent hue, one warm hue for urgency, and a neutral violet-tinted grey scale. That keeps the interface calm on small, low-cost screens and means colour never competes with the content.

- **Brand Violet (`#7c5cff`, dark variant `#6d4aff`):** The only accent in the system. Every interactive state uses it — buttons, active nav items, links, progress fills, focus rings. It is used sparingly, so when it appears it always reads as "tap here".
- **Deep Ink (`#2e1065`):** Headings and body text. A very dark violet rather than black — it ties type to the brand and softens glare against the light surfaces.
- **Muted Violet (`#7a6fa8`):** Secondary text, field labels and metadata.
- **Background Cream (`#faf7ff`) / Card Surface (`#ffffff`):** Page canvas and cards. The faint violet cast avoids the blue-light harshness of pure white in bright equatorial sun.
- **Accent Soft (`#ede9ff`):** The tint behind selected states — quiz options, role cards, the active sidebar item and the active bottom-nav tab.
- **Warm Coral (`#ff7a59`):** Reserved for urgency — deadlines, alerts, destructive actions. It is the only warm hue, so it always reads as an exception.
- **Status:** Green `#10b981` met / on track · Amber `#ffb020` borderline · Red `#e11d48` short or failed.

### Legacy variable names

`--lime`, `--lime2`, `--lime-soft` and `--lime-deep` are left over from the pre-v5 green palette, where the accent really was a lime green. They are now aliases that resolve to the violet brand so existing markup keeps working. **New code must use `--pine`, `--accent`, `--accent-soft` and `--accent-deep` instead.**

## Elevation & Depth

Depth is rendered with **violet-tinted ambient shadows**, never grey. Grey shadows go muddy against the violet-tinted cream; tinting them keeps edges crisp even when a phone dims its screen to save battery.

- **Level 0 (Canvas):** Background Cream (`#faf7ff`), entirely flat.
- **Level 1 (Cards):** Card Surface (`#ffffff`) over cream, hairline outline `rgba(124, 92, 255, 0.12)`, ambient shadow `0 1px 3px rgba(124, 92, 255, 0.06), 0 8px 24px -8px rgba(124, 92, 255, 0.10)`.
- **Level 2 (Interactive cards, hero panels):** `0 10px 24px -10px rgba(124, 92, 255, 0.18), 0 24px 48px -16px rgba(255, 122, 89, 0.12)` — the coral tail is what gives raised elements their warmth.
- **Level 3 (Modals, mobile drawer):** Backdrop `rgba(10, 31, 24, 0.5)` with `blur(5px)`, plus the Level 2 shadow. The mobile drawer additionally dims the page with `rgba(20, 10, 60, 0.45)` and `blur(2px)`.

## Shapes

A modern rounded corner aesthetic (`roundedness: 2`, `0.5rem` base, `1rem` for medium cards, `1.5rem` for parent containers and modals) introduces an approachable, student-friendly character while maintaining the discipline of an official guide. 

- Interactive chips and source verification badges utilize full pill geometry (`9999px`) to distinguish categorical items from structural content panels.
- Content cards, dashboard panels, and entry-grade input blocks leverage `1rem` (`rounded-lg`) corner radii for structured stability.

## Components

### Buttons
- **Primary (`.btn-dark`):** Violet gradient `135deg, #7c5cff → #8b5cf6 (55%) → #a78bfa`, white text, radius `0.8125rem`, height `50px` (`56px` for `.btn-lg`). Hover: lift `translateY(-1px)` with the Level 2 shadow.
- **Call to action (`.btn-lime`):** Violet-to-coral gradient `135deg, #7c5cff → #9d6bff (50%) → #ff7a59 (130%)` with a violet glow. Reserved for the one main action on a page.
- **Secondary (`.btn-line`):** White fill, `1.5px` violet border, violet text.
- **Ghost (`.btn-ghost`):** Cream-2 fill, hairline border, deep-ink text.
- **Sizing:** Every button is at least `48px` tall on phones, and inputs use `16px` text so iOS does not zoom on focus.

### Cards
- **Structure:** Card Surface (`#ffffff`), border `1px solid rgba(124, 92, 255, 0.12)`, radius `1.5rem`, padding `1.75rem` (`1.25rem` on phones).
- Cards lift by `2px` on hover. Institution modules lead with the institution's own brand colour as a crest tile.

### Chips & Badges
- **Neutral chip:** Pill (`9999px`), Accent Soft fill, deep-ink text, hairline violet border.
- **Verified source / on-track:** Green `#e6f4ea` on `#1e6b2e`, preceded by a filled checkmark — marks data traced to KUCCPS, CUE or TVETA.
- **Deadline / alert:** Light coral tint on `#c2410c`.
- **Indicative / mock data:** Amber `#fff7e6` on `#8a6d00` with a **dashed** border. The dash is what distinguishes "unverified" from "confirmed" at a glance without relying on colour alone.

### Progress indicators
- **Track bars:** `rgba(20, 52, 43, 0.09)` track, violet gradient (`#7c5cff → #c084fc`) fill, `99px` radius. Red gradient for below-target bars.
- **Quiz progress:** Segmented pill row; completed segments use the violet-to-coral gradient.
- **Cluster score bars:** Same violet fill, scaled against the 48-point maximum so bars are comparable across courses.

### Navigation
- **Desktop sidebar:** `256px`, collapsible to a `76px` icon rail. The active item uses an Accent Soft fill with an inset violet hairline.
- **Mobile:** The sidebar becomes a `280px` drawer with a scrim; a six-item bottom nav carries the primary destinations with `52px` minimum touch targets and safe-area padding.

### Motion
- Page and view entry fade in over `0.25–0.3s`. All animation is disabled under `prefers-reduced-motion: reduce`.

---

## Avatars (v6)

All people-pictures are **generated, not sourced**. `assets/js/avatar.js` builds each
avatar as inline SVG — a two-colour gradient plus one abstract motif on a 64×64
viewBox — so it is sharp at any size and costs no network request.

| | |
|---|---|
| Personas | 12 (`PF_PERSONAS`), each with an English and a Swahili name |
| Motifs | sun, rift, acacia, wave, star, bloom, compass, flask, circuit, book, bolt, peak |
| Sizing | the container decides; the SVG fills its box (`.pf-avatar{width:100%;height:100%}`) |
| Gradient ids | allocated per call, so repeated avatars never collide on one page |
| Default | `avatarForName(name)` — a stable hash, so a learner always gets the same one |

The previous set (ten anime illustrations, two photographs of real children) was deleted:
licensed artwork and photographs of identifiable minors are both a rights risk. **The app
now ships no image files of people.**

## Mobile rules (v6)

Two separate concerns, on purpose:

**Layout collapsing** (`@media(max-width:640px)`) — single-column grids, tighter
padding, smaller display type. Keyed to width, because a 740px-wide landscape phone
genuinely has room for two columns.

**Touch sizing and legibility** (`@media(max-width:640px),(max-height:520px)`) — the
44×44 tap-target minimum, the 12px type floor, 16px form fields. Keyed to the **short
side**, because a phone in landscape is 740×360: wider than the 640px breakpoint, so a
width-only query misses it entirely, yet it is still a touch device with 360px of
height.

Everything below lives in those queries; desktop is unaffected.

- **`.navcta`** — the nav action row wraps to its own full-width line with 44 px buttons.
- **Inline grids collapse**: `[style*="grid-template-columns"]:not(.keep-cols)` is forced
  to `1fr`. Inline styles outrank stylesheet rules, so this is the only way to reach them.
- **`min-width:0`** on grid children. Without it a grid item refuses to shrink below its
  content's intrinsic width, which is the usual cause of a page that still scrolls
  sideways after its columns have collapsed.
- **Tables** scroll inside their own box (`display:block; overflow-x:auto`).
- **Tap targets**: 44×44 minimum on hamburger, sidebar close, icon buttons, language
  switch, tabs, brand link and checkboxes. Footer and sidebar text links grow their hit
  area with padding and pull the layout back with an equal negative margin.
- **Legibility floor**: nothing below 12 px.

- **Scroll clearance**: `scroll-margin-top:84px; scroll-margin-bottom:104px` on
  interactive elements and `[id]`, so a focused field or anchor target never lands
  under the sticky top bar or the fixed bottom nav.
- **All fields**, not just `.input`, get `min-height:50px` — a bare `<input>` is 18px
  tall otherwise. Form text is 16px, which stops iOS Safari zooming on focus.
- **The drawer** uses `max-height:100dvh`; `100vh` is taller than the visible area on
  mobile browsers, so its bottom would sit behind the browser chrome.

Verify with:

| Command | What it does |
|---|---|
| `npm run test:mobile [w] [h]` | seven checks per page in real Chromium |
| `npm run test:overlay [w] [h]` | drawers and modals, which only exist while open |
| `npm run shots` | phone, landscape and desktop screenshots of every page |

Always run the audit in both orientations — landscape was the entire blind spot in the
first pass.

## Content that fits, and lines up (v7)

### Numbers

```css
th.num, td.num{ text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap }
```

Right-alignment is what makes a column of digits line up; `tabular-nums` is what keeps
them lined up, by giving every figure the same advance width. Tag the cell **and** its
header.

### Wide tables on a phone

Five columns in 360px leaves each about 15 characters — unreadable. Wide tables get
`class="stack"` and every cell a `data-label`; on a phone each record becomes one card
and the `::before` label replaces the hidden header.

```html
<table class="stack">
  <td class="num" data-label="Score">72</td>
```

### Breathing room

Inline `margin` values through these templates were tuned for a wide screen, where 4–6px
reads as comfortable. On a phone they look cramped, and an inline style outranks a
stylesheet rule, so phone spacing is applied deliberately:

- `.view > * + *` and `.card > * + *` carry a minimum gap (elements with their own
  inline margin keep it, so nothing shifts).
- `[style*="display:flex"]` wraps, and a `flex:1` child inside takes a full line, so a
  button beside text no longer collapses the text column.
- Consent labels flow as blocks with the checkbox floated beside the text.

Verify with `npm run test:comfort [w] [h]` — it measures characters per line,
line-height, card padding, stack gaps, numeric alignment, card heights and mixed
alignment. **It is non-blocking in CI on purpose**: it reports so the numbers can keep
improving.
