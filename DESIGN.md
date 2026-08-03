---
name: FireGuard
description: The field register — a dense, flat, divider-ruled operations tool where the indigo accent marks the one next action.
colors:
  primary: '#4f46e5'
  primary-hover: '#4338ca'
  primary-active: '#3730a3'
  primary-dark: '#818cf8'
  primary-dark-hover: '#a5b4fc'
  primary-contrast: '#ffffff'
  surface-0: '#ffffff'
  surface-50: '#fafafa'
  surface-100: '#f5f5f5'
  surface-200: '#e5e5e5'
  surface-300: '#d4d4d4'
  surface-400: '#a3a3a3'
  surface-500: '#737373'
  surface-700: '#404040'
  surface-800: '#262626'
  surface-900: '#171717'
  surface-950: '#0a0a0a'
  success: '#22c55e'
  info: '#3b82f6'
  warn: '#f59e0b'
  danger: '#ef4444'
  invalid-border: '#f87171'
typography:
  display:
    fontFamily: 'Inter Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.875rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Inter Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: '-0.025em'
  title:
    fontFamily: 'Inter Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: '-0.015em'
  card-title:
    fontFamily: 'Inter Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 'normal'
  body:
    fontFamily: 'Inter Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
  label:
    fontFamily: 'Inter Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: 'normal'
  mono:
    fontFamily: 'JetBrains Mono Variable, ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
rounded:
  xs: '2px'
  sm: '4px'
  md: '6px'
  lg: '8px'
  xl: '12px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-contrast}'
    rounded: '{rounded.md}'
    padding: '8px 12px'
    height: '41px'
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
    textColor: '{colors.primary-contrast}'
  button-outlined:
    textColor: '{colors.surface-500}'
    rounded: '{rounded.md}'
    padding: '6px 10px'
    height: '35px'
  input:
    backgroundColor: '{colors.surface-0}'
    textColor: '{colors.surface-700}'
    rounded: '{rounded.md}'
    padding: '8px 12px'
  card:
    backgroundColor: '{colors.surface-0}'
    rounded: '{rounded.md}'
    padding: '20px'
  card-title:
    textColor: '{colors.surface-900}'
    typography: '{typography.card-title}'
  toast:
    backgroundColor: '{colors.surface-0}'
    rounded: '12px'
    width: 'min(25rem, calc(100vw - 2rem))'
  nav-row:
    textColor: '{colors.surface-900}'
    rounded: '{rounded.md}'
    padding: '0 10px'
    height: '32px'
  nav-row-active:
    backgroundColor: '{colors.surface-50}'
    textColor: '{colors.surface-950}'
  table-header-cell:
    backgroundColor: '{colors.surface-0}'
    textColor: '{colors.surface-500}'
    padding: '14px 20px 10px'
  table-body-cell:
    textColor: '{colors.surface-700}'
    padding: '12px 20px'
---

# Design System: FireGuard

## Overview

**Creative North Star: "The Field Register"**

FireGuard looks like a register that holds up in court: a bound record of interventions where every line is an entry, ruled off from the next by a hairline rather than boxed into a card. Nothing is decorative, because nothing in a register is decorative. The page is white or near-black, the text is a compact 14px, and structure comes from dividers, tinted asides, and section headings that sit directly on the page — not from a grid of identical bordered panels. An agent scanning a workspace on a phone in a stairwell reads rows, not ornaments.

The system is deliberately flat. Surfaces do not lift, glow, or cast shadows at rest; a shadow in this interface is a promise that something is genuinely floating above the page, which is why only popovers, modals, and toasts have one. Depth is carried instead by three tools that stay legible in bright daylight and in dark mode alike: a twelve-step neutral surface ramp, 1px borders, and generous internal padding. The result reads closer to Linear and Stripe's dashboards than to a consumer app, which is the intent.

The indigo accent is the exception that proves the rule, and it is rationed. It marks the single next action, the active navigation row, the focus ring, and nothing else. When an operator glances at a screen and sees indigo, that is the thing to press. Red is never the accent: red is reserved, alone, for danger and invalid state — a boundary this system had lost and has now restored.

**Key Characteristics:**

- Flat at rest; shadows only for genuinely floating layers.
- A neutral-only ground (`#fafafa` → `#0a0a0a`) with exactly one chromatic accent.
- 14px body text, dense but never cramped; hierarchy from weight and rhythm, not size jumps.
- 6px corners as the default; hairline 1px borders as the primary separator.
- Full light/dark parity through `html[data-theme="dark"]`; no light-only or dark-only surface.
- Status is always a colour _plus_ an icon and a label, never colour alone.

