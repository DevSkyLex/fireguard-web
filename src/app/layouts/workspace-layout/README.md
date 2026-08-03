# Workspace Layout

## Purpose

`workspace-layout` is **the** application shell: a four-column, full-bleed frame composed of an
organization rail, a channel sidebar, a main column, and a mono-active right panel.

Every authenticated route is served here — organization pages, conversations and the account
pages alike — at its canonical URL (`/`, `/organizations/:organizationId/…`, `/account`). The
`dashboard-layout` it replaced is gone, along with the `/workspace` URL prefix that used to keep
the two shells apart.

Structural properties worth knowing before contributing to it:

| Aspect           | Behaviour                                                       |
| ---------------- | --------------------------------------------------------------- |
| Content plane    | full-bleed, `width: 100%`                                       |
| Scroll ownership | shell is `overflow: hidden`; every column scrolls independently |
| Page title       | rendered by the conversation header, from the route trail       |
| Slots            | four additive **plus** one mono-active panel                    |

## Ownership

This layout owns shell composition only — the column frame, the slot contracts, the panel
outlet, and shell-local UI state (active panel, sidebar collapse, mobile pane).

It must not own business workflows, inject feature stores, or call data-access services. Domain
UI reaches the shell exclusively through slot contributions published by the owning feature
(`ARCHITECTURE.md` §2.4, §8.2).

## Geometry

Measured from the source prototype (`fireguard-maquette/design_handoff_fireguard_collaboration/src/08-logic-render.js`,
`renderVals()` → `RS`). The mobile breakpoint is `max-width: 1024px`.

The breakpoint lives in **CSS** (`lg:` / `max-lg:`) so the correct columns render before hydration;
`WorkspaceShellService.isDesktop` mirrors it through `BreakpointObserver('(min-width: 1024px)')` and
only drives which mobile pane shows.

Tailwind's `lg` is `64rem`, which at the 16px root is exactly 1024px. Verified in the browser on
both sides of the boundary:

| Viewport | `(width >= 64rem)` | `(min-width: 1024px)` |
| -------- | ------------------ | --------------------- |
| 1001px   | `false`            | `false`               |
| 1061px   | `true`             | `true`                |

Note that this held even back when the app forced a 14px root: `rem` inside a media query resolves
against the **initial** 16px value, ignoring any author override. Do not "fix" the breakpoint with
an arbitrary `min-[1024px]:` variant.

| Column             | Desktop                                                  | Mobile                                      |
| ------------------ | -------------------------------------------------------- | ------------------------------------------- |
| root               | `flex`, `h-dvh`, `w-full`, `overflow-hidden`, `relative` | same                                        |
| rail               | `w-[60px]`, tinted, right border, centred column         | hidden                                      |
| channel sidebar    | `w-[266px]`, right border                                | `absolute inset-0 z-30` — the `'list'` pane |
| main column        | `flex-1 min-w-0 overflow-hidden`                         | `absolute inset-0 z-20` — the `'main'` pane |
| info panel         | `w-[330px]`, left border                                 | `absolute inset-0 z-[46]`                   |
| intervention panel | `w-[344px]`, left border                                 | same overlay                                |
| assistant panel    | `w-[360px]`, left border                                 | same overlay                                |
| map sidebar        | `w-[340px]`, left border                                 | same overlay                                |
| form drawer        | `w-[428px] max-w-[92vw]`, right-anchored                 | `w-full`                                    |
| column headers     | `h-14` (56px)                                            | same                                        |
| nav rows           | `h-8` (32px)                                             | same                                        |

The four right-hand panels have **different widths**: each `PANEL_SLOT` contribution declares its
own. Do not factor them into one shared width.

## Slots

The layout knows no feature. It exposes extension points; each feature contributes from its own
`providers/with*()` helper, wired in `app.routes.ts` through `provideWorkspaceLayoutSlots()`.

