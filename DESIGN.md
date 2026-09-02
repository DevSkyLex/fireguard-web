---
name: FireGuard
description: A warm-neutral, ember-accented, instrument-dense control surface for planning and publishing field interventions.
colors:
  background: 'oklch(0.985 0.003 80)'
  foreground: 'oklch(0.18 0.006 60)'
  card: 'oklch(0.995 0.002 80)'
  card-foreground: 'oklch(0.18 0.006 60)'
  popover: 'oklch(0.995 0.002 80)'
  primary: 'oklch(0.646 0.194 41.1)'
  primary-foreground: 'oklch(0.18 0.006 60)'
  secondary: 'oklch(0.955 0.005 80)'
  secondary-foreground: 'oklch(0.18 0.006 60)'
  muted: 'oklch(0.955 0.005 80)'
  muted-foreground: 'oklch(0.5 0.012 70)'
  accent: 'oklch(0.955 0.01 65)'
  destructive: 'oklch(0.577 0.245 27.3)'
  success: 'oklch(0.596 0.145 163.2)'
  warning: 'oklch(0.666 0.179 58.3)'
  info: 'oklch(0.609 0.126 221.7)'
  border: 'oklch(0.91 0.006 80)'
  input: 'oklch(0.91 0.006 80)'
  ring: 'oklch(0.646 0.194 41.1)'
  sidebar: 'oklch(0.975 0.004 80)'
  sidebar-accent: 'oklch(0.945 0.01 65)'
  sidebar-border: 'oklch(0.91 0.006 80)'
  chart-1: 'oklch(0.646 0.194 41.1)'
  chart-2: 'oklch(0.666 0.179 58.3)'
  chart-3: 'oklch(0.596 0.145 163.2)'
  chart-4: 'oklch(0.609 0.126 221.7)'
  chart-5: 'oklch(0.58 0.2 293)'
  chart-6: 'oklch(0.6 0.21 17)'
  background-dark: 'oklch(0.155 0.004 286)'
  foreground-dark: 'oklch(0.967 0.004 91)'
  card-dark: 'oklch(0.195 0.005 286)'
  primary-dark: 'oklch(0.705 0.187 47.6)'
  primary-foreground-dark: 'oklch(0.155 0.004 286)'
  secondary-dark: 'oklch(0.258 0.009 286)'
  muted-dark: 'oklch(0.225 0.007 286)'
  muted-foreground-dark: 'oklch(0.767 0.012 90)'
  accent-dark: 'oklch(0.245 0.01 60)'
  destructive-dark: 'oklch(0.711 0.166 22.2)'
  success-dark: 'oklch(0.773 0.153 163.2)'
  warning-dark: 'oklch(0.837 0.164 84.4)'
  info-dark: 'oklch(0.797 0.134 211.5)'
  border-dark: 'oklch(0.258 0.009 286)'
  input-dark: 'oklch(0.324 0.012 286)'
  ring-dark: 'oklch(0.705 0.187 47.6)'
  sidebar-accent-dark: 'oklch(0.225 0.008 60)'
  chart-1-dark: 'oklch(0.705 0.187 47.6)'
  chart-2-dark: 'oklch(0.837 0.164 84.4)'
  chart-3-dark: 'oklch(0.773 0.153 163.2)'
  chart-4-dark: 'oklch(0.797 0.134 211.5)'
  chart-5-dark: 'oklch(0.709 0.159 293.5)'
  chart-6-dark: 'oklch(0.719 0.169 13.4)'
typography:
  subhead:
    fontFamily: 'Geist Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.5556
    letterSpacing: 'normal'
  headline:
    fontFamily: 'Geist Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: 1.3333
    letterSpacing: '-0.025em'
  title:
    fontFamily: 'Geist Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 'normal'
  body:
    fontFamily: 'Geist Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.4286
    letterSpacing: 'normal'
  label:
    fontFamily: 'Geist Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.3333
    letterSpacing: 'normal'
  mono:
    fontFamily: 'Geist Mono Variable, ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.4286
    letterSpacing: 'normal'
rounded:
  sm: '0.375rem'
  md: '0.5rem'
  lg: '0.625rem'
  xl: '0.875rem'
  2xl: '1.125rem'
  4xl: '1.625rem'
spacing:
  xs: '0.25rem'
  sm: '0.5rem'
  md: '0.625rem'
  lg: '0.75rem'
  xl: '1rem'
components:
  button-default:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-foreground}'
    rounded: '{rounded.lg}'
    height: '2rem'
    padding: '0 0.625rem'
    typography: '{typography.body}'
  button-outline:
    backgroundColor: '{colors.background}'
    textColor: '{colors.foreground}'
    rounded: '{rounded.lg}'
    height: '2rem'
    padding: '0 0.625rem'
  button-outline-hover:
    backgroundColor: '{colors.muted}'
    textColor: '{colors.foreground}'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.foreground}'
    rounded: '{rounded.lg}'
    height: '2rem'
    padding: '0 0.625rem'
  button-destructive:
    backgroundColor: 'color-mix(in oklab, oklch(0.577 0.245 27.325) 10%, transparent)'
    textColor: '{colors.destructive}'
    rounded: '{rounded.lg}'
    height: '2rem'
    padding: '0 0.625rem'
  badge-status:
    backgroundColor: 'transparent'
    textColor: '{colors.muted-foreground}'
    rounded: '{rounded.4xl}'
    height: '1.25rem'
    padding: '0.125rem 0.375rem'
    typography: '{typography.label}'
  card:
    backgroundColor: '{colors.card}'
    textColor: '{colors.card-foreground}'
    rounded: '{rounded.xl}'
    padding: '1rem'
  input:
    backgroundColor: 'transparent'
    textColor: '{colors.foreground}'
    rounded: '{rounded.lg}'
    height: '2rem'
    padding: '0.25rem 0.625rem'
