# Fireguard visual conventions

Fireguard uses a restrained **neutral gray** palette inspired by the Spartan palette, with a **vibrant orange primary**
and **Nova** component style in light and dark mode. The installed helm primitives are the visual
reference; their brain behavior remains authoritative. This document records
composition conventions, not a separate design system.

## Theme and typography

- The source of truth is the semantic token set in `src/styles.css`, based on
  [Spartan theming](https://www.spartan.ng/documentation/theming).
- Theme switching uses `html[data-theme="dark"]`. Primary controls use Fireguard
  vermilion orange: `#F4511E` with white text in light mode, and `#FF7043` with `#0A0A0A`
  text in dark mode. Keep the light foreground white on all primary surfaces, including buttons
  and the auth showcase. This explicit product choice preserves the current orange; compact
  white text on that light-theme fill has a known contrast ratio below 4.5:1. Sidebar primary
  tokens reference the same pair.
- Explicit appearance changes reveal the new theme from the bottom center with a
  700 ms circle and a fading blur through the native View Transition API. Initial
  rendering and automatic system-theme changes are immediate; reduced motion and
  unsupported browsers also switch immediately. Keep the three-mode Spartan picker.
- Backgrounds, panels, cards, borders, secondary actions and keyboard focus use
  one restrained low-chroma gray ramp. The light theme keeps a white canvas, near-white elevated
  surfaces, pale gray secondary surfaces and neutral separators. The dark theme uses a
  near-black graphite ramp without a blue cast.
  Text links remain neutral (`text-foreground`,
  including when using the native link button variant) and are underlined at rest; hover increases
  underline weight without reducing text contrast. The orange primary is a fill,
  not small text on a light surface. Do not tint the application shell.
- The Fireguard mark uses the Sillage C geometry: three identical, evenly spaced
  rounded lamellae on transparent surfaces. Use the neutral fills dark `#171717`,
  white `#FFFFFF` or primary vermilion `#F4511E` according to the surrounding
  surface. Non-primary application surfaces prioritize the primary mark; the auth
  showcase uses white on its light primary panel and primary on its dark neutral
  panel. The browser favicon also uses primary. Preserve the mark's repeated
  spacing and soft turns when scaling it.
- Keep locally hosted Geist Variable and Geist Mono. Use the installed Nova
  type, radius, control, spacing and variant defaults. Page titles are normally
  `text-2xl font-semibold`; labels and data stay compact and readable.
- Functional status and chart colors remain available. Every status has a label
  or icon; chart series have labels and accessible summaries.
- Scrollbars are thin throughout the application, with transparent tracks and
  neutral thumbs derived from `muted-foreground` (30% at rest, 60% on hover or
  keyboard focus). Both axes share this treatment in light and dark mode;
  forced-color mode retains native system scrollbars.

## Composition

A page first answers where the operator is, what needs attention and what can
be done. Group related information with fieldsets, item groups and separators.
Use the complete `hlmCard` anatomy for an autonomous surface; do not wrap each
field, row or empty state in another card. Avoid decorative gradients, icon
tiles and repeated section titles.

Collection pages root on `flex min-h-0 w-full flex-1 flex-col gap-4`; composed pages
(dashboard, detail, account, settings, admin panels) root on `flex min-w-0 flex-col gap-6`.
A title/description block uses `gap-1`, its content `gap-3`/`gap-4`. A dashboard page aligns
its left edge with its `<h1>`: a max width is allowed, `mx-auto` is not; the conversation
reading column (thread, saved and failed messages) is the named exception.
Section headings follow rank: `h2[hlmH4]` beside a lateral description (account, settings);
`h2[hlmLarge]` for a first-level section of an operational page; `text-sm font-semibold` for
a rail or secondary column section; `text-sm font-medium text-muted-foreground` for a group
caption; `p[hlmMuted]` for a description; `hlmMarker` (`separator` or `border` variant) for a
day header. Never `hlmCardTitle` outside a card; a tab panel never repeats its own visible label.
A list is one flat `hlmItemGroup` with separators — never a bordered box per row, skeletons
included.
Collection states form a triad. A genuinely empty collection shows its `ResourceIllustration`
(the closest `StateIllustration` when no catalog resource matches), one explanation and the
permission-gated action (adapted text when the viewer lacks the permission). A search miss shows
the `no-results` state artwork and a filter miss `no-matches`, each with a clear-filters action. A
failed load keeps `hlmEmpty` with `role="alert"`, destructive icon media and Retry inside
`hlmEmptyContent`: errors stay compact and never take artwork.
An action or section failure on a composed page uses a destructive `hlmAlert` with icon, title,
description and Retry. Onboarding is the named exception: the global toast plus a persistent
neutral explanation beside the retry action, without `role="alert"`. An icon-only button always
carries an `aria-label` and an `hlmTooltip` for pointer input; in `mobile-ui`, an action whose
meaning is not obvious (approve, reject, edit, scan) also carries a visible label. Tactile
density is always `mobile-ui:`, never `sm:`/`max-sm:`. Layout driven by content width uses
`@container`.
`StatTile` (`text-2xl` value) is reserved for the documented KPI bands: dashboard, equipment
and member surfaces. Elsewhere, use a flat `<dl>`.
An instant on an `/organizations/:id` page uses `appOrgDate` in the organization's timezone; a
date-only value (midnight UTC or a bare `YYYY-MM-DD`) uses `appOrgDate` in `'dateOnly'` mode,
without timezone conversion; a time range or day/month name uses `Intl` with `LOCALE_ID` and the
organization's timezone; a page outside an organization (account, auth, onboarding, invitation)
uses `DatePipe`/`Intl` with `LOCALE_ID`. A due date shows its absolute value with a subdued
relative suffix ("· in 3 days"), counted in whole days from today in the organization's
timezone; recency shows the relative value with the absolute one legible
without a hover (visible in `mobile-ui`, an `hlmTooltip` on a focusable, focus-ringed host on
desktop).
A plural renders through a template `i18n` ICU, or through `Intl.PluralRules`-selected
`$localize` branches in TypeScript — never an ICU literal inside a TS `$localize`, which renders
unparsed.

Desktop authentication uses two balanced columns: a full-height branded presentation
column and a centered form capped at `max-w-md`. The presentation uses the primary surface
in light mode and the same neutral background as the form column in dark mode, alongside
theme-matched captures of the real Fireguard workspace. The main capture matching the applied theme
loads eagerly at high priority; its alternate and the smaller detail captures stay lazy. Supporting
showcase text uses the full white primary foreground in light mode, without opacity attenuation. It has no outer margin, rounded
corners or enclosing card; a single vertical border separates the columns.
The presentation takes half of the shell; onboarding puts compact progress above its form. Phone forms start near the top with the brand and appearance control
visible; tablet and desktop forms center when space permits. Auth actions and secondary
links keep 44px touch targets. Password requirements stay in a focus-triggered popover below
the password input, with a persistent native Field description for assistive technology. Each rule
includes textual met/not-met status; the live region changes only when criteria change and never
contains password characters. Opening guidance keeps focus on the input.
The same shell carries onboarding: five compact steps,
a current-step summary, progress and optional disclosure at every width. Only one
step is active; one footer carries its named commitment and any allowed skip.
Onboarding primary and optional skip buttons span the form width with matching 44 px minimum heights. Plan names are prominent and allowances use a vertical list. Onboarding API action failures use the global feedback toast plus a persistent neutral explanation beside the retry action; field validation remains local. Facility address selection fills separate street, city, country and postal-code fields.
Plans use stacked radio rows with prices and Billing quota summaries. Named exception: the Pro
plan card keeps its "Most popular" badge and top gradient by product decision.
Desktop onboarding anchors the active form near the top so adding prepared rows
does not move its title or first fields. Comparable offers occupy equal widths.

The desktop dashboard shell uses Spartan's standard sidebar variant, including
its compact hamburger/sheet behavior in a narrow PC window. Its background
references `--background`, white in light mode and near-black in dark mode.
The logo and name sit above the organization switcher; the collapsed sidebar keeps only
the logo, while the compact desktop drawer keeps the full lockup. Its main content
has no outer gutter, corner radius or card shadow. Desktop contextual panels
also meet the shell edges, separated by a border; mobile panels remain overlays.
The dashboard's right contextual column resizes beside the routed content on
wide desktop; calendar day lists use it without an enclosing card. At narrow
widths those calendars use their agenda presentation.
Page-owned spacing keeps headings, controls and data readable.

Mobile interaction mode is selected centrally by `InteractionCapabilitiesService`, not by viewport
width. Phones and tablets use a labeled bottom navigation with at most five primary
destinations: Home, Interventions, Assets, Messages and More, filtered by existing
permissions. More is a route-backed, grouped destination hub; no authorized access
may disappear into a disabled placeholder. Mobile removes the sidebar and hamburger.
Tablet columns are allowed without reverting to desktop interactions.

Use `mobile-ui:` for tactile target density, mobile-only controls and surfaces;
reserve width/container queries for fitting content. Desktop select/menu semantics
and control sizes remain unchanged in narrow windows. Keep controls at least 44px
on mobile, visible labels and keyboard alternatives; do not require hover or drag.
Short contextual choices may use a native Spartan drawer with radio, checkbox or
command composition. Multi-filter drafts commit with Apply or discard with Cancel;
long workflows use routes or sheets, destructive confirmations use alert dialogs.
Drawer headings are left-aligned; action rows have an icon and readable label.
Safe-area and navigation clearance must protect content, errors and workflow actions.
Automatic classification must not replace route state, lose form drafts, or duplicate
requests. No manual mobile/desktop override is exposed. Never modify
`src/app/shared/ui/**` to implement these adaptations.
Sidebar destinations stay at one level, without sub-navigation or disclosure controls.
Messages and Collaboration (the channel workspace, with a group icon) live in the
footer above Support and the account menu. The organization body keeps operational
and asset destinations.
Navigation rows use `sidebar-accent` for hover and selection, including the Messages
and Channels extensions. In dark mode it blends 60% muted with the background for
a subdued surface. Navigation count badges align to the trailing edge and hide in
the collapsed icon rail. Conversation separators sit outside the interactive fill
so their translucent border matches the surrounding shell in every row state.
An optional sidebar extension forms a flush, bordered column between navigation and
content on desktop. Messages use this column for a searchable conversation list:
avatars, names, dates and unread counts; selection uses a neutral surface.
Conversation rows use compact 60px minimum height, 32px avatars and two text lines.
Sent message bubbles use white backgrounds and black text in both themes, with a
neutral outline for separation on a white canvas. Incoming messages retain muted surfaces.
Channels use the same extension with 28px single-line hash rows, matching their
adjacent disclosure buttons (44px touch targets below desktop). Favorites and
subchannels use native collapsibles; All channels remains a static heading.
Search shows flat matches so a collapsed parent cannot hide a result.
Messages and Channels extension headers are 48px tall, aligned with the dashboard toolbar.
Below 1024px, the list and thread occupy the same space successively, with a back
link to the list. The primary navigation remains independently available.
The application brand is always written “Fireguard”.
The dashboard toolbar and page header each have a bottom semantic border.
The page header has no top border and keeps a subtle `bg-muted/25`
surface, lighter than the main canvas in dark mode.
Primary route-level navigation sits beneath the title in that header as a
native Spartan `line` tab list. The paginated list preserves the same variant
and keyboard model when the labels outgrow the available width. Tabs that
switch only a local panel, filter or form mode stay with that content.

The organization dashboard pairs period-scoped Activity with a current Risks and follow-up
snapshot in equally weighted columns. Four compact KPIs precede the main inspection area
chart and status donut, the same `StatTile` band pattern the equipment and member surfaces use
for their own KPIs; resolutions and attention items form a shorter second row. Five
recent interventions follow. Additional analysis opens with a snapshot Health block —
inspection pass rate, equipment availability and non-conformity resolution as labelled progress
rows, independent of the active period — then severity across all statuses and resource growth,
all inside the closed disclosure. Period controls belong to Activity and never relabel
snapshot metrics. The dashboard container owns outside padding; cards use native Nova
spacing, with 16px between cards and 24px between groups. Below 960px of content, the
reading order is inspections, status distribution, resolutions and alerts. KPIs use two
columns below that threshold and one below 360px; recent rows become a mobile list. Risk chart
skeletons stack below 400px of card content, matching the chart layout without internal overflow.
Charts use official Spartan Chart marks, semantic colors and native keyboard focus/tooltips.
The inspection series uses `primary` with a light uniform fill and straight segments.
Volume axes start at zero, use integer labels and thin date labels to prevent collisions.
Named series and numeric legends keep color supplemental. Graphite/light surface tokens
remain unchanged. Channel creation uses a compact centered dialog, preserving the unsaved-draft guard.
The interventions collection keeps List, Board, Calendar and Recurrences in the
page header, then starts its content with search, filters and results. It has no
metric cards or Analysis disclosure. Mobile rows keep
name, site, status and due date; bulk selection is explicitly activated.
Long names wrap
within the table so deadlines and row actions remain reachable. The generic board
uses bounded columns with fixed headers, independent vertical card scrolling and
whole-column navigation. Card references, wrapping titles and native action slots
keep long content readable; navigation never covers cards.
Board cards omit the default priority and badge outlines. Responsible member and
deadline share one compact content row, without a separate footer surface.
Property grids adapt to their available content width, including space taken by the sidebar.

Creation uses one sheet, blank/template tabs and one visible form/footer.
Intervention detail keeps its stable line tabs in the page header, then places
operational context and work first, with activity and metadata in secondary disclosures. A single progression
action remains accessible on mobile; a footer must never cover content or errors.

## Native patterns

| Purpose            | Spartan convention                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Forms              | `hlmFieldSet`, `hlmFieldGroup`, associated label, description and `hlmFieldError`                                 |
| Commitment         | Default button; outline secondary; ghost local; destructive for destructive effects                               |
| Searchable choices | Combobox; short enums use select; comparable exclusive options use radio group                                    |
| Navigation         | Tabs for content; toggle group for view modes; dropdown for actions                                               |
| Overlays           | Sheet for contextual creation; dialog for short edits; alert dialog for consequential confirmation                |
| Feedback           | Field error locally; action error in an inline alert; brief global toast                                          |
| Loading            | Skeleton matching the expected structure; spinner in the pending action; retain existing data on refresh          |
| Empty collections  | Native `hlmEmpty`: empty, search/filter miss and load failure (`role="alert"`, Retry) stay visually distinct      |
| Section headings   | `h2[hlmH4]`, `h2[hlmLarge]`, rail/group text sizes and `p[hlmMuted]` by rank; never `hlmCardTitle` outside a card |
| Dates              | `appOrgDate` (instant or `'dateOnly'`) on organization pages; `DatePipe`/`Intl` with `LOCALE_ID` elsewhere        |
| Metrics            | `StatTile` for the documented KPI bands (dashboard, equipment, members); a flat `<dl>` elsewhere                  |
| Plurals            | Template `i18n` ICU, or `Intl.PluralRules`-selected `$localize` branches; never an ICU inside a TS `$localize`    |

Use these same patterns for account, settings, members, sites, equipment and
inspection surfaces. Do not create generic replacements for native controls or
edit vendored primitives to encode a feature's workflow.

Empty regions take isometric artwork from two catalogs, each paired light/dark and following
the applied theme. `ResourceIllustration` draws a domain resource
(`public/assets/illustrations/resources/catalog.json`) and serves genuinely empty collections
only: never a miss, loading, an error or an empty pagination page of a nonempty collection.
`StateIllustration` draws a generic situation
(`public/assets/illustrations/empty-states/catalog.json`): `no-results` and `no-matches` for
misses, `access-denied` for a forbidden list, `all-clear` when emptiness is good news,
`no-selection` for a master-detail pane waiting on a choice, `not-found` for a missing record,
`no-events`, `no-history`, `no-messages`, `no-notifications` and `empty-inbox` for empty feeds.
Keep the native Empty structure: the artwork replaces the media icon as the first child of
`hlmEmptyHeader`, on the default (transparent) media variant, with the existing title,
description and permission-gated action. One illustration per empty region, 160 px on small
screens / 192 px from `sm`; `size="sm"` (112 / 128 px) in sheets, dialogs, side panels and
dashboard cards. Pickers, comboboxes, inline list rows and navigation stay text or icon only.
The artwork is a technical drawing, not a mascot, in one true 30° isometric throughout: no
front view, no object turned to face the viewer. Its vocabulary comes from three reference
plates: keycaps on a keyboard slab (one lifted over its slot), rounded cubes wired by dotted
links, and a lidded translucent volume. Turned objects (extinguisher, bell, hourglass, cone,
a domed bust for a person) are exact surfaces of revolution. Faces sit at the
page background's value so the linework alone draws the volumes: one brighter contour for the
subject, zinc contours and fine inner edges for the rest, hairline strokes that keep
their width at every rendered size (`vector-effect: non-scaling-stroke`). Pictograms are the
interface's own Lucide icons, engraved in the plane of a face, upright on screen and
foreshortened like a decal. The artwork is monochrome, like the reference plates: no brand
color. Its one light is the palette's brightest neutral (white in dark, near-black shading in
light): a lit slot, a glowing volume, a lit screen or opening, or a single brightest object.
Never a floating halo. Dotted lines mean absent, hidden or projected, never a visible edge of
a solid. Absence is drawn with dotted ghosts. An object stands on its own;
a slab appears only when it is the subject (a parcel, a keypad, a board). Judge it at the
rendered sizes: it must be recognizable blind, the silhouette leads and details stay
secondary. Improve the drawing's hierarchy rather than enlarging Empty media or widening its
lit area. Both catalogs are generated: edit a scene, the kit or the palette in
`tools/illustrations/` and run `node tools/illustrations/build-illustrations.mjs`, never the SVG.

