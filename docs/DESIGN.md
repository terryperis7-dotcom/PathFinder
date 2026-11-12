---
name: Kenyan Educational Pathway
colors:
  surface: '#fbf9f3'
  surface-dim: '#dcdad4'
  surface-bright: '#fbf9f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ed'
  surface-container: '#f0eee8'
  surface-container-high: '#eae8e2'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c18'
  on-surface-variant: '#414845'
  inverse-surface: '#30312d'
  inverse-on-surface: '#f3f1eb'
  outline: '#717975'
  outline-variant: '#c0c8c4'
  surface-tint: '#3f665a'
  primary: '#002920'
  on-primary: '#ffffff'
  primary-container: '#173f35'
  on-primary-container: '#82aa9d'
  inverse-primary: '#a6cfc1'
  secondary: '#4e6700'
  on-secondary: '#ffffff'
  secondary-container: '#c7ee62'
  on-secondary-container: '#526b00'
  tertiary: '#4c0601'
  on-tertiary: '#ffffff'
  tertiary-container: '#6a1d10'
  on-tertiary-container: '#f1836e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecdd'
  primary-fixed-dim: '#a6cfc1'
  on-primary-fixed: '#002019'
  on-primary-fixed-variant: '#274e43'
  secondary-fixed: '#caf165'
  secondary-fixed-dim: '#afd44b'
  on-secondary-fixed: '#151f00'
  on-secondary-fixed-variant: '#3a4d00'
  tertiary-fixed: '#ffdad3'
  tertiary-fixed-dim: '#ffb4a5'
  on-tertiary-fixed: '#3f0300'
  on-tertiary-fixed-variant: '#7d2b1d'
  background: '#fbf9f3'
  on-background: '#1b1c18'
  surface-variant: '#e4e2dd'
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

The color palette draws directly from Kenya's diverse landscape—from highland tea estates to sun-warmed red soil:

- **Primary Deep Pine (`#173f35`, variant `#153c33`):** Conveys academic institutional weight, stability, and governmental/curriculum trust. Used for primary typography, dominant containers, navigation, and key interactions.
- **Fresh Lime Accent (`#b9df55`, vibrant highlight `#d9f28a`):** Signifies youthful growth, modern momentum, and active progress. Utilized on interactive highlights, active badges, progress indicators, and actionable tags.
- **Warm Background Cream (`#f5f3ed`):** Eliminates harsh blue-light glare and delivers paper-like reading comfort under harsh ambient equatorial sun.
- **Crisp Card Surface (`#fffefa`):** Elevates readability, isolating complex subject matrices and career pathways cleanly above the cream canvas.
- **Accent Coral/Terracotta (`#ed806b`):** Earthy warmth reserved for alerts, critical deadlines, urgent requirements, and KUCCPS cluster alerts.
- **Golden Amber (`#efba55`):** Warm optimism reserved for scholarship flags, merit honors, and mid-tier progress indicators.

Contrast ratios adhere strictly to WCAG 2.1 AA across low-cost mobile IPS panels under bright sunlight. Text on `#f5f3ed` and `#fffefa` consistently uses `#173f35` or `#2b3632` rather than light grays.

## Typography

Typography pairs **Manrope** for authoritative structural clarity with **DM Sans** for neutral, open, and effortless long-form reading across small mobile viewports.

- **Headlines (Manrope):** Geometric, sturdy, and high-impact. The structural geometry instills immediate credibility and modern poise for programme titles, degree names, and national cut-off announcements.
- **Body & Labels (DM Sans):** Low-contrast grotesque strokes prevent visual noise on screens with poor subpixel rendering. High x-height ensures dense course descriptions, entry prerequisites, and fee tables remain comfortable to digest.
- **Letter Spacing:** Headlines run slightly condensed (`-0.015em`) for punchy rhythm, while micro-labels utilize positive tracking (`+0.03em`) to safeguard legibility at small sizes on entry-level Android devices.

## Layout & Spacing

The layout model is built on an adaptive responsive grid:
- **Mobile (< 640px):** 4 columns, `1rem` margin, `1rem` gutter. Critical touch targets must stay at or above `48px` to support single-hand operation on public transit (matatus).
- **Tablet (640px - 1024px):** 8 columns, `2rem` margin, `1.5rem` gutter.
- **Desktop (> 1024px):** 12 columns, max content container of `1240px`, centered with `3.5rem` outer margin and `2rem` gutter.