---

# Design System: FireGuard

## Overview

**Creative North Star: "The Control Surface"**

FireGuard is an operator's console. It is dense, unambiguous, and built for
someone who already knows what they are doing and needs zero friction between
intent and action. Nothing on screen is there to impress: every pixel is either
a value to read, a control to press, or the whitespace that keeps the two apart.
The interface is the flat panel a professional works against for eight hours,
not a page they visit.

The system is **warm-neutral with one ember accent**. Surfaces, text, borders
and controls are a low-chroma neutral scale — warm paper and warm ink in light
mode, the Bloc 3 deck's cool near-black and warm off-white in dark mode. Colour
is a scarce, load-bearing signal spent in exactly two places: **Ember**
(orange) on the single committed action and on keyboard focus, and the status
hues on the glyph of a status indicator. That discipline is what keeps a dense
table readable: when nothing else is coloured, an orange button and a red
chevron at 12px are impossible to miss.

The status hues are members of the same family as the chart series (the deck's
rule: "statuses are members of the series palette, not neighbouring tints"), so
a chart and a badge on the same screen read as one system. `shared/chart`
carries the six-slot ordinal palette; a series is never told apart by hue
alone, because the legend and the tooltip always name it.

Density is the second half of the identity. The largest type in the entire
application is 24px, and 86% of sized text is 14px or 12px. Controls are 32px
tall. This is deliberate compression: more of the operator's actual work fits in
one viewport, and the interface stops competing with the data it carries.

**Key Characteristics:**

- Warm-neutral palette; Ember on the committed action and focus, status hues
  on glyphs and chart series, nowhere else
- Compressed scale — a hard 24px type ceiling, 32px controls
- Flat in-page surfaces; a hairline ring instead of shadows or borders
- Compact and mechanical controls with a 1px press displacement
- Motion belongs to primitives, never to page composition
- Full dark parity via `html[data-theme="dark"]`

## Colors

The "Ember" palette, derived from the Bloc 3 presentation deck: a warm-neutral
scale carrying the entire interface, one orange accent, and four status hues
that are permitted on a status glyph and on chart series. Dark mode is the deck
verbatim; light mode is the deck inverted onto warm paper. Every value is
`oklch`, and every token has a light and a dark value in `src/styles.css`.

### Primary — Ember