Named exception: the 403/404/500 error pages keep their `aria-hidden`, one-shot, motion-safe
decorative ornament (`error-scene`).

## Interaction and accessibility

- Preserve validated destinations, draft input, collection filters and server
  authority across navigation. Never hide a failure behind an endless spinner.
- Keep keyboard focus visible; restore an inline editor's trigger only after it
  closes, never when it is initially mounted closed.
- Use Nova density on desktop; provide at least 44px touch targets on affected
  mobile actions. Avoid padding that postpones the first useful field or row.
- Confine horizontal scrolling to tables and tab strips. Text, errors and
  action groups must wrap without overflowing the document.
- Respect reduced motion and live-region semantics. Test long French, English
  and Spanish labels, light/dark contrast, zoom and mobile footer clearance.
- Offline work, deferred attachments, conflict resolution and atomic publication
  are product invariants. Closing a long server operation does not cancel it.

Channel headers show up to three overlapping native avatars and an overflow count. Mentions
use a compact neutral chip whose fill and outline derive from the surrounding text color.
Channel hierarchy moves use a neutral destination outline, an offset drag preview and a
top-level drop target. A native move menu stays available to keyboard and touch users.

### Workspace onboarding

Workspace choices and creator setup share the auth split showcase. At 1024 px and above both
halves are equal, with the form capped at 576 px and anchored near the top. Below this breakpoint,
hide the showcase and retain brand, appearance and sign-out controls. Compact progress sits
above the creator form at every width, with the step detail in a native Collapsible.
Invitations precede discoverable organizations in native Item rows. Creation is secondary.
Loading, empty choices, pending approval and errors remain visually distinct. Reuse the existing
light/dark captures and masked dot decoration; do not add a competing palette or ornamentation.
