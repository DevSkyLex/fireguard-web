# Fireguard visual conventions

Fireguard uses the official Spartan **neutral** surfaces with an **orange primary**
and **Nova** component style in light and dark mode. The installed helm primitives are the visual
reference; their brain behavior remains authoritative. This document records
composition conventions, not a separate design system.

## Theme and typography

- The source of truth is the semantic token set in `src/styles.css`, based on
  [Spartan theming](https://www.spartan.ng/documentation/theming).
- Theme switching uses `html[data-theme="dark"]`. Primary controls use Fireguard
  orange: `#FF6A00` with `#000000` text in light mode, and `#FF850A` with `#0A0A0A`
  text in dark mode. The light button text contrast is 7.3:1. Sidebar primary
  tokens reference the same pair.
- Backgrounds, panels, cards, borders, secondary actions and keyboard focus keep
  the official neutral tokens. Text links remain neutral (`text-foreground`,
  including when using the native link button variant); bright orange is a fill,
  not small text on a light surface. Do not tint the application shell.
- The Fireguard mark retains its existing geometry and orange detail. Browser
  and PWA chrome use neutral `#171717`; the light PWA background is white.
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

Desktop authentication uses two balanced columns within a 1600px maximum shell:
a full-height neutral presentation column and a centered form capped at `max-w-md`.
The presentation has no outer margin, rounded corners or enclosing card; a single
vertical border separates the columns.
The presentation takes 42–44% of the shell; onboarding retains its compact progress rail. Phone forms start near the top with the brand and appearance control
visible; tablet and desktop forms center when space permits. Auth actions and secondary
links keep 44px touch targets, and password requirements appear beside password creation.
The same shell carries onboarding: five compact desktop steps,
a current-step summary, progress and optional disclosure on mobile. Only one
step is active; one footer carries its named commitment and any allowed skip.
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

The organization dashboard opens directly on four compact operational metrics and trends,
without an organization identity block or Overview/Analysis tabs. Charts use the official
Spartan Chart primitive, its semantic theme and native legend/tooltip. Channel creation
uses a compact centered dialog, preserving the unsaved-draft guard.
The interventions collection starts with the view selector, then search, filters
and results. It has no metric cards or Analysis disclosure. Mobile rows keep
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
Intervention detail places operational context and work first, stable line tabs
next, and activity and metadata in secondary disclosures. A single progression
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