**Additive** — `{ id: string; order: number; component: Type<unknown> }`:

| Slot                         | Renders                                             | Notes                                                                                        |
| ---------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `RAIL_SLOT`                  | the 60px rail                                       | adds `region: 'lead' \| 'footer'` so org tiles and the user menu can be placed independently |
| `SECONDARY_NAV_SLOT`         | sections of the channel sidebar, stacked by `order` | each feature pushes its own section rather than one monolithic sidebar                       |
| `CONVERSATION_HEADER_SLOT`   | the tool cluster at the right of the 56px header    |                                                                                              |
| `WORKSPACE_PAGE_HEADER_SLOT` | contextual page actions                             | where `withInterventionHeaderActions()` lands                                                |

**Mono-active** — `{ id; priority: number; component; active: Signal<boolean> }`, copied from
`ShowcaseContribution` in `split-layout`:

| Slot         | Renders                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `PANEL_SLOT` | the right panel — **at most one** contribution, the highest `priority` whose `active()` is true |

Panel priorities reproduce the prototype's rules: the assistant outranks everything; otherwise the
panel matching the current view wins. In use today: `withCollaborationAssistantPanel()` at priority
90, active while the member has summoned it; `withCollaborationInfoPanel()` at priority 10, active
only while a channel conversation is routed.

**A contribution that is summoned rather than routed must manage `panelVisible`.** The shell renders
no panel at all while that flag is false, so the assistant's toggle forces it true on open and hands
back the value it replaced on close — otherwise summoning the assistant once would leave the info
panel hidden for good. The corollary: a control whose "on" state reads `panelVisible()` alone will
light up over a panel that is not on screen, which is why `ChannelInfoToggle` also checks that the
assistant is not holding the slot.

### The panel column needs `lg:h-full`

The stretching flex child of the shell is the **outlet component's host**, not the `<aside>` inside
it. A block child does not inherit that height, so without `lg:h-full` the panel is only as tall as
its content and its background stops mid-column. Measured, not theorised: 678px instead of 900.

### The mobile pane follows routing, not the nav rows

Below `lg` the sidebar and the main column are stacked panes and exactly one is displayed. Nothing
switched between them for the whole of phases 1-8: `showMain()` existed, was unit-tested, and was
called by no template. Tapping a channel on a phone changed the URL and nothing else — the routed
column stayed `display:none`, which also took it out of the tab order entirely.

`WorkspaceLayout` now syncs the pane from `NavigationEnd`. Not from the nav rows, and not from the
outlet's `(activate)`:

- a `(click)` per row would have to be repeated on the channel rows, the org tiles, the panel's
  linked threads and the command palette — and forgotten on the fifth,
- `(activate)` never fires for channel-to-channel navigation, because Angular reuses the component.

"Has the member navigated into something" is **not** `route.firstChild !== null`: the workspace root
matches the organization overview, declared `path: ''`. The test is whether the routed chain
contributes any URL segment, walked over `route.snapshot` — a child `ActivatedRoute` being activated
has no `snapshot` yet, and reading it from the constructor throws before the shell renders.

### The panel is not rendered on the mobile list pane

Below `lg` the panel is an `absolute inset-0` overlay at `z-40`, above both the sidebar (`z-30`) and
the main column (`z-20`). Gated on `panelVisible()` alone — a flag seeded `true` from a cookie — a
phone landing on the channel list had it painted over by a panel describing a channel the member had
not opened. The outlet's condition therefore also requires `isDesktop() || mobilePane() === 'main'`.

`showMain()` additionally closes the panel on mobile, but only in the **browser**: `isDesktop()` is
`false` on the server for want of a viewport, not because the viewport is narrow, so an unguarded
check strips the panel from every desktop user's first paint.

### A panel contribution cannot reach page state

Slot contributions are instantiated by the **layout**, so they resolve against the layout's
injector — not the routed page's. A component-scoped store the page declares in its own
`providers: []` is therefore invisible to them.

