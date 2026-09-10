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
  surface. Browser and PWA chrome use neutral `#171717`; preserve the mark's
  repeated spacing and soft turns when scaling it.
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
Onboarding primary and optional skip buttons span the form width with matching 44 px minimum heights. Plan names are prominent and allowances use a vertical list. API action failures use the global feedback toast; field validation remains local. Facility address selection fills separate street, city, country and postal-code fields.
Plans use stacked radio rows with prices and Billing quota summaries.
Desktop onboarding anchors the active form near the top so adding prepared rows
does not move its title or first fields. Comparable offers occupy equal widths.

The dashboard shell uses Spartan's standard sidebar variant. Its background
references `--background`, white in light mode and near-black in dark mode.
The logo and name sit above the organization switcher; the collapsed sidebar keeps only
the logo, while the mobile drawer keeps the full lockup. Its main content
has no outer gutter, corner radius or card shadow. Desktop contextual panels
also meet the shell edges, separated by a border; mobile panels remain overlays.
Page-owned spacing keeps headings, controls and data readable.
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
chart and status donut; resolutions and attention items form a shorter second row. Five
recent interventions follow. Severity across all statuses and resource growth remain in a
closed Additional analysis disclosure. Period controls belong to Activity and never relabel
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

| Purpose            | Spartan convention                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| Forms              | `hlmFieldSet`, `hlmFieldGroup`, associated label, description and `hlmFieldError`                        |
| Commitment         | Default button; outline secondary; ghost local; destructive for destructive effects                      |
| Searchable choices | Combobox; short enums use select; comparable exclusive options use radio group                           |
| Navigation         | Tabs for content; toggle group for view modes; dropdown for actions                                      |
| Overlays           | Sheet for contextual creation; dialog for short edits; alert dialog for consequential confirmation       |
| Feedback           | Field error locally; action error in an inline alert; brief global toast                                 |
| Loading            | Skeleton matching the expected structure; spinner in the pending action; retain existing data on refresh |
| Empty collections  | Existing `app-empty-state` / `hlmEmpty`, one explanation and one available action                        |

Use these same patterns for account, settings, members, sites, equipment and
inspection surfaces. Do not create generic replacements for native controls or
edit vendored primitives to encode a feature's workflow.

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
