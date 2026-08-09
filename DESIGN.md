---
name: FireGuard
description: An achromatic, instrument-dense control surface for planning and publishing field interventions.
colors:
  background: 'oklch(1 0 0)'
  foreground: 'oklch(0.145 0 0)'
  card: 'oklch(1 0 0)'
  card-foreground: 'oklch(0.145 0 0)'
  popover: 'oklch(1 0 0)'
  primary: 'oklch(0.205 0 0)'
  primary-foreground: 'oklch(0.985 0 0)'
  secondary: 'oklch(0.97 0 0)'
  secondary-foreground: 'oklch(0.205 0 0)'
  muted: 'oklch(0.97 0 0)'
  muted-foreground: 'oklch(0.556 0 0)'
  accent: 'oklch(0.97 0 0)'
  destructive: 'oklch(0.577 0.245 27.325)'
  border: 'oklch(0.922 0 0)'
  input: 'oklch(0.922 0 0)'
  ring: 'oklch(0.708 0 0)'
  sidebar: 'oklch(0.985 0 0)'
  sidebar-border: 'oklch(0.922 0 0)'
  glyph-neutral: 'oklch(55.6% 0 none)'
  glyph-info: 'oklch(62.3% 0.214 259.815)'
  glyph-success: 'oklch(72.3% 0.219 149.579)'
  glyph-warning: 'oklch(76.9% 0.188 70.08)'
  glyph-danger: 'oklch(63.7% 0.237 25.331)'
  background-dark: 'oklch(0.145 0 0)'
  foreground-dark: 'oklch(0.985 0 0)'
  card-dark: 'oklch(0.205 0 0)'
  primary-dark: 'oklch(0.922 0 0)'
  primary-foreground-dark: 'oklch(0.205 0 0)'
  muted-dark: 'oklch(0.269 0 0)'
  muted-foreground-dark: 'oklch(0.708 0 0)'
  destructive-dark: 'oklch(0.704 0.191 22.216)'
  border-dark: 'oklch(1 0 0 / 10%)'
  ring-dark: 'oklch(0.556 0 0)'
typography:
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

The system is **achromatic by decision**. Surfaces, text, borders and controls
are pure zero-chroma neutral — genuinely neither warm nor cool. Colour is not a
decorative resource here; it is a scarce, load-bearing signal, and it is spent
in exactly one place: the glyph of a status indicator. That single constraint is
what makes a dense table readable. When nothing else is coloured, a red chevron
at 12px is impossible to miss.

Density is the second half of the identity. The largest type in the entire
application is 24px, and 86% of sized text is 14px or 12px. Controls are 32px
tall. This is deliberate compression: more of the operator's actual work fits in
one viewport, and the interface stops competing with the data it carries.

**Key Characteristics:**

- Achromatic neutral palette; chroma confined to status glyphs
- Compressed scale — a hard 24px type ceiling, 32px controls
- Flat in-page surfaces; a hairline ring instead of shadows or borders
- Compact and mechanical controls with a 1px press displacement
- Motion belongs to primitives, never to page composition
- Full dark parity via `html[data-theme="dark"]`

## Colors

A pure zero-chroma neutral scale carrying the entire interface, plus five
saturated hues that are permitted **only** on a status glyph.

### Primary

- **Ink** (`oklch(0.205 0 0)`): the near-black that fills primary buttons, the
  default badge, and any element that must read as the single committed action
  on screen. In dark mode the relationship inverts — Ink becomes
  `oklch(0.922 0 0)` and its foreground goes dark — so "primary" always means
  maximum contrast against the page, never a specific darkness.

### Neutral

- **Paper** (`oklch(1 0 0)`): the page and card ground in light mode. Pure
  white; cards do not tint away from the page, they separate by ring alone.
- **Ink** (`oklch(0.145 0 0)`): body and heading text at full strength, and the
  page ground in dark mode.
- **Wash** (`oklch(0.97 0 0)`): the secondary, muted and accent surface — the
  single step of tonal separation used for hover grounds, table zebra, inert
  panels and secondary buttons. It is the only fill between Paper and Ink.
- **Slate** (`oklch(0.556 0 0)`): muted foreground. Labels, metadata, timestamps,
  the resting text of a status badge, and every word that supports rather than
  states.
- **Hairline** (`oklch(0.922 0 0)`): borders and input strokes. In dark mode it
  becomes translucent white at 10%, so dividers dissolve into the surface they
  sit on rather than glowing against it.
- **Halo** (`oklch(0.708 0 0)`): the focus ring, and nothing else.

### Tertiary — the glyph palette

These five exist to be read at 12px, on an otherwise colourless screen. They
never fill a shape, tint a surface, or colour a word.

- **Neutral glyph** (`oklch(55.6% 0 none)`): no status. A genuine grey, close
  enough in value to the label beside it to read as absence rather than as a
  sixth state.
- **Info glyph** (`oklch(62.3% 0.214 259.815)`): the baseline or expected state.
- **Success glyph** (`oklch(72.3% 0.219 149.579)`): the positive terminal state.
- **Warning glyph** (`oklch(76.9% 0.188 70.08)`): elevated but not failing.
- **Danger glyph** (`oklch(63.7% 0.237 25.331)`): the destructive terminal state,
  and the tint behind destructive actions.

Each lightens one step in dark mode (the `400` rung) so it holds its position
against a dark ground instead of going muddy.