This is not hypothetical: `InterventionDetailPage` provides `InterventionWorkspaceStore` itself, so
its 336px Properties rail cannot simply be moved into `PANEL_SLOT`. The established answer is the
one `withInterventionHeaderActions()` already uses — a **root-provided bridge store** the page
publishes into (`InterventionHeaderStore`) and the contribution reads. Moving the rail means
building the equivalent for its state first.

Until that exists, the intervention page keeps its own aside and `PANEL_SLOT` stays empty on that
route. `e2e/workspace/workspace-panel.spec.ts` asserts there is exactly one side column, so the day
a contribution starts competing the suite fails instead of shipping two rails.

### …and a root-provided bridge store cannot reach route-provided ports

The corollary, learned the hard way. A bridge store solves the first problem by living in the root
injector — which means it cannot see anything the **shell route** provides either.
`MEMBER_DIRECTORY_PORT` is bound by `provideOrganizationFeature()` in the shell route's `providers: []`,
so injecting it from a root store throws `NG0201` the moment the panel mounts.

Split the two concerns: the root store owns routed state and transport; the contributed
**component** owns anything reached through a route-provided port, because a component under the
layout resolves against the layout's element injector. `ChannelPanelStore` and `ChannelInfoPanel`
are the worked example.

## Styling contract

`ARCHITECTURE.md` does not govern visual conventions, so this section is normative for the
workspace shell and everything contributed into it.

Rules, in priority order:

1. PrimeNG design tokens — let PrimeNG components draw their own chrome.
2. `[pt]` only for strictly local adjustments.
3. Tailwind v4 utilities for everything else.

**No custom CSS variables.** `core/primeng/presets/fireguard.preset.ts` carries no `extend` block
for this shell, and `src/styles.css` holds nothing beyond the imports, the font `@theme` and the
root/body sizing. Further hand-written CSS is off-limits without an explicit exception.

### Why the defaults already match

The design system's scales **are** Tailwind's defaults at a 16px root — it sets no
`html { font-size }` of its own, only `body { font-size: 14px }`. `src/styles.css` now mirrors
that exactly, so no token layer is needed to hit the mockup's values:

| Role                  | Design system | Class         | Rendered |
| --------------------- | ------------- | ------------- | -------- |
| nav / button radius   | 6px           | `rounded-md`  | 6px      |
| card / popover radius | 8px           | `rounded-lg`  | 8px      |
| panel radius          | 12px          | `rounded-xl`  | 12px     |
| composer radius       | 16px          | `rounded-2xl` | 16px     |
| body text             | 14px          | `text-sm`     | 14px     |
| section title         | 18px          | `text-lg`     | 18px     |
| page title            | 24px          | `text-2xl`    | 24px     |
| caption / badge       | 12px          | `text-xs`     | 12px     |
| gutters               | 4/8/12/16/24  | `p-1/2/3/4/6` | same     |
| column header         | 56px          | `h-14`        | 56px     |
| nav row               | 32px          | `h-8`         | 32px     |

Only one dense step has no Tailwind equivalent: the 15px **Card Title** role (`text-[15px]`),
which DESIGN.md documents as `typography.card-title` and PrimeNG's preset already applies to
`p-card` headings. Use the arbitrary value only for that role.

The 11px and 13px steps are gone: 104 arbitrary sizes clustered within ±1.6px of a real step
(13 / 12.5 / 12 / 11.5 / 11px, 0.7rem, 0.65rem) were collapsed onto `text-sm` and `text-xs`.
Reach for `text-xs` for meta and `text-sm` for body rather than reintroducing a hand-written
size — DESIGN.md's _14px Body Rule_ is the reference.