## Colors

A neutral, achromatic ground carrying one indigo accent and a four-tone status vocabulary — the palette of an instrument, not a brand campaign.

### Primary

- **Guard Indigo** (`#4f46e5`): the brand accent, named for the 45°-pivoted "guard" square in the logo. It fills the single primary action on a screen, the active navigation row's icon, the focus ring, the recommended next work item, and the ambient glow in the auth and onboarding showcases. It is the only chromatic colour in the system that is not a status. In light mode it fills at `#4f46e5`, deepening to `#4338ca` on hover and `#3730a3` on active. In dark mode the whole ramp shifts up one step — rest `#818cf8`, hover `#a5b4fc`, active `#c7d2fe` — so the button gains contrast against a near-black page rather than sinking into it.

### Neutral

The twelve-step surface ramp is the actual substance of the interface; almost every pixel is one of these.

- **Paper** (`#ffffff` / `surface-0`): the light-mode page and card ground.
- **Rail** (`#fafafa` / `surface-50`): hover and active backgrounds for navigation rows, striped table rows, tinted asides.
- **Wash** (`#f5f5f5` / `surface-100`): row hover in tables, icon-tile backgrounds in empty states.
- **Hairline** (`#e5e5e5` / `surface-200`): the default 1px border and divider in light mode.
- **Field Edge** (`#d4d4d4` / `surface-300`): input borders at rest.
- **Mute** (`#a3a3a3` / `surface-400`): inactive icons; muted text in dark mode.
- **Secondary Text** (`#737373` / `surface-500`): descriptions, table header labels, timestamps.
- **Body Ink** (`#404040` / `surface-700`): default light-mode body text; the dark-mode border.
- **Aside** (`#262626` / `surface-800`): dark-mode dividers and striped rows.
- **Dark Paper** (`#171717` / `surface-900`): the dark-mode card and content ground.
- **Pitch** (`#0a0a0a` / `surface-950`): the dark-mode page ground and input fill.

Dark mode is not an inversion: the page goes to `#0a0a0a`, content surfaces sit _above_ it at `#171717`, and inputs drop back down to `#0a0a0a`. Text goes to pure `#ffffff` with `#a3a3a3` for muted.

### Status

One tone per meaning, applied through the shared severity vocabulary (`@shared/tag-severity`) so the same state looks identical everywhere.

- **Success** (`#22c55e` / green-500; text `green-600`, dark `green-400`): completed work items, resolved issues, published state.
- **Info** (`#3b82f6` / blue-500): neutral notices, in-progress state.
- **Warn** (`#f59e0b` / amber-500): blockers that do not stop the workflow, quota pressure, pending sync.
- **Danger** (`#ef4444` / red-500; text `red-600`, dark `red-400`): destructive actions, failures, blocking issues. The invalid form-field border is a lighter step of the same hue (`#f87171` light, `#fca5a5` dark).

### Named Rules

**The One Alarm Rule.** Red belongs to danger and invalid state, and to nothing else. It is never the brand accent, never a decorative fill, never a chart's first series. In a fire-safety product, an operator who sees red must be able to read it as "something is wrong" without a second thought. _(This rule was broken until the `primary` ramp was mapped to indigo; the red-as-primary state is the anti-reference.)_

**The Rare Accent Rule.** Indigo covers well under 10% of any screen. If a mockup has two indigo buttons competing in the same viewport, one of them is not the next action and must become outlined or ghost.

**The Semantic Ramp Rule.** Never write a raw neutral hex or a literal Tailwind grey (`bg-gray-100`, `text-zinc-500`). Every neutral goes through `surface-*`, which is what makes dark mode work for free.

## Typography

**Display / Body Font:** Inter Variable (with `ui-sans-serif`, `system-ui`, `sans-serif`), self-hosted so it survives offline and is cached by the service worker.
**Mono Font:** JetBrains Mono Variable (with `ui-monospace`, `SFMono-Regular`, `Menlo`) — for revision hashes, `FG-{number}` intervention codes, and any identifier meant to be compared character by character.

**Character:** One neutral, highly legible face doing all the work, with a monospace used strictly as a semantic signal rather than a stylistic flourish. There is no display face and no pairing contrast: this is a tool, and the type gets out of the way. Hierarchy comes from weight (400 → 600) and negative tracking on the larger steps, not from dramatic size jumps.