Spacing adheres strictly to a 4px/8px baseline rhythm. Stacked forms and pathway progression lists prioritize vertical rhythm to prevent cognitive overload.

## Elevation & Depth

Visual hierarchy uses **tonal layer nesting** combined with soft, warm-tinted ambient shadows. Dark, heavy grey shadows are avoided; instead, depth is rendered using the primary pine tone at minimal opacity:

- **Level 0 (Canvas Base):** Warm Cream (`#f5f3ed`), entirely flat.
- **Level 1 (Cards & Modules):** Crisp Card (`#fffefa`) layered over cream, rimmed by a subtle outline `rgba(23, 63, 53, 0.08)` and elevated by an ambient shadow `0 2px 8px -2px rgba(23, 63, 53, 0.06)`.
- **Level 2 (Interactive Cards & Flyouts):** Raised cards and active navigation pills feature `0 8px 24px -4px rgba(23, 63, 53, 0.10)`.
- **Level 3 (Modal Sheets & Mobile Menus):** Overlays with backdrop filter `blur(6px)` with warm pine-tinted wash, shadow `0 16px 36px -6px rgba(21, 60, 51, 0.20)`.

This tactile formulation keeps edges crisp even when screens scale down brightness to save battery.

## Shapes

A modern rounded corner aesthetic (`roundedness: 2`, `0.5rem` base, `1rem` for medium cards, `1.5rem` for parent containers and modals) introduces an approachable, student-friendly character while maintaining the discipline of an official guide. 

- Interactive chips and source verification badges utilize full pill geometry (`9999px`) to distinguish categorical items from structural content panels.
- Content cards, dashboard panels, and entry-grade input blocks leverage `1rem` (`rounded-lg`) corner radii for structured stability.

## Components

### Buttons
- **Primary:** Deep Pine (`#173f35`) solid background, Warm Cream (`#f5f3ed`) text, `rounded-lg` (0.5rem), minimum height `48px`. Hover: `#153c33` with subtle translateY(-1px).
- **Accent / Action:** Fresh Lime (`#b9df55`) background, Deep Pine (`#173f35`) text, bold font weight. Used for critical progression points (e.g., "Check Admission Odds").
- **Secondary:** Transparent fill with `1.5px` border in `#173f35`, text in `#173f35`.
- **Destructive/Urgent:** Warm Terracotta (`#ed806b`) with dark pine or white text for alert actions.

### Cards
- **Structure:** Crisp surface (`#fffefa`), border `1px solid rgba(23, 63, 53, 0.08)`, corner radius `1rem`. Internal padding uses `space-lg` (1.5rem).
- **Course & TVET Modules:** Include header with University/College crest, cluster badge, and minimum required KCSE mean grade highlighted via high-contrast chips.

### Chips & Badges
- **Verified Source Badge:** Pill-shaped (`9999px`), light pine surface (`rgba(23, 63, 53, 0.08)`), text `#173f35`, prepended with a filled checkmark icon in `#b9df55`. Indicates official KUCCPS, CUE, or TVETA data.
- **Deadline/Alert Badges:** Pill-shaped, light terracotta tint (`rgba(237, 128, 107, 0.15)`), text `#a83d29`.
- **Scholarship/Merit Badges:** Golden Amber fill (`#efba55`), dark pine text.

### Progress Rings & Career Alignment
- **Indicator Rings:** Circular SVG meters with `#173f35` track and dynamic `#b9df55` progress arcs. Center displays typography token `headline-sm` indicating percent complete or cluster weight fulfillment.
- **Track bars:** Background `rgba(23, 63, 53, 0.1)`, fill `#b9df55` with `0.5rem` radius.

### Input Fields
- **Default State:** Background `#fffefa`, border `1.5px solid rgba(23, 63, 53, 0.2)`, text `#173f35`, height `48px`, corner radius `0.5rem`.
- **Focus State:** Border `#173f35`, subtle ring `3px rgba(185, 223, 85, 0.3)`.
- **Error State:** Border `#ed806b`, helper text in `#ed806b`.

### Lists
- Multi-row pathway checklists featuring circular state icons (check, lock, or active pulse). Separators use `1px solid rgba(23, 63, 53, 0.06)`. Touch height padded to `52px` minimum per row.