> This was not always true. The app previously set `html { font-size: 14px }`, which scaled every
> rem utility by 0.875 and put _every_ radius, gutter and type step off by 12.5% — which is why
> ~85 hand-written `text-[15px]` / `[13px]` / `[11px]` overrides had accumulated. Do not
> reintroduce a root override to "fix" density; change the component's own classes instead.

### Vocabulary

| Need               | Class                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Radius             | `rounded-md` (nav, buttons) · `rounded-lg` (cards, popovers, menus) · `rounded-xl` (panels) · `rounded-2xl` (composer) · `rounded-full` (pills, avatars)      |
| Text               | `text-xs` · `text-sm` · `text-base` · `text-lg` · `text-2xl`                                                                                                  |
| Weight             | `font-medium` · `font-semibold` · `font-bold` — exact 1:1 with the design system                                                                              |
| Tracking / leading | `tracking-tight` · `tracking-wide` · `leading-normal` · `leading-snug`                                                                                        |
| Canvas             | `bg-surface-50 dark:bg-surface-950`                                                                                                                           |
| Card surface       | `bg-surface-0 dark:bg-surface-900`                                                                                                                            |
| Tinted zone        | `bg-surface-100 dark:bg-surface-800`                                                                                                                          |
| Border             | `border-surface-200 dark:border-surface-800` · faint `border-surface-100 dark:border-surface-800` · strong `border-surface-300 dark:border-surface-700`       |
| Heading text       | `text-surface-950 dark:text-surface-50`                                                                                                                       |
| Body text          | `text-surface-900 dark:text-surface-100`                                                                                                                      |
| Secondary text     | `text-surface-500 dark:text-surface-400`                                                                                                                      |
| Subtle text        | `text-surface-500 dark:text-surface-400` — same as secondary. `surface-400` on a card is 2.5:1 and fails AA at every size; there is no passing "subtler" step |
| Row hover          | `hover:bg-surface-100 dark:hover:bg-white/5`                                                                                                                  |
| Row active         | `bg-surface-200 dark:bg-white/10`                                                                                                                             |
| Primary            | `text-primary` · `bg-primary` · `text-primary-contrast` — theme-reactive, no `dark:` needed                                                                   |
| Status             | Tailwind `red` / `green` / `amber` / `blue` ramps. Anything a PrimeNG component draws goes through `severity="…"` instead.                                    |

Arbitrary values are reserved for the structural column widths listed under **Geometry**
(`w-[266px]`, `w-[330px]`, …). Nothing else.

### Hard rules

- **Always write the `dark:` pair.** `--p-surface-0` is `#ffffff` in _both_ colour schemes, so
  `bg-surface-0` renders white in dark mode. The app has no automatic surface inversion.
- **Primary is indigo.** The preset maps primary to indigo; the source design system declares its
  `--primary` as blue and indigo as `--accent`. The app wins — never import the blue.
- **Never `shadow-md` / `shadow-lg` from Tailwind for chrome.** They are neutral black, while the
  preset's overlay shadows are blue-tinted `rgba(15, 23, 42, …)`. Mixing them reads as two
  elevation systems. Prefer letting `p-popover` / `p-menu` / `p-drawer` draw their own.
- **No dynamic class strings.** Tailwind has no config and no safelist here, so every class must
  be a literal in `.ts` or `.html`. `'bg-' + tone` silently produces nothing.
- **`src/styles.css` is not a scratchpad.** A Tailwind `@theme` block would be acceptable; any
  hand-written rule requires sign-off first.

## Accessibility

The source prototype builds every interactive element as `<div onClick>` with no role, tabindex,
or keyboard handler. Do not port that.

- Interactive elements are real `<button>` / `<a>` elements.
- Active navigation rows carry `aria-current`.
- Collapsible sections carry `aria-expanded` and `aria-controls`.
- Focus rings stay visible; hover-revealed toolbars must also reveal on `:focus-within`.
- Status is never colour-only — pair it with a label or icon (`PRODUCT.md`).
- Animation honours `prefers-reduced-motion`.