The root stays at 16px so every rem-based utility resolves to its nominal value; body text is set to 14px on `<body>` instead. This is deliberate — shrinking the root would have scaled the spacing and radius scales down with it.

### Hierarchy

- **Display** (600, 30px / `text-3xl`, 1.2, `-0.025em`): rare. Its sanctioned consumers are the onboarding showcase headline and the focused-page `h1` (error and maintenance pages), which writes `text-3xl font-semibold tracking-[-0.025em] text-balance text-surface-950 dark:text-surface-0` — the historical `-0.03em` tracking there is drift. A dashboard count is **not** a Display consumer.
- **Headline** (600, 24px / `text-2xl`, 32px, `-0.025em`): the page `h1`. The single largest thing on a routed page.
- **Title** (600, 18px / `text-lg`, 1.5, `-0.015em`): section headings, empty-state titles, drawer headers.
- **Card Title** (600, 15px / `0.9375rem`): the `p-card` heading — a half-step below Title so a card inside a section never competes with the section.
- **Body** (400, 14px / `text-sm`, 1.5): the workhorse. 417 usages against 15 for `text-base`; when in doubt the answer is `text-sm`.
- **Label** (600, 12px / `text-xs`): table column headers, meta lines, timestamps, counts. Counts and any aligned figures take `tabular-nums`.
- **Mono** (400, 12px): revision hashes and `FG-` codes only.

### Named Rules

**The 14px Body Rule.** Body copy is `text-sm`. The scale steps _up_ from there for headings and _down_ only to `text-xs` for meta. The 13px / 12.5px / 11.5px / 11px cluster is gone — 104 arbitrary sizes all sitting within 1.6px of a real step were collapsed onto `text-sm` and `text-xs`. Do not reintroduce one.

**The One Arbitrary Size Rule.** Exactly one arbitrary type value is sanctioned: `text-[15px]`, the **Card Title** role, which PrimeNG's preset already applies to `p-card` headings and Tailwind has no utility for. Everything else off the scale is drift. Two clusters predate this rule and are not precedent: the 28px auth page titles (`text-[1.75rem]`) and the 52px showcase hero (`text-[3.25rem]`), the one marketing-weight moment in the app.

**Icon size is not type size.** A `text-*` utility on a `<i class="pi …">` sets a glyph's box, not a reading size, and the type ramp does not govern it — an 11px check inside an 18px checkbox is proportion, not fine print. This rule previously read the two as one and condemned a "sub-10px label" cluster that turned out to be **18 icon glyphs out of 20 occurrences**: chevrons, status dots, sync and clock marks. The two that really were text — pairs of initials set at 10px inside 24px circles, in the direct-message rail and the activity timeline — are now on the 12px Label step, and the timeline marker grew from 20px to 24px to hold it. Set icons from the size of what contains them; set text from the ramp. Where a ramp step already fits the container, prefer it anyway — `text-xs` holds a check inside an 18px checkbox and a chevron inside a nav row perfectly well, so an arbitrary `text-[10px]` or `text-[11px]` there buys a bespoke value and nothing else. Reach off the ramp only when no step fits the box.

**The Tabular Figures Rule.** Any number that sits in a column, a counter, or a `{done}/{total}` pair takes `tabular-nums` so digits stop jittering as values change.

**The Heading Ink Rule.** The light/dark ink pair of every heading role is fixed — there is exactly one per role, and the four historical pairings collapse onto them:

- page `h1` (Headline): `text-surface-950 dark:text-surface-0`,
- section `h2` (Title) and card titles (Card Title): `text-surface-900 dark:text-surface-0`,
- subtitles and descriptions: `text-surface-500 dark:text-surface-400`.

`dark:text-surface-50` and `dark:text-surface-100` on a heading are drift: dark-mode strongest text is pure white (see Colors). The full canonical strings live in the Canonical Class Strings section.

## Layout

The app is a persistent shell, not a series of pages: a workspace layout composed of an icon rail, a secondary navigation column, the routed content area, and optional right-hand panel and header-action slots that features contribute into. Two other shells exist — a split layout (form beside a full-bleed showcase panel) for auth and onboarding, and a focused layout for errors and maintenance.

**Page padding** follows one convention, and routed pages own their own edges: `p-3 sm:p-6 md:p-7 lg:p-8`. The `xl:p-10` step is not free air — it is tied to width: **a page widens to `xl:p-10` iff it is a `mx-auto max-w-7xl` surface** (dashboard, settings, account). Collection pages (`h-full` table surfaces) never take it. The single documented exception is the intervention detail workspace, which runs full-bleed and manages its own edges.