- **Ember** (`oklch(0.646 0.194 41.1)` light, `oklch(0.705 0.187 47.6)` dark —
  orange-600 / the deck's orange-500): fills the primary button, the checked
  checkbox and radio, the switch, the progress bar, the selected calendar day,
  and draws the focus ring. Its foreground is **Ink in both modes**
  (5.3:1 light, 6.6:1 dark) — white on orange fails AA, so "primary" never
  inverts the way the old neutral primary did.
- **Ember as text** is never legal at body sizes: 3.4:1 on Paper is under the
  4.5:1 floor, and WCAG's large-text relief (≥ 24px, or ≥ 18.7px bold) only
  covers display headings, which never take Ember anyway. Links stay
  `text-foreground underline`. The `link` variant of `hlmBtn` and `hlmBadge`
  ships `text-primary` from spartan, so every call site adds
  `class="text-foreground"` (`src/app/shared/ui` is not edited). A word that
  must be orange uses Ember-700 (`oklch(0.553 0.174 38.4)`, 5.0:1).

### Neutral

| Name         | Light                   | Dark                                                                    | Role                                                                                                                          |
| ------------ | ----------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Paper**    | `oklch(0.985 0.003 80)` | `oklch(0.155 0.004 286)`                                                | the page ground — warm off-white, never pure white; the deck's near-black in dark                                             |
| **Card**     | `oklch(0.995 0.002 80)` | `oklch(0.195 0.005 286)`                                                | card and popover ground, one step off Paper; cards still separate by ring, not by tint                                        |
| **Ink**      | `oklch(0.18 0.006 60)`  | `oklch(0.967 0.004 91)`                                                 | body and heading text at full strength — warm in both modes                                                                   |
| **Wash**     | `oklch(0.955 0.005 80)` | `oklch(0.225 0.007 286)` (muted) / `oklch(0.258 0.009 286)` (secondary) | the single step of tonal separation: hover grounds, zebra, inert panels, secondary buttons                                    |
| **Tint**     | `oklch(0.955 0.01 65)`  | `oklch(0.245 0.01 60)`                                                  | `--accent`, the hover surface — a warmer Wash, deliberately **not** orange, so hover never competes with the committed action |
| **Slate**    | `oklch(0.5 0.012 70)`   | `oklch(0.767 0.012 90)`                                                 | muted foreground: labels, metadata, timestamps, badge text (5.8:1 / 8.9:1 on Paper)                                           |
| **Hairline** | `oklch(0.91 0.006 80)`  | `oklch(0.258 0.009 286)`                                                | borders and input strokes — opaque in dark now (the deck's `line`), no longer translucent white                               |

The sidebar mirrors Paper/Ink with its own Tint (`--sidebar-accent`) for hover
and the active row; its `--sidebar-primary` is Ember and colours only the
account-menu avatar fallback.

### Tertiary — the status hues

Four hues that exist to be read at 12px on an otherwise colourless screen, and
that double as chart series. Light mode sits on the Tailwind 600 rung so a
glyph clears the 3:1 non-text floor on Paper; dark mode is the deck's 400 rung.

| Token           | Light                      | Dark                       | Light / dark contrast on Paper |
| --------------- | -------------------------- | -------------------------- | ------------------------------ |
| `--success`     | `oklch(0.596 0.145 163.2)` | `oklch(0.773 0.153 163.2)` | 3.5 / 9.9                      |
| `--warning`     | `oklch(0.666 0.179 58.3)`  | `oklch(0.837 0.164 84.4)`  | 3.1 / 11.1                     |
| `--info`        | `oklch(0.609 0.126 221.7)` | `oklch(0.797 0.134 211.5)` | 3.5 / 10.6                     |
| `--destructive` | `oklch(0.577 0.245 27.3)`  | `oklch(0.711 0.166 22.2)`  | 4.6 / 6.6                      |
| neutral glyph   | Slate                      | Slate                      | —                              |

They are exposed as `text-success`, `text-warning`, `text-info`,
`text-destructive` and flip with the appearance — no `dark:` twin at a call
site, ever. Only `text-destructive` clears 4.5:1 in light mode, so it is the
only status token allowed on a word; the other three colour a glyph and nothing
else.

### Data Visualization

`shared/chart` carries the six-slot ordinal palette, resolved from
`core/theme`'s `resolvedTheme` rather than read off the DOM — Chart.js draws to
a canvas, and a canvas 2D context never resolves `var()`. The `--chart-1..6`
custom properties in `src/styles.css` document the same values.

Light, in series order: Ember, amber, emerald, cyan, violet
(`oklch(0.58 0.2 293)`), rose (`oklch(0.6 0.21 17)`). Dark is the deck's
`--c1..c6` verbatim. Slot 1 is the brand orange on purpose. Chart chrome stays
neutral — gridlines at 60% Hairline (80% in dark), ticks in Slate, and a
tooltip on the card ground rather than Chart.js' default black box.

Light slots under the 3:1 relief floor against Card (amber, cyan) are legal only
because `line-chart` always renders a text legend with a swatch and a value
tooltip, so a series is never told apart by hue alone.

### Named Rules

**The Glyph Rule.** Chroma appears on a status icon and nowhere else. The badge
around it stays `outline` — transparent ground, hairline border, muted text —
and only the glyph carries tone. Filling the badge instead turns a dense table
into a row of coloured pills and destroys the one signal that should stand out.

**The Two Ends Rule.** In a workflow enumeration, only the terminal states carry
colour: success for the positive end, danger for the destructive one. Every
intermediate step is neutral. Colour therefore reads as "this is finished",
not as a heat map of progress.

**The Chart-Only Chroma Rule.** The chart palette is the one place chroma is
spent on a filled shape, and it never leaves `shared/chart`. Do not sample a
chart slot for a badge, a button, a tag or a surface: outside a plot those six
hues have no legend to disambiguate them, which is the entire basis on which
they are allowed.

**The Tint, Never Fill Rule.** Destructive actions are a 10% destructive ground
with destructive text — never a solid red fill. A filled red button reads as the
page's primary action, which a delete never is.

## Typography

**Body Font:** Geist Variable (with `ui-sans-serif`, `system-ui`)
**Label/Mono Font:** Geist Mono Variable (with `ui-monospace`, `SFMono-Regular`)

Both are self-hosted through `@fontsource-variable` rather than fetched from a
CDN — the field scene runs offline, so the type has to be in the service-worker
cache like everything else. There is no separate display face; the system runs
one grotesque at four sizes, and hierarchy comes from weight and colour rather
than from contrast between families.

**Character:** Neutral, engineered, and quietly modern. Geist has enough
character in its digits and terminals to feel designed rather than defaulted,
without the personality of a typeface that wants to be noticed. Geist Mono
carries identifiers — revision hashes, `FG-{number}` codes, quantities — where
character alignment matters more than reading rhythm.

### Hierarchy

- **Headline** (600, 1.5rem/2rem, `-0.025em`): the `<h1>` of every page that
  sits _outside_ the dashboard shell — auth, onboarding, invitation accept,
  the error and maintenance pages — through `app-page-heading`. Always paired
  with `tracking-tight`; at 24px the default tracking reads loose. Inside the
  shell it survives in one other role only: the figure of a stat tile
  (`text-2xl font-semibold tabular-nums`), where the number is the content.
- **Subhead** (600, 1.125rem/1.75rem): the dashboard shell's own `<h1>` — the
  activated route's title in `DashboardPageHeader`. It reads one step below
  the out-of-shell headline on purpose: the shell already frames the page with
  a breadcrumb and a sidebar, so the title does not have to establish the page
  by itself. The wordmark on the two showcase panels takes the same size with
  `tracking-tight` added.
- **Title** (500, 1rem/1.5rem): section and card headings. The step down from
  headline is deliberately large — there is no 20px rung in normal use. The
  weight is `hlmCardTitle`'s own, and section titles are `hlmCardTitle`, so the
  one place this is defined is the primitive rather than a call site.
- **Body** (400–500, 0.875rem/1.25rem): the working size. Table cells, form
  values, descriptions, and nearly everything the operator reads.
- **Label** (500, 0.75rem/1rem): metadata, timestamps, status badge text,
  helper copy, and column headers. Sentence case, never uppercase.

**The one step below Label** is `text-[10px]`, and it is not running text: it
is a mark fitted to a container it must not overflow — the initials inside a
small `hlm-avatar` fallback, and the count overlay on an icon. Nothing else
goes under 12px, and nothing goes under 10px. This is written down because the
feature tree already used it in a dozen places while the scale denied it
existed; a rule no code follows is not a rule.

### Named Rules

**The 24px Ceiling.** Nothing in the operator's console renders larger than
1.5rem. There is no display size and no hero type. A screen that needs more
presence earns it through spacing and position, not through scale.

The ceiling has exactly one exception, and it is not a console screen: the
split-layout showcase panel — the marketing half of the unauthenticated auth
pages — sets its promise at `text-3xl xl:text-4xl` (30px stepping to 36px).
That surface is persuading a visitor, not serving an operator, and it is
outside the shell. The exception does not travel: no authenticated page, and
no component reachable from one, may cite it.

**The One Title Rule.** A page carries exactly one headline. Sections step
straight down to title (1rem); a second 24px heading on the same screen means
the page is really two pages.

**The Sentence Case Rule.** Labels are sentence case. Uppercase is not part of
this system — it survives twice in the entire feature tree, both on the
channel-info sheet's `<h4>` group labels, and should not spread.

## Layout

The shell is a fixed-height application frame, not a scrolling document. The
root is `h-svh overflow-hidden`, and each column scrolls independently — the
navigation rail never scrolls away from the content it addresses, and the
operator never loses their place in a long intervention by scrolling the page
as a whole.

Navigation is a collapsible inset sidebar that reduces to an icon rail,
transitioning width over 200ms `ease-linear`. A skip link precedes it in the
tab order, because reaching content from the keyboard otherwise means passing
every navigation row on every navigation.

Spacing is Tailwind's 0.25rem base step. The recurring rhythm is tight: cards
pad at 1rem (0.75rem at `sm` size), controls sit on a 0.5rem gap, and inline
icon-to-label spacing is 0.375rem. Content is not centred inside a fixed
container — panels fill their column and the column widths carry the
proportion.

The field scene is the constraint that shapes the responsive behaviour: a phone,
one hand, often offline. Primary actions stay within thumb reach at small
widths, and the detail workspace moves its forward action out of the content
column and into a dedicated action box from `lg` up, where the pointer already
is.

### Named Rules

**The Independent Columns Rule.** The page never scrolls. Each column owns its
own overflow, so the shell, the content and any side panel keep their positions
relative to each other no matter how long the content runs.

## Elevation & Depth

The system is **flat in-page**. Depth is carried by two devices and neither is a
shadow: a hairline ring, and a single step of tonal separation.

A card is `ring-1` at 10% foreground opacity — a ring rather than a border, so
it sits outside the box model and never shifts layout or doubles up against an
adjacent divider. Surfaces separate by tone using exactly one step: Paper for
the page and cards, Wash for muted and secondary grounds, and a distinct
sidebar ground for the navigation column. There is no second or third elevation
tier, because a flat panel with four tonal steps stops reading as flat.

Shadow is reserved for things that genuinely float above the page — dialogs,
popovers, sheets, toasts, and the revealed skip link. Those come from the
overlay primitives; feature templates do not add them.

### Named Rules

**The Hairline Rule.** In-page depth is a 1px ring at 10% foreground. If a
surface needs to separate further, change its tone — do not add a shadow.

**The Overlay-Only Shadow Rule.** A shadow means "this is floating above the
page and will be dismissed". **Zero** `shadow-*` utilities remain across the
feature, layout, core and shared-behaviour trees — every shadow in the running
application comes from an overlay primitive. The rule is no longer a budget to
hold under; it is an invariant, and the next `shadow-*` in a feature template
is the one that breaks it.

## Shapes

The corner language is soft but tight, anchored on a 0.625rem (10px) base radius
that scales into a six-step ramp — 6, 8, 10, 14, 18 and 26px. Controls take the
base radius (10px), cards step up to 14px, and small controls step _down_ so the
corner never overwhelms a short edge.

That step-down is written as `rounded-[min(var(--radius-md),10px)]` on the 24px
rung and `min(var(--radius-md),12px)` on the 28px one, but at this base radius
`--radius-md` is 8px, so **both resolve to 8px**. The two caps are headroom for
a larger base radius, not two distinct corners; do not read them as a 10/12px
pair, and do not add a third cap expecting a third corner.

Status badges take a 26px radius against a 20px height, which resolves to a
true pill. This is the one fully-round shape in the system, and it marks
"this is a state, not an action".

Borders are 1px and hairline-coloured. The system prefers a ring on cards and a
border on inputs and dividers.

### Named Rules

**The Dashed-Means-Absent Rule.** A dashed border marks a container with nothing
in it yet — an empty collection, an unfilled slot, a drop target. Solid means
real content. A dashed border never decorates a populated surface, and its
destructive variant (40% opacity) marks a slot whose content failed rather than
one that was never filled.

## Components

### Buttons

- **Shape:** Softly rounded (10px), clamping to 8px at the extra-small and
  small sizes so short edges stay proportionate. See Shapes for why the two
  `min()` caps both land on 8px.
- **Size:** Compact by default — 32px tall with 10px horizontal padding, 14px
  medium-weight text. A 24px and a 28px rung exist for toolbars and inline
  actions; 36px is the largest.
- **Default:** Ember ground with Ink text. This is the single committed action;
  a screen with two of them has not decided what it wants the operator to do.
- **Outline:** Page ground with a hairline border — the workhorse secondary.
  Hovers to Wash.
- **Ghost:** No ground at rest, Wash on hover. For row menus and dense toolbars
  where a border per action would build a grid of boxes. 123 call sites, second
  only to outline.
- **Destructive:** A 10% destructive ground with destructive text (20% in dark).
  Tinted, never filled.
- **Secondary and Link:** Present in the primitive and used sparingly — 17 and 3
  call sites. Secondary is a filled Wash ground for a paired action that must
  not read as either the committed action or a bordered box; link is a bare
  underlined-on-hover text button. Neither is a general-purpose alternative to
  outline, which carries 247 of the tree's call sites and is the actual
  workhorse.
- **Expanded:** A trigger holding an open menu or popover keeps its hover ground
  (`aria-expanded:bg-muted`), so the anchor stays visibly bound to the surface
  it opened.
- **Invalid:** A control the brain marks `data-matches-spartan-invalid` takes a
  destructive border and a 3px destructive ring, matching the input's own
  invalid treatment.
- **Press:** A 1px downward displacement on `:active`, suppressed on menu
  triggers so a popover anchor does not shift under an opening panel. This is
  the system's one piece of physical feedback and it is worth preserving.
- **Focus:** A 3px ring at 50% Ember plus a solid Ember border. The ring
  is thick on purpose: at this control size a 1px outline is invisible against
  a dense table.

### Cards / Containers

- **Corner Style:** 14px, one step above controls.
- **Background:** Card ground (identical to the page in light mode).
- **Shadow Strategy:** None. See Elevation & Depth.
- **Border:** A `ring-1` at 10% foreground, not a border.
- **Internal Padding:** 1rem, dropping to 0.75rem at `sm` size, exposed as
  `--card-spacing` so header, content and footer share one rhythm.

### Inputs / Fields

- **Style:** Transparent ground with a hairline border, 10px radius, 32px tall.
  In dark mode the ground lifts to 30% input tone so the field reads as a well
  rather than as a hole.
- **Sizing:** 16px text below `md`, 14px above. The larger mobile size is not a
  style choice — it is what stops iOS Safari zooming the viewport on focus.
- **Focus:** Border shifts to Ember, plus a 3px ring at 50% Ember.
- **Error:** Border and ring go destructive, driven by the brain's
  `data-matches-spartan-invalid` attribute rather than a class the template
  sets. (Badges still gate on `aria-invalid`; controls the brain owns do not.)
- **Disabled:** 50% opacity with a filled ground and `not-allowed` cursor.

### Navigation

- **Style:** An inset sidebar on its own ground, collapsible to an icon rail.
  Rows are ghost-styled — no border, no ground at rest — so the column reads as
  a list rather than a stack of buttons.
- **States:** Wash ground on hover and on the active row; the active row is
  additionally marked by its own data state rather than by colour alone.
- **Mobile:** The sidebar becomes an off-canvas sheet at small widths.
- **Order:** The skip link precedes the sidebar in the tab order.

### Status Badge (signature component)

The component the whole colour system exists to serve. An outline badge —
transparent ground, hairline border, 26px radius, 20px tall — containing a 12px
icon and a 12px label in Slate. The icon carries the severity colour; nothing
else in the badge changes between states.

Two things make it work. First, the label is always present, so status never
depends on colour or shape alone and the icon is `aria-hidden` — the text is the
accessible name. Second, icons within one enumeration share a glyph family: the
priority scale runs chevron-down → minus → chevron-up → double-chevron-up, one
stroke weight and one silhouette, so the _shape_ encodes rank even in greyscale.

A bare variant drops the badge shell and renders icon + label inline, for use
inside select options and menus where a pill inside a row would be noise.

### Empty States

Composed from the `empty` primitives: an optional icon in a media slot, a title,
an optional description, and a content slot for the recovery action. Error
states are the same composition with a destructive tint and `role="alert"`.
Neither is bespoke markup — they exist to make three inputs stand in for a
six-element composition, and to guarantee a failure announces itself.

### Charts

The one surface that draws with chroma, and the only one whose colour is
resolved in TypeScript rather than declared in a class. `shared/chart`'s
`line-chart` is a typed wrapper over Chart.js: no caller touches `ChartData`
or `ChartOptions`, and no caller names a colour.

- **Palette:** the six ordinal slots from Colors, picked by `resolvedTheme`.
  A live appearance switch recolours an already-drawn chart, because both the
  dataset palette and the grid chrome are computed signals over that signal —
  not values read off the DOM, which a canvas cannot do anyway.
- **Chrome:** gridlines on the horizontal axis only, at 60% Hairline (80% in
  dark). Ticks in Slate. The tooltip is a themed rounded card on the card
  ground, replacing Chart.js' default black box.
- **Points:** hidden at rest, revealed on hover with an enlarged hit radius —
  the line is the value, the point is the interaction.
- **Legend:** compact centred pills with small circular swatches, below the
  plot. It is not optional decoration: it is what makes the three
  low-relief light slots legal.
- **States:** a height-matched `hlm-skeleton` holds the layout on the server
  and while loading — the canvas mounts only once `isPlatformBrowser` is true,
  so hydration causes no shift. Empty is `<app-empty-state>` with
  `lucideChartLine`, at the same height.
- **Accessibility:** the plot wrapper is `role="img"` with a summarizing
  `aria-label`; the canvas itself is `aria-hidden`.

### Global Search Palette

The shell's one command surface. A ghost `icon-sm` trigger in the header,
announcing its own shortcut through `aria-keyshortcuts="Control+K Meta+K"`,
opens an `hlm-command-dialog` at `sm:max-w-xl` with the list bounded to
`max-h-[70vh]`.

Results group by entity type — equipments, facilities, interventions,
inspections, non-conformities — each group labelled with its own icon. A hit
is a two-line button: title, then an optional muted 12px subtitle, with an
optional 12px qualifier pushed to the inline end.

Every state is a sentence in the list rather than a chrome change: below the
two-character threshold it says so, loading is a 16px spinner beside
"Searching…", a failed query says "Type again to retry" instead of offering a
button the palette has no room for, and no results says so plainly. Result
counts are announced through a visually hidden `role="status"` live region,
because the list updating is silent to a screen reader otherwise.

## Page Grammar

How a page is assembled. The visual system above says what things look like;
this section says which things a page is made of, and it is deliberately
narrow: three wrappers, one heading rank, one subtitle form, one state
vocabulary.

### The shell contract (DashboardLayout pages)

**The shell owns the title, and it is a band, not a crumb.** This reverses the
earlier contract, under which the breadcrumb's current crumb _was_ the `<h1>`.
It reads better as two bands: the 48px header is sized to the 32px control
rhythm and holds navigation, the breadcrumb, search and header actions; a
second band beneath it — `DashboardPageHeader` — carries the activated route's
title as the document's one `<h1>` (Subhead, 18px, truncating) alongside the
page's own actions. The crumb is no longer a heading, because it would
otherwise repeat the same words in the same viewport, and a page still never
renders its own title band.

Inside the shell there is therefore **exactly one `<h1>` in the whole
application**, and no feature template contains it. Page-level actions are
still contributed through `<ng-template #pageActions>` + `registerPageActions()`
— they now land in that title band rather than in the header row.

Split/Focused pages (auth, onboarding, 404, maintenance, invitation accept)
sit outside the shell and own their in-page `<h1>` through the shared
`app-page-heading` primitive, at the full 24px Headline.

The routed content column carries no `container mx-auto`: a page's own density
utilities (`p-4 md:p-6`) own its horizontal rhythm, and a page that wants the
shell's full width takes it.

### Three root wrappers — chosen by page kind, never freely

- **Collection page** (list + toolbar + pager):
  `flex min-h-0 w-full flex-1 flex-col gap-4 p-4 md:p-6`
- **Record page** (create/detail, scrolling content):
  `flex w-full flex-col gap-4 p-4 md:p-6`
- **Settings/account page** (stacked sections):
  `flex h-full flex-col gap-6 p-4 md:p-6`

Every page root carries a stable `id` — e2e selectors rely on it.

### Headings and lead

- The only subtitle form is the lead paragraph:
  `<p class="shrink-0 text-sm text-muted-foreground">`, directly under the
  header.
- Sections have exactly one `<h2>` style — `hlmCardTitle`, which is
  `text-base font-medium` — inside an `hlmCardHeader`, with the caption as
  `hlmCardDescription` and any action in `hlmCardAction`. The muted variant
  `text-sm font-medium text-muted-foreground` is reserved for sub-groups
  inside a section. `text-lg` is not in the scale and appears nowhere.
- **Heading rank follows nesting, not size.** A section that opens a content
  column is `<h2>`; a card nested inside a section that already has its `<h2>`
  is `<h3>`. Both render identically — the rank is for the document outline,
  which is why skipping one is a defect even when nothing looks wrong.

### The Working Surface Rule (when a card is right)

**The card is the section.** An ordinary page section and a self-contained
working surface — a form, the calendar's day panel, a stat tile — are the same
chrome: `hlmCard`. One card family across the application, rather than a
borderless idiom and a carded one whose boundary nobody could state twice the
same way.

This reverses the earlier rule, which held that a card never wraps an ordinary
section and that sections separate by rhythm alone. That rule lost on the
evidence: the primitive it named (`app-page-section`) had drifted to **zero**
consumers while sixteen files had already moved to `hlmCard`, and the seven
panels still hand-rolling a header had each rebuilt the card's own anatomy in
slightly different Tailwind. `organization/FEATURE.md` had already recorded the
reversal for the Dashboard; it is now the whole application, and
`shared/page-section` is deleted rather than left as a second, unused answer.

What survives from the old rule: **do not let every surface become an identical
box.** Hierarchy still comes from rhythm — a card's own header, spacing and
divider lists do that work inside the card, and a page still separates its
regions with space rather than nesting cards in cards.

### Back-links

Detail pages rely on the breadcrumb alone; nothing places a back-link in the
content column. (Create pages, which used to carry one in `#pageActions`, no
longer exist — creation is a sheet on the list.)

### State vocabulary

- **Empty** → `<app-empty-state>` only. No hand-composed `hlm-empty` in feature
  templates.
- **Blocking error** → `<app-error-state>` (it guarantees `role="alert"`) with
  a retry action.
- **Non-blocking action error** → inline `hlm-alert variant="destructive"`.
- **Loading** → `hlm-skeleton` blocks inside a container with `role="status"`
  and an i18n `aria-label` — never `aria-hidden`. Spinners belong to pending
  buttons only.
- **Detail-page gating** — one model: skeleton while `loading && !record`,
  then `<app-error-state>` + retry when the load failed. A gate that shows a
  skeleton for any absent record turns a failed load into an eternal skeleton.

### Sanctioned exception

Conversation pages (collaboration) are full-bleed: no root wrapper, their own
48px header, no `#pageActions`. The exception is recorded in
`collaboration/FEATURE.md`; it does not spread.

## Action Surfaces

Which surface an action gets is a decision rule, not a taste. The rule is
contextual — the deciding question is what the operator must keep, leave, or
confirm.

1. **Dedicated route page** — a multi-step workflow only (the onboarding
   wizard). Creating a record is **not** a page any more: facility, equipment
   and inspection moved to sheets on their lists on 2026-09-02, so every
   resource is created the same way.
2. **Sheet (right drawer)** — creating a record the operator will then open,
   or acting **without leaving a working context** (a filtered list, a
   workspace): facility / equipment / inspection / intervention create, work
   item, request-changes, role permissions, participants. The list page owns
   the sheet's state and navigates to the created record on success; a
   `?create=1` query opens the sheet on arrival (with `?parent=` /
   `?facility=` scoping it) and the retired `/create` segments redirect
   there, so deep links survive. **Three named widths, and
   the content picks one**: `sm:w-[480px]` for a short form or a list,
   `sm:w-[540px]` for a longer form or a detail read-out, and `sm:w-[560px]`
   for the message thread. A sheet never holds a table: a collection of
   entities that have no detail page (intervention recurrences) lives in a
   tab of its parent shell, full-width, and its create/edit form takes a
   sheet. The form
   owns its footer, Cancel then primary. Below `sm` a sheet presents as a
   **bottom drawer** (`side="bottom"`, driven by a breakpoint signal;
   `max-h-[85svh]` with internal scroll) so the footer lands in the thumb
   zone. No drag-to-dismiss, no snap points — the primitives do not provide
   them and we do not hand-roll them.
3. **Dialog** — a light, focal action (≤ ~5 fields, no navigation after):
   invitation, role create, channel create/edit, pickers. Dialogs and
   alert-dialogs stay centered at every width.
4. **In place** — record editing happens on the detail page through
   `@shared/inplace-field` ("the record is the edit surface"). No edit route,
   no edit modal for a record.
5. **Alert-dialog** — every destructive or irreversible action confirms.
   Type-to-confirm is reserved for cascade deletions. Each confirm is a
   **feature-local component under `ui/dialogs/`** (the
   `organization-delete-dialog` model) — never inline markup in a page
   template, and never a generic shared confirm wrapper: per-case wording and
   composition are the point.

Cross-cutting rules:

- **A dialog bounds its own height.** `hlm-dialog-content` and
  `hlm-alert-dialog-content` ship with neither a `max-h` nor an `overflow`, and
  the brain centres them with a blocking scroll strategy: an unbounded dialog
  taller than the viewport is clipped at both ends with the page frozen behind
  it, so its primary action becomes unreachable rather than merely
  out of sight. Every call site therefore carries
  `max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain` on the
  content element — `svh` because a mobile URL bar moves `vh`,
  `overscroll-contain` so the scroll does not leak to the frozen page behind.
  The bound lives at the call site rather than in the vendored primitive, which
  makes it a rule the next contributor has to remember; `npm run guard:dialogs`
  is what remembers instead, and CI runs it.
  Bounding makes the action **reachable by scrolling**, not visible — a footer
  that must stay on screen is a sticky footer, which is the form's business,
  not the dialog's. And a surface whose height is driven by data (a permission
  matrix, a growing item list) is not a dialog at all: it is a sheet or a page.
- **Closed gates speak.** A control disabled for a reason the operator could
  act on carries that reason twice: as visible text beside it, and as
  `aria-describedby` for assistive tech. `[appGateReason]`
  (`@shared/gate-reason`) owns the linking — it generates the id, appends to
  any `aria-describedby` the host already has rather than replacing it, and
  exposes `reasonId` for the call site to render the text where its own layout
  allows. A native `title` is not a reason: invisible on touch, delayed on
  pointer, unstylable, and outside the i18n pipeline. A control disabled only
  because a request is in flight is exempt — `aria-busy` already says that.
- An overlay that carries a form delegates to a `*-form` component; only a
  page (or a documented container component) hosts an overlay and talks to a
  store.
- `disableClose` on every overlay that contains a form.
- **Unsaved work confirms before it is lost**: the shared `CanDeactivate`
  guard covers create pages and the wizard; a dirty overlay confirms before
  closing. One shared abandon-confirmation dialog serves both — a distinct,
  single-purpose primitive, exempt from rule 5's ban: that ban covers generic
  wrappers for destructive-action confirms, whose per-case wording is the
  point, not this one fixed "discard your edits?" question.
- Settings forms save through an explicit dirty-gated "Save changes"; auto-save
  is the documented exception for single-toggle preference lists.
- Labels: one `@@common.cancel`; primary labels are sentence-case verb-object
  ("Create equipment"); pending labels are the same verb in progressive form
  ("Creating…"); footers run Cancel → primary.
- Pending state is `[disabled]="pending()"` — no hand-rolled
  `aria-disabled`/`pointer-events-none` stacks.

## Collections

- **The Server Rule.** Any collection that is not bounded by nature paginates,
  sorts and filters **through the API**. In-memory filtering is legitimate
  only for bounded, documented collections (roles, member directory, facility
  map, assets pane preview, the calendar's date window, offline work items) —
  each such drain is recorded in its owning `FEATURE.md`.
- **Collection page skeleton**: `collection-toolbar` (search box + filter
  toggle) → `collection-filter-bar` (editable chips) → table/dataview →
  `collection-pagination` (30/60/100). The interventions list is the reference
  implementation.
- **Tables**: `hlmTable` inside `hlmTableContainer`; sortable heads follow the
  `intervention-table` sortable-head pattern (the head emits `sortChanged`,
  the server sorts); row actions in an `hlmDropdownMenu`; bulk checkboxes only
  where bulk actions exist. The spartan `data-table` recipe
  (`@tanstack/angular-table`) is **excluded**: its row models are client-side,
  which the Server Rule forbids.
- **URL and persistence**: search and filters sync to the URL (questions asked
  now); sort and page size persist in a cookie (preferences).
- **Detail sub-collections** show a compact pager or "Show more" as soon as
  `totalItems > itemsPerPage` — a silently truncated list reads as complete
  and is therefore wrong.

## Do's and Don'ts

### Do:

- **Do** spend Ember only on the committed action and on focus, and status hue
  only on a status glyph. If a new surface needs to distinguish states, reach
  for icon, weight, position and tone first.
- **Do** pair every severity colour with a label and an icon, and give the icon
  `aria-hidden` so the label is the accessible name.
- **Do** let the shell own the page title. Inside `DashboardLayout` no feature
  template carries an `<h1>`; outside it, `app-page-heading` sets the one
  exact class string (`text-2xl font-semibold tracking-tight`), and reusing it
  verbatim is how the ceiling stays intact.
- **Do** draw a chart from `shared/chart`, which resolves its palette from the
  theme signal. A colour written by hand into a chart config will not follow
  an appearance switch, because a canvas never resolves `var()`.
- **Do** separate in-page surfaces with `ring-1` at 10% foreground, or with one
  tonal step to Wash.
- **Do** use the 32px control height as the default rhythm; step to 24px or
  28px inside dense toolbars rather than shrinking padding on a 32px control.
- **Do** give every interactive element a visible 3px focus ring; on bare inline
  links a 2px ring is the established exception.
- **Do** mark genuinely empty containers with a dashed border.
- **Do** verify every new surface in both themes — dark is not a filter: the
  neutrals go cool, the ink stays warm, and Ember lightens one rung.

### Don't:

- **Don't** spend Ember on anything that is not the committed action or the
  focus ring — not a hover ground, not a heading, not a link, not a badge. One
  orange thing per screen is the whole point of having one.
- **Don't** write a status colour as a raw Tailwind pair. `text-success`,
  `text-warning`, `text-info`, `text-destructive` flip with the appearance;
  `text-amber-500 dark:text-amber-400` does not belong in this codebase.
- **Don't** borrow a chart slot for a badge, a tag, a button or a surface.
  Outside a plot those six hues have no legend, which is the only reason they
  are allowed at all.
- **Don't** fill a status badge with its severity colour, and don't colour the
  label. The ground stays transparent and the text stays muted.
- **Don't** colour intermediate workflow states. Only the two terminal ends
  carry tone.
- **Don't** render a destructive action as a solid red button. Tint the ground
  and colour the text.
- **Don't** introduce type above 1.5rem on any surface an authenticated
  operator can reach, and never a display typeface. There is one family at
  five sizes; the split-layout showcase's 30/36px promise is the single
  exception, and it lives outside the shell.
- **Don't** set uppercase with widened tracking as a section eyebrow.
- **Don't** add a shadow to an in-page surface. Shadow means "floating and
  dismissable", and the feature tree currently holds zero `shadow-*` utilities
  — the next one is a regression, not a rounding error.
- **Don't** nest a card inside a card, or reach for a second card family. One
  section is one `hlmCard`; inside it, hierarchy comes from the header, the
  spacing and divider lists — from rhythm rather than from more boxes.
- **Don't** add page-level motion. Transitions belong to the primitives; a
  feature template's motion vocabulary is `transition-colors` and the button's
  1px press.
- **Don't** let the page scroll as a whole. Columns own their own overflow.