### Named Rules

**The Glyph Rule.** Chroma appears on a status icon and nowhere else. The badge
around it stays `outline` — transparent ground, hairline border, muted text —
and only the glyph carries tone. Filling the badge instead turns a dense table
into a row of coloured pills and destroys the one signal that should stand out.

**The Two Ends Rule.** In a workflow enumeration, only the terminal states carry
colour: success for the positive end, danger for the destructive one. Every
intermediate step is neutral. Colour therefore reads as "this is finished",
not as a heat map of progress.

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

- **Headline** (600, 1.5rem/2rem, `-0.025em`): the page title, and the only
  element at this size. Always paired with `tracking-tight`; at 24px the default
  tracking reads loose.
- **Title** (600, 1rem/1.5rem): section and card headings. The step down from
  headline is deliberately large — there is no 20px rung in normal use.
- **Body** (400–500, 0.875rem/1.25rem): the working size. Table cells, form
  values, descriptions, and nearly everything the operator reads.
- **Label** (500, 0.75rem/1rem): metadata, timestamps, status badge text,
  helper copy, and column headers. Sentence case, never uppercase.

### Named Rules

**The 24px Ceiling.** Nothing in the application renders larger than 1.5rem.
There is no display size and no hero type. A screen that needs more presence
earns it through spacing and position, not through scale.

**The One Title Rule.** A page carries exactly one headline. Sections step
straight down to title (1rem); a second 24px heading on the same screen means
the page is really two pages.

**The Sentence Case Rule.** Labels are sentence case. Uppercase with widened
tracking is not part of this system — it appears three times in the entire
feature tree and should not spread.

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
page and will be dismissed". Four shadow utilities exist across the entire
feature and layout tree; that number should not grow.

## Shapes

The corner language is soft but tight, anchored on a 0.625rem (10px) base radius
that scales into a six-step ramp. Controls take the base radius (10px), cards
step up to 14px, and small controls step _down_ — a 24px button clamps to 10px,
a 28px button to 12px — so the corner never overwhelms a short edge.

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

- **Shape:** Softly rounded (10px), clamping down to 8–10px at the extra-small
  and small sizes so short edges stay proportionate.
- **Size:** Compact by default — 32px tall with 10px horizontal padding, 14px
  medium-weight text. A 24px and a 28px rung exist for toolbars and inline
  actions; 36px is the largest.
- **Default:** Ink ground with Paper text. This is the single committed action;
  a screen with two of them has not decided what it wants the operator to do.
- **Outline:** Page ground with a hairline border — the workhorse secondary.
  Hovers to Wash.
- **Ghost:** No ground at rest, Wash on hover. For row menus and dense toolbars
  where a border per action would build a grid of boxes.
- **Destructive:** A 10% destructive ground with destructive text. Tinted, never
  filled.
- **Press:** A 1px downward displacement on `:active`, suppressed on menu
  triggers so a popover anchor does not shift under an opening panel. This is
  the system's one piece of physical feedback and it is worth preserving.
- **Focus:** A 3px ring at 50% Halo plus a solid ring-coloured border. The ring
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
- **Focus:** Border shifts to Halo, plus a 3px ring at 50% Halo.
- **Error:** Border and ring go destructive, driven by the `aria-invalid` state
  rather than a class the template sets.
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

## Do's and Don'ts

### Do:

- **Do** spend colour only on a status glyph. If a new surface needs to
  distinguish states, reach for icon, weight, position and tone first.
- **Do** pair every severity colour with a label and an icon, and give the icon
  `aria-hidden` so the label is the accessible name.
- **Do** keep a page's largest text at 1.5rem, `font-semibold`,
  `tracking-tight` — the canonical page title is one exact class string, and
  reusing it verbatim is how the ceiling stays intact.
- **Do** separate in-page surfaces with `ring-1` at 10% foreground, or with one
  tonal step to Wash.
- **Do** use the 32px control height as the default rhythm; step to 24px or
  28px inside dense toolbars rather than shrinking padding on a 32px control.
- **Do** give every interactive element a visible 3px focus ring; on bare inline
  links a 2px ring is the established exception.
- **Do** mark genuinely empty containers with a dashed border.
- **Do** verify every new surface in both themes — dark is not a filter, it
  inverts the primary relationship and makes borders translucent.

### Don't:

- **Don't** reintroduce a chromatic brand accent. The interface is achromatic by
  decision; indigo lives on the mark and in browser chrome only.
- **Don't** fill a status badge with its severity colour, and don't colour the
  label. The ground stays transparent and the text stays muted.
- **Don't** colour intermediate workflow states. Only the two terminal ends
  carry tone.
- **Don't** render a destructive action as a solid red button. Tint the ground
  and colour the text.
- **Don't** introduce type above 1.5rem, or a display typeface. There is one
  family at four sizes.
- **Don't** set uppercase with widened tracking as a section eyebrow.
- **Don't** add a shadow to an in-page surface. Shadow means "floating and
  dismissable".
- **Don't** wrap every section in an identical bordered card. Vary surface
  levels — borderless headers, carded work surfaces, divider lists — so
  hierarchy comes from rhythm rather than from boxes.
- **Don't** add page-level motion. Transitions belong to the primitives; a
  feature template's motion vocabulary is `transition-colors` and the button's
  1px press.
- **Don't** let the page scroll as a whole. Columns own their own overflow.