**Containers** are chosen by content, not by habit: `max-w-md` / `max-w-xl` for forms and dialog bodies, `max-w-3xl` for settings columns, `max-w-prose` for genuine reading passages, `max-w-7xl` for wide dashboards. Collection surfaces run to the full content width. One root container string per page family — workspace collection, workspace wide, create/edit, auth, focused — is canonical; the five strings live in the Canonical Class Strings section. `max-w-prose` is the only reading width: the `[60ch]` / `[64ch]` arbitraries collapse onto it.

**Spacing** is Tailwind's default scale at a 16px root — 4 / 8 / 12 / 16 / 24px does the vast majority of the work. Vertical rhythm inside a section is `gap-3` / `gap-4`; between sections it is a divider plus `py-4` rather than a large margin.

**Breakpoints** are Tailwind's defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). The responsive behaviour that matters is the field scene: below `sm`, side rails stack under the main column with a top border instead of a left divider, and the primary phase action mirrors into a fixed thumb-zone bar at the bottom of the viewport. The intervention properties rail is 19rem and becomes a divider-separated column at `xl`.

**The shell header names the page, and below `lg` it names only the page.** The 56px bar carries the breadcrumb as its visible title (with an `sr-only` `h1` behind it). A full trail does not fit a phone — `Home › Organization › Interventions › Intervention` wrapped the bar onto two lines and still cut the last crumb mid-word, so the one crumb that says where the member actually is was the one that got truncated. Ancestors are hidden below `lg` rather than shortened: the hamburger beside them already goes back, so the trail was carrying navigation the header offers twice. This is done in CSS, not by swapping the model on `isDesktop()` — that signal is `false` during SSR, so the collapsed trail would render into the HTML and then visibly expand on a desktop hydration.

**A four-step progress rail names its position on a phone.** Four phase labels do not fit across 390px, so the stepper hides all but the active one — which left three unnamed circles. It carries a `Step 2 of 4 · Next: Review` line below it instead, `aria-hidden` because the list above already exposes every label and `aria-current="step"`.

### Named Rules

**The Rhythm-Not-Boxes Rule.** Hierarchy comes from varying surface levels — borderless section headers, one carded work surface, a tinted secondary aside, divider-separated lists. Wrapping every section in an identical bordered card is the house anti-pattern.

**The 44px Floor.** Below `sm`, every interactive control is at least 44px tall (`min-h-11` or equivalent padding) — the field scene is a gloved thumb on a cold phone. A control under 44px justifies itself; the default does not.

## Elevation & Depth

This system is **flat by default and by configuration**. `p-card` ships with `shadow: none`, form fields ship with `shadow: none`, and across the entire application there are nine shadow utilities in total. Depth is expressed by surface tint (`surface-0` content sitting on a `surface-50` page; `surface-900` content on a `surface-950` page), 1px hairline borders, and padding — never by a resting shadow.

A shadow therefore carries real information: it means this layer is genuinely floating above the page and will be dismissed.

### Shadow Vocabulary

- **Popover** (`box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)`): dropdowns, selects, menus, tooltips, date pickers.
- **Modal** (`box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)`): dialogs, drawers, and the toast deck.

### Named Rules

**The Flat-At-Rest Rule.** If it does not dismiss, it does not cast a shadow. A card, a table, a panel, and an input are all flat at rest; hover changes the _background tint_, not the elevation.

## Shapes

Corners are softened just enough to read as modern, never enough to read as friendly. The scale is 2 / 4 / 6 / 8 / 12px plus fully round, and **6px is the default** — buttons, inputs, cards, menus, and navigation rows all land there. `rounded-lg` (8px) and `rounded-xl` (12px) are for larger containers: icon tiles, plan cards, showcase panels, skeleton blocks. `rounded-full` is reserved for genuinely circular or pill-shaped things — avatars, status dots, counters, segmented toggles — and it is the most-used radius in the app precisely because those elements are everywhere.

Borders are the system's structural line: 1px, `surface-200` in light and `surface-800` in dark, used as card outlines, table-header underlines, list dividers, and the left rule on a nested navigation row. There is no thick border anywhere, and no double border: when two bordered surfaces meet, one of them loses its edge.

### Named Rules

**The 6px Default Rule.** Unless the element is a pill, an avatar, or a large container, its radius is 6px. Do not introduce new radius values. The scale now has **no outlier**: the toast's 10px — the one value the system had to carve an exception for — moved onto the 12px large-container step it always belonged on. In utilities that means `rounded-md`: bare `rounded` and `rounded-sm` (both 4px) are drift, and `rounded-border` — the tailwindcss-primeui plugin utility mapping to `var(--p-content-border-radius)` — renders the same 6px but sits outside the project vocabulary; write `rounded-md`.

## Components

Character in one phrase: **precise and unobtrusive**. Hairline edges, flat surfaces, gently softened corners, and state read from contrast and surface tint rather than from shadow or movement.

Everything is PrimeNG styled through the design-token preset (`core/primeng/presets/fireguard.preset.ts`), with Tailwind utilities for layout and `[pt]` reserved for structural adjustments and for ARIA that PrimeNG omits.

### Buttons

- **Shape:** softly squared (6px radius); full-width form buttons run to 41px tall, compact icon buttons to 35px.
- **Primary:** filled Guard Indigo (`#4f46e5`) with white text, 8px × 12px padding, 16px label on form submits. One per screen.
- **Hover / Focus:** background deepens to `#4338ca` in light and lightens to `#a5b4fc` in dark, over a 0.2s colour transition; focus shows a 2px indigo outline offset 2px from the edge.
- **Outlined / Ghost:** transparent fill, `surface-200` border, `surface-500` label, 6px × 10px padding, 14px. This is the default for secondary and icon-only actions.
- **Destructive:** never a filled indigo button. Destructive actions use the danger tone and are confirm-gated.

**The focus ring is 2px everywhere.** The preset sets `focusRing.width: 2px` so PrimeNG controls match the `focus-visible:outline-2` convention every hand-rolled control already follows — Aura ships 1px, which left the two halves of the app disagreeing about the thickness of a keyboard user's only wayfinding cue, with the PrimeNG half the thinner one. Form fields keep their own zero-width ring: an input signals focus by shifting its border to the accent, which is a deliberate exception rather than an oversight.

### Inputs / Fields

- **Style:** `surface-0` fill in light and `surface-950` in dark, a 1px `surface-300` / `surface-600` border, 6px radius, 8px × 12px padding, and no shadow at any point in the lifecycle.
- **Type size:** 16px — deliberately above the body size, which is what stops mobile Safari zooming the viewport on focus.
- **Focus:** the border shifts to Guard Indigo; no glow, no ring expansion.
- **Invalid:** border shifts to `#f87171` (light) / `#fca5a5` (dark), paired with a message — never colour alone.

### Cards / Containers

- **Corner Style:** 6px.
- **Background:** `surface-0` in light, `surface-900` in dark.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px `surface-200` / `surface-800` where the card must separate from the page.
- **Internal Padding:** 20px body padding with a 12px gap between blocks; the card title is 15px/600.

The same visual object exists in two sanctioned implementations, chosen by structure — never a third:

- **`p-card` + shared PT constants** where the pass-through structure earns it: the table card shell (`TABLE_CARD_SHELL_PT`) and dashboard widgets with header/body slots.
- **The literal panel string** everywhere else: `rounded-md border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900`. A plain bordered panel writes this string verbatim — the `p-3` / `p-4` / `sm:p-8` paddings, `rounded-lg`/`xl` radii, and `surface-700` border tints found on hand-rolled sections are drift. No shared constant wraps it: making cards easier to stamp out fights the Rhythm-Not-Boxes Rule.

### Tables

- **Header cell:** `surface-500` / `surface-400` label at 12px semibold, padding `14px 20px 10px`, on the card background rather than a tinted strip.
- **Body cell:** padding `12px 20px`.
- **Row states:** striped rows use `surface-50` / `surface-800`; hover uses `surface-100` / `surface-800`.
- **Shell:** collection tables sit in a flex card shell with a bordered header row (`px-4 py-3`, bottom border) and an internally scrolling body, so the toolbar stays put while rows scroll.
- **Toolbar ownership:** the collection toolbar (search, filters, create) lives in the table card shell's header on single-table pages. It sits at page level only when it commands several views — the interventions List / Board / Calendar index is the one such page.

### Navigation

- **Style:** 32px-tall rows, 6px radius, 10px horizontal padding, 10px gap, 14px label, `surface-900` / `surface-100` text.
- **Default / Hover:** transparent, hovering to `surface-50` in light and `white/5` in dark.
- **Active:** `surface-50` / `surface-900` background, weight rises to 600, text goes to `surface-950` / `surface-50`, and **the icon turns indigo** — the accent is the active marker.
- **Icons:** 13px, fixed 4-unit width so labels align regardless of icon shape; inactive icons are `surface-400`.
- **Counts:** 12px semibold `tabular-nums`, right-aligned.
- **Nested rows:** indented with a left 1px rule and a right-only radius, so hierarchy reads as an outline rather than a second list.

**The Two-Context Hover Rule.** There are exactly two hover tints. Interactive rows and controls _outside_ tables — nav rows, ghost/icon buttons, list rows — hover `hover:bg-surface-50 dark:hover:bg-white/5`. Table rows hover `hover:bg-surface-100 dark:hover:bg-surface-800`, owned by the datatable preset. `dark:hover:bg-surface-900`, `surface-800/60`, and a `surface-100` hover outside a table are drift.

### Tags & Status

Every status renders through one shared registry: a descriptor supplies label, severity, and icon, and the component renders **icon plus label plus tone** together. A severity dot is `bg-{green|blue|amber|red}-500`; severity text is `text-{…}-600` in light and `-400` in dark.

A tag carries the **Label** role — 12px / 600 — not body weight. `p-tag` is themed to match: Aura draws tags at 14px / 700, heavier than any other text in the app and a step larger than the meta lines they sit on. Its severities are remapped onto this system's four tones as well, because Aural reaches for `sky` and `orange` where the app uses `blue` and `amber`, and the two rendered side by side as two different blues.

### Messages

`p-message` is an inline notice, not a floating layer: 14px body text, **no resting shadow**, and `amber` for `warn`. All three correct Aura defaults that fought the system — 16px text one step above body across 177 call sites, a drop shadow the Flat-At-Rest Rule reserves for surfaces that dismiss, and a `yellow` warn tone that made the same warning two colours depending on which component drew it.

`size="small"` is a **density variant, not a type step**. It carries most of the app's messages, nearly all inline field-validation errors, and keeps body size — shrinking it would mean either 12px error copy or reviving the retired 13px step.

### Empty & Error States

Centred blocks rather than inline banners: a 52px rounded-xl `surface-100` / `surface-800` tile holding a 20px icon, an 18px semibold title, a 14px `surface-600` description capped at `max-w-prose`, and an action row. The whole block is capped at `max-w-lg` with `py-14` breathing room.

Both blocks take a **`dense`** input for use inside a card, panel, or collapsible section rather than on an otherwise empty page: `py-7`, a 44px tile, and the 15px Card Title step. The default padding is right for a page and wrong for a section — a dashboard card reporting one failed query rendered a full-page-sized failure notice, and an empty checklist on a phone spent a quarter of the screen saying so. Every `app-error-state` in the app is card-embedded and therefore dense; `app-empty-state` uses both.

The error concept has a **second shape**: the inline list-failure banner (`app-error-banner`), for "this surface could not load, retry" above content that keeps its place. It renders `p-message severity="error"` + icon + message + a Retry action — never a hand-rolled red `div` or a bare red paragraph.

**The Quiet Retry Rule.** The retry action of any error surface is `severity="secondary" [outlined]="true" size="small"` with `pi pi-refresh` — never `danger`. The banner is already red; red marks the failure, not the recovery (One Alarm Rule).

### Toasts

Width `min(25rem, calc(100vw - 2rem))`, 12px radius (`border.radius.xl`, the large-container step), summary at weight 650, stacked as a deck.

### Overlays — sizes

Dialog widths come from `shared/overlay-size`, three steps and nothing else: **S `28rem`** (confirmations), **M `32rem`** (single-column forms), **L `42rem`** (rich or two-column bodies) — historical 30rem and 36rem migrate to M and L. Every dialog also takes the one canonical `breakpoints` object (`≤ 640px → 92vw`) so no dialog ever exceeds a phone. Drawers are `!w-full sm:!w-[34rem]`.

### Loading

`p-skeleton` is the only load-in treatment, its shapes mirroring the final layout, with `motion-reduce:animate-none` on every loop. A spinner exists only as `p-button [loading]` on the triggering control — never a hand-rolled `animate-pulse` block, a raw `pi-spin` glyph, or a page-centred `p-progressSpinner`.

### Counters

A count pill (tab counts, list totals, unread counts) is one literal span, not a component: `rounded-full bg-surface-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-surface-600 dark:bg-surface-800 dark:text-surface-300`. Status pills go through `@shared/tag` + `@shared/tag-severity`; `p-badge` stays unused (it is an overlay-positioning component the preset does not theme).

### Charts

No chart draws a hard-coded colour. The palette is derived entirely from the token vocabulary:

- **axes, grids, tick labels, tooltips:** the `surface-*` ramp (both themes),
- **status series:** the four-tone status vocabulary (`green` / `blue` / `amber` / `red`),
- **the primary or accent series:** indigo (`primary-*`),
- **categorical pairs** (e.g. facilities vs equipment): indigo for the lead series, `surface-400`/`surface-500` for the secondary,
- **temporal comparison** (current vs previous period): the same hue lightened (`primary-300`) or dashed — never a new hue.

Introducing any other hue requires amending this document first. The activity heatmap's intensity ramp uses `green-*` steps (the success tone) — an `emerald` ramp is drift.

## Canonical Class Strings

The single source of truth for the literal strings the uniformization pass applies. When a template and this table disagree, the template is drift. Every string is one uninterrupted literal (Tailwind scans `.ts` and `.html`; a assembled class name produces no CSS).

| Role                                                      | Canonical string                                                                                                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `h1` — workspace page title                               | `text-2xl font-semibold tracking-tight text-surface-950 dark:text-surface-0` (+ `min-w-0 truncate` when dynamic). The auth cluster keeps its documented `sm:text-[1.75rem]` step. |
| `h1` — focused pages (error/maintenance)                  | `text-3xl font-semibold tracking-[-0.025em] text-balance text-surface-950 dark:text-surface-0` (the Display role)                                                                 |
| `h2` — section title on the page                          | `text-lg font-semibold tracking-[-0.015em] text-surface-900 dark:text-surface-0`                                                                                                  |
| Card/panel title (inside any bordered surface)            | `text-[15px] font-semibold text-surface-900 dark:text-surface-0` — no tracking; an `h2` never renders below 15px                                                                  |
| Subtitle / description                                    | `text-sm text-surface-500 dark:text-surface-400`                                                                                                                                  |
| Container — workspace collection                          | `flex h-full min-h-0 flex-col gap-6 p-3 sm:p-6 md:p-7 lg:p-8` — never `xl:p-10`                                                                                                   |
| Container — workspace wide (dashboard, settings, account) | `mx-auto flex w-full max-w-7xl flex-col gap-6 p-3 sm:p-6 md:p-7 lg:p-8 xl:p-10`                                                                                                   |
| Container — create/edit                                   | the standard ramp + inner `mx-auto w-full max-w-3xl` panel (panel string, `p-5`)                                                                                                  |
| Container — auth                                          | `mx-auto flex w-full max-w-xl flex-col gap-8 px-6 sm:px-8` (the layout owns vertical); onboarding keeps `max-w-4xl`                                                               |
| Container — focused                                       | `mx-auto flex w-full max-w-md flex-col px-6 py-16 text-center`                                                                                                                    |
| Reading width                                             | `max-w-prose` only                                                                                                                                                                |
| Panel surface (non-table)                                 | `rounded-md border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900`                                                                               |
| Radius                                                    | default `rounded-md`; bare `rounded` and `rounded-sm` migrate to it (pills → `rounded-full`); `rounded-lg`/`rounded-xl` only on large containers; `rounded-border` → `rounded-md` |
| Hover — nav rows, ghost/icon buttons, list rows           | `hover:bg-surface-50 dark:hover:bg-white/5`                                                                                                                                       |
| Hover — table rows                                        | `hover:bg-surface-100 dark:hover:bg-surface-800` (the datatable preset owns it)                                                                                                   |
| Error-surface retry button                                | `severity="secondary" [outlined]="true" size="small"` + `pi pi-refresh` — never `danger`                                                                                          |
| Dialog widths                                             | S `28rem` / M `32rem` / L `42rem` + the canonical `breakpoints` object (`≤ 640px → 92vw`), from `shared/overlay-size`                                                             |
| Drawer width                                              | `!w-full sm:!w-[34rem]`                                                                                                                                                           |
| Count pill                                                | `rounded-full bg-surface-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-surface-600 dark:bg-surface-800 dark:text-surface-300`                                           |
| Focus ring                                                | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary` (`-outline-offset-2` when the control fills its row) — never `ring-*`                      |
| Touch target                                              | interactive controls ≥ 44px below `sm` (`min-h-11` or equivalent)                                                                                                                 |
| Icon button                                               | `<p-button [text]="true" severity="secondary" size="small" icon="…" [ariaLabel]="…">` — not a hand-rolled `size-8` button                                                         |

## Do's and Don'ts

### Do:

- **Do** route every colour through the tokens: `primary`, `surface-*`, and the four severity tones. Literal greys and raw hexes break dark mode.
- **Do** style through the preset first (`core/primeng/presets/fireguard.preset.ts`), and reserve `[pt]` for structural adjustments and missing ARIA.
- **Do** write literal Tailwind class strings — Tailwind v4 scans `.ts` and `.html`, so a dynamically assembled class name silently produces no CSS.
- **Do** give every interactive element `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary` — `-outline-offset-2` when the control fills its row. It is the app-wide convention and, since the sweep that added it to 32 bare controls, there is no hand-rolled `<button>` or `<a>` in the app without it.
- **Do** name every control. A `<label>` wrapping a `p-select` does **not** name it: the focusable node is a `span[role="combobox"]`, which is not labelable, and PrimeNG fills its `aria-label` with the selected _value_. Point `ariaLabelledBy` at the visible label's id so the name follows the translation.
- **Do** let the global `pt` in `app.config.ts` carry live-region semantics for `p-message` — `role="alert"`/`assertive` for errors, `status`/`polite` otherwise — instead of repeating them at 177 call sites.
- **Do** pair every status colour with an icon and a text label.
- **Do** mark every decorative icon `aria-hidden="true"`. A PrimeIcon is an icon-font glyph drawn from the Private Use Area, so a screen reader that reaches one announces nothing useful at best and a junk character at worst; the accessible name belongs on the control, never on the glyph. A sweep found **40 of 152** `<i>` tags unmarked across 24 files — the convention was right and the coverage was not.
- **Do** vary surface levels to build hierarchy: a borderless page header, one carded work surface, a tinted aside, divider-separated rows.
- **Do** set a property list as two columns — names down one, values down the other — with sentence-case labels in `surface-500`. Reading a stack of name-above-value pairs costs twice the height and gives the eye no column to run down.
- **Do** use `text-sm` for body copy and `tabular-nums` for anything counted.
- **Do** ship both themes in the same change — every `bg-`, `text-`, and `border-` gets its `dark:` counterpart.
- **Do** guard what actually moves: `motion-reduce:animate-none` on every looping animation and skeleton, `motion-reduce:transition-none` on `transition-transform` and the bare `transition` shorthand. Colour fades (`transition-colors`, 46 of them) are deliberately left unguarded — `prefers-reduced-motion` addresses movement, and blanket-guarding a 150ms tint change is noise dressed as accessibility.

### Don't:

- **Don't** edit `src/styles.css`. It carries the Tailwind import, the two font faces, the dark variant, and the root/body sizes — nothing else belongs there.
- **Don't** write a tracked uppercase micro-label — above a heading, above a value, or as a section marker. This is a ban, not a preference, and it is the one the codebase kept losing: the intervention properties rail had stacked **eleven** of them. A heading carries its own weight at the Title or Card Title step; a property name is sentence case in `surface-500`. The day-of-week headers in the calendar (`MON TUE WED`) and the channel-group labels in the collaboration sidebar are the only sanctioned uppercase in the app, because both are established conventions of their own component genre rather than decoration.
- **Don't** use red for anything but danger and invalid state. The accent is indigo.
- **Don't** put a second filled indigo button in the same viewport as the primary action.
- **Don't** add a resting shadow to a card, table, panel, or input. If it does not dismiss, it is flat.
- **Don't** wrap every section in an identical bordered card.
- **Don't** introduce new radius values, new type steps, or arbitrary `text-[13px]`-style sizes.
- **Don't** add a `shared/` wrapper whose only purpose is to avoid repeating PrimeNG markup — use the PrimeNG component directly and accept the duplication.
- **Don't** convey state through motion or colour alone, and don't add page-load choreography that delays the task.

### Resolved: dark mode lightens the accent

Dark mode does **not** reuse the light-mode accent step. The primary surface is `#818cf8`
(`{primary.400}`) carrying the `#0a0a0a` label, measured at **6.64:1**; light mode keeps
`#4f46e5` with a white label at **6.29:1**. Both clear AA for normal text.

The earlier pairing — `#4f46e5` with a near-black label — measured 3.15:1 and failed the
standard PRODUCT.md commits to, on every primary button and every indigo link in the app. It
also made the rest → hover step a three-stop jump; the accent ramp now reads 400 → 300 → 200.
Keep it that way: when the accent changes, re-measure both themes, not one.
