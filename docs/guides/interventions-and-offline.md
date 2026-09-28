# Interventions and offline synchronization

Intervention owns workspace persistence and replay. Offline capability is explicit and does not imply that every server workflow is available without a connection.

**Authoritative references:** [Interventions](../../src/app/features/organization/features/interventions/FEATURE.md) · [Workload](../../src/app/features/organization/features/workload/FEATURE.md).

## Local intent and replay

A durable local operation progresses independently of the server snapshot. Replay confirms it or retains a recoverable failure/conflict; a conflict requires review rather than an unconditional retry.


Keep local drafts when writes fail. Stable operation/client identities preserve
idempotency; independent revisions protect operational edits and time journals.
Restore only data authorized for the current account/organization. Device persistence
failure must remain visible and preserve the latest intent in memory where specified.

## Conflict boundaries

Time, effort and assignment conflicts expose both local intent and server values.
Generic retry cannot bypass revision review or overload consent. Workload owns
capacity projections; intervention owns task effort, assignment and time entries.
Missing effort/history/capacity stays unknown, never zero.

## Workspace composition

The same form/store instance survives adaptive presentation changes. Collection
query, paging and lifecycle actions retain their owned request states. The owning
contract defines publication checks, permission projections, confirmation behavior
and the synchronization widget's public surface.

## Intervention collection reference

The owner contract is [Routes](../../src/app/features/organization/features/interventions/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

The index route owns List, Board, Calendar and Recurrences in one page.
They use a native paginated Spartan tab list with `variant="line"`, projected
beneath the title through `PageTabsService`. Recurrences remains addressable by
`?view=recurrences` without a secondary menu entry in the collection. Creation
remains in the shell header's action row.
Each view is a named section. Board, Calendar and Recurrences mount on first
activation through `@defer` and remain mounted to retain their local context.
All view changes merge query parameters. Board/calendar legacy paths retain
their redirects. Row links, creation success and previous/next navigation
preserve the list query; returning to the list removes only the detail tab.
Sort, hidden columns and page size remain in their existing preference cookie.

Search is offered only in List and Board; the filter catalog shows only fields
the active view applies. Unused filter values survive view changes in the URL.
The collection starts directly with its toolbar because its view selector lives in the header, and has no metric cards,
statistics request, Analysis disclosure or separate queue-count shortcuts. Long intervention
and site labels stay within their columns so the due date and row menu remain
visible. The List includes a Responsible column with the member avatar and full
display name, or a dotted placeholder when no responsible member is resolved.
Participants occupy a separate hideable column. Each intervention row keeps its
title and compact work summary; the due date shows urgency without a repeated
relative date.
Detail properties use one field per row; the secondary details
disclosure starts collapsed at every width so the actionable rail stays compact.
Opening it reveals participants, labels, description and audit metadata in that
order; resizing preserves the user's disclosure choice and any active description
editor, while another intervention resets it.

The detail registers exceptional recording states and one native Spartan split button
in the page header at every viewport. Its menu contains activity, saved operations,
publication issues and the secondary actions. It has no second command band.
The normal up-to-date state is omitted from the page header. Intervention status lives
inside the same Properties grid as site, responsible, priority and schedule; status and priority
use the shared intervention badge, and a read-only site name links directly to its facility record.
The label catalog dialog composes Spartan field, item, empty-state and button-group primitives.
Properties precede publication issues and About in the desktop rail; narrow screens
place the rail after the work area. Activity and its composer are directly visible
under Work, without a card or disclosure. The dashboard layout owns Tailwind's
centred responsive `container` for both routed content and the page header; this
page retains only its narrow-width gutter.
Tab triggers are direct children of the native tabs list for keyboard navigation.
Work rows lead with the target, then the action; provenance remains secondary.
Known assignment restrictions disable execution and skipping before a request.
Mutation feedback uses the existing toast service per request, while draft validation
and recoverable loading states retain their local context. The progress bar has no
additional divider underneath it.
Comment mentions display the selected member's name in the draft and serialize to the
API UUID token only on submit. The draft itself is sufficient confirmation, so no
separate notification-chip summary is rendered.

Creation is permission-gated on intervention planning, including `?create=1`.
The sheet has mutually exclusive Blank and Template tabs, each exposing one
form/footer; tab changes retain both drafts. Selecting a template from the
header opens this sheet without a write. Confirmation keeps the existing
create and instantiate commands separate. Template overrides are limited to
name, site, responsible and planned start; inherited fields never become
additional patch requests. Failures remain inline in the active form.

The detail contributes a native paginated Spartan tab list with the `line`
variant to the page header, in a stable horizontal order with a named tablist.
The first tab reads Work; its existing `overview` URL value remains valid.

**The detail page's rail tab is addressable the same way.** `?tab=` binds to
`InterventionDetailPage.tab`, seeds `activeLinkedTab` through a
`linkedSignal`, and is written back by `setLinkedTab` with
`queryParamsHandling: 'merge'` and `replaceUrl: true` — dropped entirely on
`overview` so the default URL stays clean. It exists because the Changes tab is
where a reviewer decides: without it, "look at the proposed changes on FG-142"
was not a link and every reload threw the reviewer back to Overview. Like
`?view=`, it is not a history entry.

`Board` (`@shared/board`) and `InterventionCalendar` (`ui/components/`) are
presentational components `InterventionsPage` feeds through inputs and reads
back through outputs — neither injects a store or calls a service
(`ARCHITECTURE.md` §10.3); the page decides whether to call
`InterventionStore.transition` on a Board move, and owns the
`InterventionCalendarStore` load the Calendar tab drives. The Board uses the private page-scoped
`InterventionBoardStore`: each status owns its page, total, loading and error state,
independent of the list cache. The Calendar owns a separate bounded date-window
cache through `InterventionCalendarStore`.
`calendarMonth` starts `null` and the load effect no-ops until
`InterventionCalendar` reports its first anchor, which only happens once the
component exists — behind `@defer`, on the Calendar tab's first
activation — so opening the page on List or Board never fetches the
calendar's window.

**Which of the filter bar's nine fields each tab actually applies** is no
longer route `data` — with one page and no child routes to declare it on, it
is `INTERVENTION_VIEW_HONOURED_FILTER_KEYS`, a `Record<InterventionView, …>`
local to `InterventionsPage` (rule of three: three consumers, all on the
page). **13.0 retired the "listed disabled, with the reason beside it" chip**
(`CollectionFilterField.unavailableReason`, the `opacity-60`/`hlmTooltip`
inert-chip treatment): each tab's own catalog (`offeredFilterFields`) now
contains only its honoured fields — the "+ Filter" menu never lists an
unhonoured one, and `honouredActiveFilterKeys` (not the wider
`activeFilterKeys`) drives the bar's own `activeKeys` input, so a field the
active tab does not honour renders no chip at all here, not even a disabled
one. **Switching tabs never drops an unhonoured narrowing from the URL** —
the value is neither applied (each tab's own query builder — `boardFilters`,
`toCalendarFilters` — already reads only the fields it declares, independent
of what the bar renders) nor lost: it is still in the URL and reappears the
moment the operator returns to a tab that honours it. The "Filters" toggle's
badge counts only `honouredActiveFilterKeys`, so it never announces a
narrowing that is not in force here. The List honours all eight; the
Board honours every field except `status` (its columns are the narrowing);
the Calendar honours only `status`, `type`, `site` and `responsible`
(`InterventionCalendarFilters`'s own `Pick`); Recurrences honours none — it
carries no filter bar, no toggle, and no toolbar at all.

`dueWindow` is the ninth field, and it exists as a chip for a correctness
reason rather than a cosmetic one: the KPI strip's tiles and the Today page
deep-link to `?due=overdue`, and while that key had no catalog entry it
counted for nothing — no chip, no badge, no "Clear filters" — so a URL
carrying it narrowed the list with nothing on screen to say so and no way
back except editing the address bar. It overlaps `dueRange` in intent (three
of its four windows are expressible as an upper bound); the two stay separate
fields because they are separate keys in `InterventionListFilters` and the
server treats `due=overdue` as a preset, not a bound.

- `/organizations/:organizationId/interventions` — the index page: a spartan
  `hlmTable` of the organization's interventions, grouped and paginated, row
  selection, and permission-gated bulk actions. `?create=1` opens the creation
  sheet on arrival and is consumed once, so the parent feature's landing page,
  and now the shared shell header, can offer "New intervention" as a primary
  action that actually starts the work.
  **Export is a server-side CSV** (API #99): `InterventionService.exportCsv`
  reads `GET /api/interventions/export` as a `Blob`, forwarding the accepted
  subset of the current question — `name`, `status`, `type`, `priority`,
  `site`, `responsible`, `due`/`dueAtAfter`/`dueAtBefore` — narrowed from the
  page's own filters by `buildInterventionExportOptions`
  (`utils/intervention-list-query/`). A filter the endpoint does not serve
  (`mine`/`member`, `label`, a planned-start bound) is silently left out of
  the request and the operator sees one toast when that narrows the file
  below the screen. The endpoint caps the collection at 50,000 rows and
  answers `422` with an RFC 7807 `detail` past it, which the page surfaces
  as-is by reading the (blob-shaped) error body back through `Blob.text()`.

  **Filters live in the URL** (5.2 — this flips the earlier "questions asked
  now, never persisted" stance): one query param per filter, raw ids for the
  IRI-valued ones, parsed and validated by
  `parseInterventionListFilters` / `serializeInterventionListFilters`
  (`utils/intervention-list-query/`, lifted to feature level when the board became its second consumer). A filtered
  list is therefore shareable, bookmarkable, and restored by the back button —
  an unknown or tampered param value parses as unfiltered rather than reaching
  the API. Sort, hidden columns and page size stay in the cookie
  (`InterventionListPreferencesService`) — presentation preferences, not
  questions; filters never enter the cookie. The `?create=1` contract is
  unchanged.

  **Segmented views (6.3)** sit above the toolbar as a single-select
  `hlm-toggle-group` — All / Overdue / Sent back / Awaiting review. A view is
  **derived from `filters()`, never stored**: `all` is `status=null &
dueWindow=null`, `overdue` is `dueWindow=overdue` with `status=null`,
  `sent-back` is `status=changes_requested` with `dueWindow=null`,
  `awaiting-review` is `status=submitted` with `dueWindow=null`; any other
  combination — a custom mix built from the filter bar — highlights none of
  the four rather than a misleading nearest one. Picking a view calls the
  same `applyFilter` path a chip's own select uses, so a view is a shortcut
  into the one filter contract, not a second state to keep in sync with it.

  **The toolbar and the filter bar (6.5–8.3 below) live on `InterventionsPage`
  itself (11.0); the tab selector renders in the dashboard shell's own header
  instead (13.0 — see "Tab switch" below).** Every mechanic this history
  describes — the chip shell, the operator vocabulary, the "+ Filter" menu,
  `dueRange`/`plannedStartRange` — is unchanged by the retirement of the
  routed shell that once carried them; only which tab renders below them, and
  which toolbar controls that tab's own toolbar carries, changed. Read "this
  page" throughout 6.3 through 8.3 as `InterventionsPage`.
  It additionally owns the table, its own Display popover (sort/columns),
  row/bulk actions, and the sheets/dialogs they open — all rendered inline,
  gated on `activeView() === 'list'`, with no `TemplateRef`-slot indirection
  to a separate shell component to keep in sync any more.

  **The filter bar (6.5) replaced the earlier popover-plus-read-only-chips
  pair with editable, Linear-style segmented chips** — the popover is gone.
  Since the phase-2 `collection-*` migration (`ARCHITECTURE.md` §8.5), the
  chip row itself is `app-collection-filter-bar` and its chip shell is
  `app-filter-chip`, both `@shared/collection-filters` — this feature was the
  reference implementation the shared bar generalized from, so the split
  below is what stayed feature-owned versus what moved. Each active
  narrowing still renders as one `app-filter-chip`: a field segment (icon +
  label), an operator segment, the field's own `hlm-select` — restyled
  flush into the chip, unchanged in behaviour — as the value segment
  (projected via `ng-content`, so `shared/` never imports
  `app-intervention-tag` or any intervention model), and a remove button,
  each separated by a hairline `border-border`. **Clicking the value segment
  reopens that field's selector in place**, which is the gain over the old
  popover: changing a value no longer means removing the chip and reopening
  a grid of seven selects to find the field again.
  A "+ Filter" menu lists only the fields not yet active and is now the
  bar's own concern; picking one fires the bar's `fieldPicked` output, which
  this page's `onFieldPicked` reacts to by setting `openFilterKey` — still
  page-owned, since it also gates which of this page's eight `ng-template`
  value controls (`#statusChip`, `#typeChip`, …) currently forces its own
  selector open. `#dueRangeChip` and `#plannedStartRangeChip` were once the
  two exceptions; since they moved to `app-collection-filter-date` /
  `app-collection-filter-date-range`, which wrap the picker's own
  `BrnPopover` behind the same `[state]`/`(stateChanged)` pair, every field
  auto-opens alike (8.1's gap is closed).
  `openFilterKey` is UI-only — which selector is
  expanded, never a narrowing's value — kept in sync with each template's
  own `hlm-select` through `onFieldPopoverStateChanged`, so the URL via
  `applyFilter` remains the only place a filter's value lives, and is also
  what the bar's `pendingKey` input reads to still render an empty chip for
  a field mid-pick. **Chips render in the order the operator picked them**,
  newest last — that memory (`filterOrder` before the move) is now internal
  to `CollectionFilterBar` itself, driven only by this page's `activeKeys`
  (`activeFilterKeys`, the eight fields currently non-null) and `pendingKey`
  inputs: a field a shared or reloaded URL already carried has no pick-order
  entry and sorts ahead of every picked one, in catalog order. `mine` keeps
  its own toggle chip outside this bar, as before, and the "Clear filters"
  button — the bar's own, generic — stays at the end.

  **Every chip's operator segment (8.0) is driven by
  `CollectionFilterField.operators` (`@shared/collection-filters`), the
  generic vocabulary a field declares from — `equals`, `notEquals`,
  `contains`, `greaterThan`, `between`, `isAnyOf`, … (`CollectionFilterOperator`).**
  `INTERVENTION_FILTER_FIELDS` (`ui/pages/interventions-page/options/`)
  declares `operators: ['equals', 'isAnyOf']` for six fields — `status`,
  `type`, `priority`, `site`, `responsible` and `label` (8.3) — so each of
  those six chips' operator segments now renders as a picker offering both,
  `equals` first as the default a freshly picked field opens on.

  **8.3 unbridled the six enum/IRI fields once the API caught up.**
  `fireguard-sso-api`'s `InterventionProvider` now reads `status[]=`,
  `type[]=`, `priority[]=`, `site[]=`, `label[]=` and `responsible[]=` as
  repeated values, OR-combined server side via `IN()` (`multiValue()`,
  reading `$query->all()[<field>]`) — the single scalar form (`status=draft`)
  still works unchanged, so an existing bookmark or e2e assertion built on it
  never breaks. `InterventionListFilters`' six properties are typed
  `T | readonly T[] | null` (`models/intervention-view/`) — a scalar means
  `equals`, a readonly array means `isAnyOf`; there is no separate operator
  field for these six the way `InterventionDueRangeFilter` carries one,
  because the value's own shape already says which operator is active. The
  page's `enumFieldOperator`/`enumFilterOperatorOverrides` resolve the
  operator a picked-but-not-yet-valued field should render, mirroring how
  `dueRangeOperator`'s own `linkedSignal` remembers a pending pick with no
  value yet. Each chip's value control switches between a plain `hlm-select`
  (`equals`) and an `hlm-select-multiple` (`isAnyOf`) accordingly.
  `InterventionListOptions` and `InterventionService.list` accept the same
  scalar-or-array shape per field, and `HydraApiService.buildParams`
  (`@core/api`) appends a readonly array as a repeated `key[]=` param — the
  one place any Hydra service gets that behavior, not reimplemented per
  feature. The URL round-trips a multi-value narrowing as
  comma-joined raw values (`?status=draft,planned`); a bare `?status=draft`
  still parses to the exact scalar `equals` shape it always has.
  `name` is the one field already confirmed `contains` server-side
  ("Case-insensitive partial match" — `InterventionListOptions`'s own JSDoc),
  but it is not a filter-bar field: it is `app-collection-search-box`'s own
  free-text `?q=` narrowing (`toolbarStart`), a distinct UI element with its
  own debounce and its own visible input, so there is no chip whose operator
  label to correct — see 6.5's opening paragraph for that split. `notEquals`,
  `isEmpty`/`isNotEmpty` and `contains` on any of the six remain
  **unsupported without a further backend change** — only `equals`/`isAnyOf`
  are wired.

  **`dueRange` (8.1) is the framework's first genuinely multi-operator,
  fully-wired field** — real proof, not a modeled-but-inert vocabulary.
  It replaced the legacy preset select as this catalog entry's own field
  (key renamed `dueWindow` → `dueRange`, same `fieldLabel`/icon), declaring
  `operators: ['greaterThan', 'lessThan', 'between']`, each mapped to the
  API's own already-existing `dueAtAfter`/`dueAtBefore` bounds
  (`utils/intervention-list-query/`,
  `InterventionListOptions`'s own JSDoc) — no backend change, no unverified
  param. `greaterThan` sends `dueAtAfter` alone, `lessThan` sends
  `dueAtBefore` alone, `between` sends both.

  The chip's operator select therefore actually renders (`FilterChip` only
  offers a picker once a field declares more than one operator) — the first
  one to. Its labels read "after"/"before"/"between" rather than the generic
  registry's "greater than"/"less than", through the per-field
  `operatorLabels` override `CollectionFilterField` now also carries
  (`@shared/collection-filters`, opt-in, every other field unaffected): a
  date-flavoured operator wording without a second label registry to keep in
  sync with the generic one.

  The value control switches shape with the operator — `InterventionsPage`
  keeps a `dueRangeOperator` `linkedSignal` over `filters().dueRange`'s own
  operator (defaulting to `greaterThan`, the field's first declared entry,
  the moment "Deadline" is picked and carries no value yet) and a `@switch`
  in `#dueRangeChip` renders one `app-collection-filter-date` for
  `greaterThan`/`lessThan` or one `app-collection-filter-date-range` for
  `between` (`@shared/collection-filters`, which own the picker plumbing —
  no vendored code touched, no hand-rolled calendar).
  Picking a different operator before a value is chosen only swaps the
  control; picking one **after** a `dueRange` narrowing is already applied
  drops it (`InterventionsPage.onDueRangeOperatorPicked`) rather than
  keeping a stale bound active under a control that no longer shows it.
  That gap is closed: `app-collection-filter-date(-range)` drives the
  picker's public `popover` view child from `[state]`, deferred through
  `afterNextRender` — without that defer the calendar opens but the CDK's
  own Escape and outside-click listeners never attach, leaving it
  unclosable. Picking "Deadline" now auto-opens its calendar exactly as the
  other fields auto-open their selector.

  **`dueRange` is independent of the legacy `dueWindow` preset the KPI
  strip's overdue tile link and the Today page's deep link still drive**
  (`?due=overdue` and friends, `resolveDueWindow`,
  `INTERVENTION_DUE_WINDOW_OPTIONS`). The forward windows resolve into the
  same `dueAtAfter`/`dueAtBefore` API bounds, and when a forward window and
  a "Deadline" chip are active at once `buildInterventionListOptions`
  **tightens rather than overwrites** — the later `dueAtAfter` and the
  earlier `dueAtBefore` win, so the two narrowings combine instead of one
  silently discarding the other. **`overdue` resolves to the server-side
  `due=overdue` preset instead of a bare upper bound**: the backend pairs
  the past-due check with the terminal-status exclusion the statistics
  endpoint uses, so the KPI tile's count and the list it opens agree — a
  bare `dueAtBefore=now` also matched published and abandoned records the
  tile never counted. The preset travels alongside any `dueRange` bounds
  and the backend composes them. `dueWindow` was deliberately left out of
  `dueRange`'s own operator set: collapsing "Overdue"'s live,
  request-time-resolved bound into a frozen `dueBefore=<timestamp>` URL
  param would make a bookmarked "Overdue" link stop tracking "now" on
  reload — a real regression the `?due=overdue` e2e coverage
  (`e2e/organization/interventions-list-filters.spec.ts`) would have
  caught. Keeping the two fields separate cost nothing: neither the KPI
  tile link nor the Today page needed to change.

  The toolbar's own segmented-views toggle group (`hlm-toggle-group`,
  "All"/"Overdue"/"Sent back"/"Awaiting review") was removed — the KPI
  strip's overdue and awaiting-review tiles already link into the same
  `?due=overdue`/`?status=submitted` contract, so the toggle group
  duplicated a control the strip already offered. `dueWindow`,
  `resolveDueWindow` and the `due=` query param are unaffected: they are
  read from the URL exactly as before, only the in-page control that used
  to write `status`/`dueWindow` from a click is gone. A custom combination
  is still reachable through the filter bar's own "Status" and "Deadline"
  chips.

  **`plannedStartRange` ("Planned start", 8.2) is the second wired
  multi-operator field, an exact mirror of `dueRange`'s shape** — same
  `operators: ['greaterThan', 'lessThan', 'between']`, same `operatorLabels`
  override (reusing the same "after"/"before" ids, `intervention.list.filterDateRangeAfter`/`filterDateRangeBefore`,
  since the wording is field-agnostic — `between` needs no override either),
  same `app-collection-filter-date`/`app-collection-filter-date-range` value
  control switched by a `plannedStartRangeOperator` `linkedSignal`. It maps to the API's own
  already-existing `plannedStartAtAfter`/`plannedStartAtBefore` bounds
  (confirmed read by `InterventionProvider`, no backend change), serialized
  as `?plannedStartAfter=`/`?plannedStartBefore=` — distinct URL params from
  `dueRange`'s `dueAfter`/`dueBefore`, since the two narrow different
  timestamps and must combine (not collide) when both are active.
  **Deliberately not generalized into a shared type or a shared parser**:
  `InterventionPlannedStartRangeFilter`
  (`models/intervention-view/intervention-planned-start-range-filter.type.ts`)
  duplicates `InterventionDueRangeFilter`'s shape verbatim rather than
  deriving from a common generic, and `parsePlannedStartRange` duplicates
  `parseDueRange` rather than sharing one parametrized function — two
  consumers do not yet justify that abstraction (`ARCHITECTURE.md` §2.9); a
  third date-range field would. Unlike `dueRange`, no legacy preset ever
  wrote `plannedStartAt*` bounds, so `buildInterventionListOptions` sets them
  directly — no `laterOf`/`earlierOf` tightening applies here, because there
  is nothing to tighten against.

  **The bar is collapsible, toggled by a "Filters" button beside "Columns"
  in the toolbar's `toolbarEnd`** (`app-collection-filter-toggle`,
  `@shared/collection-filters`) — the same reference implementation the
  other three collection pages' toggle now shares. The button carries an
  `hlm-badge` count of `activeFilterKeys().length`, exactly the shape the
  earlier popover trigger's badge used, and `filtersVisible` (seeded by
  `initialCollectionFilterBarVisibility`) defaults to expanded the moment
  the page mounts with at least one URL-carried filter, so a shared
  `?status=…` link is never silently narrowed behind a collapsed bar — once
  the operator has toggled it, later filter changes never force it open or
  shut again. `filtersVisible` is presentation-only, never serialized: the
  bar itself mounts or does not exist, exactly like `openFilterKey`, never a
  CSS-hidden instance. The toggle button is unrelated to the "+ Filter" menu
  inside the bar, which still only ever adds a field to the narrowing.

  **Two catalog primitives were evaluated for this bar and rejected; do not
  reopen either without new evidence.** `hlm-button-group` cannot back the
  chip shell: its join CSS collapses borders and radii between **direct**
  children only, and a value segment's visible box (`hlm-select-trigger`)
  sits one level inside the `hlm-select` host it needs for its CDK wiring, so
  the group's `[&>*]` rules never reach it — the override classes flattening
  that segment are load-bearing, not a missed primitive. `hlm-combobox` was
  evaluated for the three organization-scoped fields (site, responsible,
  label), whose option lists can grow long enough to want a search box: it
  shares `hlm-select`'s `state`/`stateChanged` contract, but in this build its
  closed-state `hlm-combobox-input` renders its `placeholder` instead of an
  already-selected value's label, so a shared `?site=…` URL shows a chip
  reading "Site" rather than the site's name. Fixing that is vendored-code
  work in `shared/ui/combobox` affecting every consumer, not a change this
  page can make alone.

  **The parent feature's Today page deep-links its three collection-backed
  queues' "See all" buttons into this narrowing**, reusing
  `serializeInterventionListFilters`'s own param names: overdue →
  `?due=overdue`, sent back → `?status=changes_requested`, awaiting review →
  `?status=submitted`. The unsynced queue has no server-side filter to
  deep-link to, so its "See all" stays absent. **The Overdue view is broader
  than Today's overdue queue**: the view is every non-terminal status past
  due (the server-side `due=overdue` preset — past `dueAt`, excluding
  `published`/`abandoned`, the statistics endpoint's own definition), while
  `OrganizationTodayStore`'s `overdue` queue narrows to
  `planned`/`in_progress` — a past-due `submitted` or `changes_requested`
  intervention shows in the Overdue view but not in the Today queue of the
  same name. Do not conflate the two when reasoning about either.

  **The page is a full-height console (6.3): nothing scrolls except the table
  rows.** `InterventionsPage`'s host is `flex min-h-0 flex-1 flex-col` (not
  `block`), so `#interventions` — itself `flex min-h-0 flex-1 flex-col` —
  receives a real, bounded height from `DashboardLayout`'s routed-content
  wrapper rather than growing to its own content and pushing the scroll onto
  the shell. That wrapper (`dashboard-layout.component.html`) carries a
  matching `min-h-0` for the same reason: a flex item's automatic minimum
  size defaults to its content size, and without `min-h-0` at every level the
  chain silently breaks and the browser falls back to scrolling the whole
  page instead of just the table. `InterventionTable`'s own `h-full`
  scrollable shell then fills exactly what the header, views row,
  toolbar, chips row and footer leave. The sticky `thead` is `sticky top-0`
  on `hlmTableContainer` itself (`h-full overflow-y-auto`), not on a separate
  outer wrapper — `overflow-x-auto` (needed for wide tables) forces
  `overflow-y` to compute as `auto` too regardless of what is written, so a
  wrapper split across two nested divs makes the sticky header pin to the
  wrong (non-scrolling) ancestor. Changing any of these three files without
  the others reintroduces page-level scrolling or an unstuck header.

- `/organizations/:organizationId/interventions/board` — the Kanban tab over
  the exact same dataset the List tab renders, resolving PRODUCT.md's "List /
  Board / Calendar over one shared dataset" promise for interventions
  (`Board`, `@shared/board`, fed by
  `InterventionsPage`). The URL is a functional `redirectTo` onto
  `/interventions?view=board` (11.0) — registered **before** `:interventionId`
  in `interventions.routes.ts`, a literal segment must be matched ahead of the
  param route, or every visit would resolve as a detail page for an
  intervention id of `"board"`. `Board` shares
  `InterventionsPage`'s own `InterventionStore` instead of a second copy of
  the dataset. Same permission gate as the list (inherited from the outer
  pathless parent).

  **View switch.** The native toggle group sits before the collection toolbar.
  `InterventionsPage.switchView` merges `?view=` into the URL. Filter values survive
  view changes; each view applies only its documented subset. The Board ignores
  a stored status filter because its columns already partition the statuses.

  **Columns and data.** One column per `InterventionStatus`, in workflow order
  (`INTERVENTION_BOARD_COLUMNS`), each labelled and counted through the
  existing `models/intervention-tag/` registry — never a second status
  vocabulary. `published` renders as a column (an intervention does end up
  there). A publish request opens the detail confirmation rather than issuing a plain status PATCH.
  `InterventionBoardStore` owns independent column queries, each using the existing list
  endpoint with `status`, pages of 30, exact server totals and a local retry state.
  Loading another column never replaces the list page or sibling columns. The Board applies filters
  (`status` excluded, via `boardFilters`) the incoming URL already carries,
  and shares the page's own eight-chip filter bar with the List and the
  Calendar — its entry in `INTERVENTION_VIEW_HONOURED_FILTER_KEYS` omits only
  `status`, so the Board's own filter catalog never lists it and a `status`
  narrowing left active from the List renders no chip here (13.0).

  **Generic board and visual layout.** `shared/board` owns `Board`, its typed
  `BoardColumn` / `BoardItem` / `BoardMove` contracts, the `appBoardCard`
  template marker, horizontal navigation and drag behavior. It imports no
  feature code. `InterventionsPage` owns status ordering, grouping, labels,
  pending flags and move policy, and projects `InterventionBoardCard` through
  the typed slot. `appBoardColumnHeader` renders `InterventionTag` as a plain
  icon-and-label heading, reusing the feature registry’s status icons and colors. The domain card and its view model remain feature-owned.
  Cards omit normal priority, render labels without badge outlines and group the
  responsible member and deadline in one compact row without a footer surface.
  Column headers stay visible
  while their card lists scroll vertically; horizontal scrolling stays inside
  the board. Column navigation advances whole columns, respects reduced motion
  and has 44px phone targets. Edge fades do not cover cards. Board instance
  ids isolate drop zones; resize observation handles changing column counts
  and deferred tab visibility and is disconnected on teardown.

  **Drag-drop legality — one function, two call sites.**
  `isInterventionBoardMoveAllowed` (`utils/intervention-board-move/`) is a
  boolean facade over `resolveInterventionBoardMoveReason`: the target must be in the
  card's server `allowedTransitions`. Execute transitions additionally require the
  current member to be the responsible or a participant, matching the API's membership
  guard; unresolved identity denies execution. Submit and withdraw respectively use
  `allowedActions.canSubmit` and `allowedActions.canWithdraw`. Planning and review
  transitions do not inherit the execution membership restriction.
  Both the page-supplied `canMoveBoardItem` policy used by Board
  and each card's own "Move to…" menu (the
  keyboard/AT path) use this resolver, so the two can never
  disagree about what is legal. During an active drag, Board marks every destination from that same current policy:
  allowed columns offer a labeled drop hint; forbidden columns dim their contents
  and show a prohibition icon and the feature-owned blocker before release. Shared
  Board accepts an optional `moveBlockedReason` callback and otherwise keeps its generic hint.
  The source stays neutral.
  Releasing outside an accepted column emits no move, even after hovering a valid target.
  A card whose id is in
  `store.transitioningInterventionIds()` is drag-disabled and its menu
  disabled entirely — its cached `allowedTransitions`/`revision` are stale
  mid-flight (`InterventionStore.transition`'s own doc already anticipates
  board drag-drop firing several transitions in quick succession). A drop or
  a menu pick emits `Board.moveRequested`; `InterventionsPage` translates it
  through `onBoardMoveRequested` to `applyTransition` — the same handler the List table's own row menu calls —
  is the one place that actually calls
  `InterventionStore.transition({ id, status, revision })`, rechecking the
  feature move policy before dispatch. The store's existing optimistic patch,
  `If-Match` revision and rollback-plus-toast on failure serve the board
  exactly as they serve the list and detail pages.

  **Accessibility.** Drag is an enhancement, never the only path: every card
  carries a "Move to…" menu — the same pattern `InterventionTable`'s row menu
  uses, including a visible, aria-linked reason for a gated
  move — as the keyboard/AT equivalent, and the card's title is a real
  `routerLink` to the detail page. A visually-hidden `aria-live="polite"`
  region announces the requested move without claiming server success. Focus
  returns to the card title after the optimistic update recreates it.

- `/organizations/:organizationId/interventions/calendar` — the month-grid
  tab over the same dataset, the third and last leg of PRODUCT.md's "List /
  Board / Calendar" promise (`InterventionCalendar`,
  `ui/components/intervention-calendar/`, fed by `InterventionsPage`). The
  URL is a functional `redirectTo` onto `/interventions?view=calendar` (11.0),
  registered before `:interventionId`, same reason the Board's is. **Wakes,
  rather than rebuilds, a dormant pair**: `InterventionCalendarStore`
  (component-scoped, provided on `InterventionsPage`) and
  `InterventionService.listCalendarWindow` had shipped with no page driving
  them; both were already current-standard (named `loadCallState`,
  `toStoreError`, `tapResponse`, a dispatched failure event) and needed no
  refit. Unlike the Board, this tab does **not** share `InterventionStore`:
  the List/Board pair reads one server page, the calendar reads a bounded
  date window — an incompatible shape for the same entity cache. The
  component itself only mounts behind `@defer`, on the Calendar
  tab's first activation, and reports its displayed anchor to the page
  through `monthChanged` — `InterventionsPage`'s own load effect stays gated
  on that anchor being non-`null`, so opening the page on List or Board never
  fetches this window.

  **Placement anchor.** Each intervention is placed on the day of its
  schedule anchor — `plannedStartAt`, falling back to `dueAt` — the exact
  anchor `listCalendarWindow` already fetches by (its own JSDoc: a single API
  range filter cannot express that fallback, so the window is fetched as the
  union of two bounded queries, one per field, de-duped by id;
  over-fetching a few days at the grid's edges is harmless). An intervention
  with neither bound set renders nowhere.

  **Reuse, not a second month grid.** The grid is `@shared/calendar`'s
  `Calendar`, used read-only and unmodified — a genuinely domain-agnostic
  shared concept (`ARCHITECTURE.md` §2.7) already established by
  `organization/features/calendar`'s own `CalendarPage`, and reused here
  exactly the same way (`showToolbar="false"`, `InterventionCalendar` supplies
  its own Today/prev/next band). What is **not** reused across the feature boundary
  is the row shape: `shared/calendar` must never import an intervention
  model, so `InterventionCalendarEntryList`
  (`ui/components/intervention-calendar-entry-list/`) is a feature-local
  mirror of `organization/features/calendar`'s own `CalendarEntryList` — one
  component, rendered twice (the selected day's side panel on desktop, each
  agenda group's rows on mobile), the same responsive split
  `CalendarPage` established. This is the feature's **second** month-grid
  consumer, not its third — extracting a shared entry-row component was
  evaluated and declined (`ARCHITECTURE.md` §2.9): two consumers do not yet
  justify it, and the row shapes already differ (an intervention row has no
  Edit/Delete affordance, a feed row does).

  **Filters.** Every narrowing the URL carries round-trips through
  `InterventionsPage` — unlike the Board, `status` travels too: the calendar
  has no columns for it to conflict with, so narrowing the month to one or a
  few statuses is a legitimate way to read it. `priority`, `label`, `due`,
  `dueAfter`/`dueBefore` and `plannedStartAfter`/`plannedStartBefore`
  round-trip in the URL (so switching away and back preserves them) but are
  **not** sent to the store: `InterventionCalendarFilters` is a `Pick` of
  `status`/`type`/`site`/`responsible` only, and the visible window already
  is the date filter, so a second date narrowing would fight it rather than
  combine with it. `mine` is **not** sent to the server either: the store
  resolves the signed-in member's IRI once (`currentMemberIri`, passed down as
  an input) and `InterventionCalendar.visibleInterventions` filters the
  loaded window to it client-side — exactly the split
  `InterventionCalendarState`'s own doc already described before this
  component existed. `InterventionsPage`'s own
  `INTERVENTION_VIEW_HONOURED_FILTER_KEYS` entry for `calendar` declares
  exactly the four fields above; `priority`, `label` and both date-range
  fields are simply absent from the Calendar's own filter catalog (13.0), so
  neither the "+ Filter" menu nor an active chip left from another tab
  renders for them here — the value stays in the URL, unapplied, and
  reappears as a chip the moment the operator returns to a tab that honours
  it.

  **Overflow.** The grid's own per-day chip cap never hides an entry from the
  reader: selecting a day always lists every one of its entries in the panel
  or agenda group below. When a day holds more than the grid's cap shows, its
  entry list additionally offers a "See all N in list" link, narrowing the
  List view to that single day via the existing `dueAfter`/`dueBefore` filter
  contract. **Stated trade-off**: an intervention placed on the grid by
  `plannedStartAt` alone (no `dueAt` landing on that day) will not appear in
  the linked list, since the list has no "planned start equals this day"
  shortcut of its own — accepted rather than sending both bounds, which would
  AND-narrow instead of matching either anchor.

  Browser-only loading, the same reason `organization/features/calendar`'s
  own page is: the window read is a dated, authenticated read that would
  immediately refetch after hydration (`ARCHITECTURE.md` §12.5-3).

- `/organizations/:organizationId/interventions/:interventionId` — the detail
  workspace, described below. Mounted as a second child of the same pathless
  parent, so `InterventionStore` survives list ↔ detail navigation and the
  detail page's prev/next walks the order the list established, with no second
  fetch. **Creating from a template is a first-class path through the same
  sheet**, not a separate flow: when the organization has intervention
  templates (`GET /intervention-templates`), the sheet offers a "start from a
  template" picker above the manual guided-creation form; confirming a pick
  calls `InterventionStore.instantiateFromTemplate`
  (`POST /intervention-templates/{id}/instantiate`, no override payload) and
  ends at the exact same navigate-to-draft contract as a manual `create` —
  see `createdInterventionId` below. `interventionTitleResolver` is registered as `title` **only**:
  `BreadcrumbService` falls through to `snapshot.title` when `title` is a
  `ResolveFn`, so one invocation serves both the document title and the crumb.
  The resolver answers synchronously — cached name, or a neutral label while
  seeding the active-intervention fetch fire-and-forget — so activation never
  waits on the network (first-order on slow field connections) and the page
  paints its own skeleton; once the workspace loads, the page re-sets the
  document title through `TitleService`, which also refreshes the crumb.

  **"Duplicate" is a prefill of the same creation sheet, never a server-side
  copy.** The list row menu and the detail page's overflow menu (gated on
  `canPlan`, any status — duplicating an abandoned intervention is
  legitimate) both build an `InterventionDuplicatePrefill`
  (`buildInterventionDuplicatePrefill`, `utils/intervention-duplicate-prefill/`)
  from the source `InterventionOutput`: name, type, priority, site and
  responsible only. It **never** carries `status`, the planned window
  (`plannedStartAt`/`dueAt`) or `reviewNote` — a duplicate opens as a fresh
  draft, not a copy of the source's lifecycle, and ends in the exact same
  `create` call a manual submission does. The detail page cannot open the
  list's own sheet directly, so it hands the prefill to
  `InterventionStore.pendingDuplicatePrefill` and navigates to the list with
  `?create=1`; the list page consumes and clears it once
  (`clearPendingDuplicatePrefill`), the same one-shot handoff shape as
  `createdInterventionId`.

</details>

## Intervention state reference

The owner contract is [State and Data Access](../../src/app/features/organization/features/interventions/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

Stores:

- `InterventionStore` — provided on the pathless parent route in
  `interventions.routes.ts` (not on the list page), so it survives list ↔
  board ↔ detail navigation — the list and the Board render the exact same
  loaded entities, each calling `load` with its own options (the board's
  omitting `status`). Intervention list and creation (normalized entities +
  request state). `load` fetches **exactly one server page** — `page`/`itemsPerPage`
  travel in the options, the entities are replaced by that page, and
  `totalInterventions` carries the server's `totalItems` for the paginator. The
  former 500-item accumulation and its `isListCapped` notice are retired:
  pagination, filtering (including `priority`, `site`, `responsible`) and
  sorting are server-side end to end.
  `transition` applies a single status change optimistically (entity patch →
  PATCH with `If-Match` → merge fresh output on success, rollback +
  `transitionFailed` toast event on error); `assignResponsible` (5.2) hands the
  responsible over with the same optimistic shape and its own
  `assignSucceeded`/`assignFailed` events — `mergeMap`, like `delete`, so a
  bulk assignment fans out per row with per-row rollback, driven from the list
  through `ui/dialogs/intervention-assign-dialog` (presentational; one dialog
  serves the single-row and bulk paths); `orderedIds` exposes the current
  entity order for the detail page's prev/next — **which therefore walks only
  the loaded page**: prev/next stops at the page bounds, an accepted trade-off
  of server paging. Extending it with an edge-fetch (`loadNextPage`) was
  considered and deferred (5.3): the exact query context now lives in the
  list URL's filter params, which the detail route does not carry, so a fetch
  from the detail page could silently walk a different collection than the one
  the operator filtered. Revisit only with a mechanism that carries the list
  query context across the navigation. `delete` removes the cached
  entity and decrements `totalInterventions` on success; it uses `mergeMap` (not
  `switchMap`) so a bulk selection can delete several concurrently, each keyed by
  its own request and each dispatching its own `deleteSucceeded` / `deleteFailed`
  toast event — there is no aggregate "N deleted" outcome. **This is the only
  delete path wired to the UI** (see Invariants).
  `instantiateFromTemplate` (4.3) instantiates a draft from a template through
  `InterventionTemplateService`, in its own `instantiateCallState` (the
  endpoint returns only `{ interventionId, number }`, not a full
  `InterventionOutput`, so it cannot reuse `createCallState`'s type).
  `createdInterventionId` is the single computed the creation sheet's
  close-and-navigate effect watches — it resolves from whichever of
  `createCallState`/`instantiateCallState` last succeeded, so a manual create
  and a template instantiation reach the same detail page through one signal.
- `InterventionWorkspaceStore` — component-scoped (provided in
  `InterventionDetailPage`); the active intervention workspace (intervention,
  work items, changes, issues) with online/offline mutations. Async state is held
  as `loadCallState` (the workspace fetch), `activityCallState`, and **one named
  call state per write concern** (`transitionCallState`, `updateDetailsCallState`,
  `createWorkItemCallState`, `workItemWriteCallState`, `deleteWorkItemsCallState`,
  `rejectChangeCallState`, `deleteCallState`, `addCommentCallState`,
  `attachmentWriteCallState` for uploads and `attachmentDeleteCallState` for
  deletes — split so one settling never clears the other's pending state), plus
  per-row pending sets (`pendingWorkItemIds`, `pendingChangeIds`,
  `pendingAttachmentIds`) for the concurrent `mergeMap` writes; `loading`,
  `saving` and `error` are derived over them (`error` deliberately excludes
  `addCommentCallState` — a rejected comment renders inline in the composer, and
  a failure shown where it happened must not render again at the top of the
  page). `load` blanks the whole workspace **including the activity timeline**
  before fetching — the store survives prev/next navigation, and a stale
  timeline under a fresh header attributed one intervention's history to
  another — which is right on entry and wrong afterwards, so **`reload` exists
  for a refresh that must not flash the page to a skeleton** — publication uses
  it. `loadFailed` distinguishes a failed _fetch_ from a failed _write_, which
  is what lets the detail page offer a retry only where retrying repairs
  anything.

  Also owns the activity timeline (`activities`, `loadActivities`,
  `loadOlderActivities`, `addComment`). The API sorts `createdAt` **ascending**,
  so page 1 holds the oldest entries: `loadActivities` reads page 1 for its shape
  (`totalItems`, and the server's page size, which the client is never told),
  then fetches the **last** page and discards page 1 when there is more than one.
  Without that, the timeline showed a months-old history as the whole record and
  `metaLine()` reported the first event ever as the latest thing that happened.
  `activityOldestPage` tracks how far back the loaded window reaches, driving
  `hasOlderActivities` and letting `loadOlderActivities` prepend page by page.

- `InterventionLinkedResourcesStore` — component-scoped (provided in
  `InterventionDetailPage`); backs three of the detail page's left-rail tabs
  (Facilities / Equipment / Inspections — the fourth, Overview, reads
  `InterventionWorkspaceStore` like the rest of the page always has). Three
  independent named call states (`facilitiesCallState`, `equipmentCallState`,
  `inspectionsCallState`), each fetched through the owning sibling feature's
  `listByIntervention` on that tab's first activation — never eagerly with
  the rest of the workspace — and cached per intervention: a second
  activation of an already-loaded, non-invalidated tab is a no-op, and switching to a
  different intervention (prev/next) resets all three to idle so the next
  activation refetches. See `### The rail is not the retired workspace tabs`
  below.

  `listByIntervention` is always called with an explicit `{ page, itemsPerPage:
LINKED_RESOURCES_PAGE_SIZE }` (30) — omitting `itemsPerPage` used to fall
  back to the server's own default page size of 30, which silently truncated
  any intervention linking more than 30 facilities, pieces of equipment, or
  inspections with no indication to the user that more existed. Each resource
  tracks its own `<resource>Page`, `<resource>TotalItems` and
  `<resource>LoadingMore`; `<resource>HasMore` compares the two to drive the
  tab's "Show more" button. `loadMoreFacilities`/`loadMoreEquipment`/
  `loadMoreInspections` fetch the next page and **append** it onto the rows
  already in the call state rather than replacing them, a no-op while that
  resource's own page is already in flight; a failed `loadMore` leaves the
  rows already on screen untouched.

- `InterventionPublicationStore` is component-scoped and separates publication launch,
  restore and observation. `InterventionPublicationService.start` owns the POST;
  `observe` owns bounded polling and `checkStatus` performs a single read. Persist
  the identifier immediately after acceptance, scoped by account, organization and
  intervention. A read failure or timeout retains the last known state and never
  authorizes another POST. An initial response lost without an identifier is unknown;
  recovery refreshes the intervention. Only confirmed completion emits `publishSucceeded`.
- `InterventionOperationsStore` is component-scoped. The local operations sheet reads
  one intervention, exposes per-operation failures and requires explicit confirmation
  for a conflict retry or discard. It must never retry other interventions' conflicts.
- `InterventionCalendarStore` — component-scoped (provided in
  `InterventionsPage`, since only a page may inject a store — 11.0); the
  interventions inside a bounded date window. One `load(request)` —
  `organizationId`, `window` (inclusive `after`/`before`), an optional
  `InterventionCalendarFilters` narrowing — driving one `loadCallState`, plus
  `currentMemberIri`, resolved once per organization and reused across window
  refetches (`OrganizationMemberService.getCurrentProfile`, degrading
  gracefully to a disabled "Mine" scope on failure rather than surfacing an
  error). Woken by 10.0's Calendar view after shipping dormant: it needed no
  refit into current standards, since it already used named `loadCallState`,
  `toStoreError` before `errorCallState`, and a dispatched `loadFailed` event
  on a genuine fetch failure.
- `InterventionStatisticsStore` remains a statistics slice over
  `InterventionService.statistics`; the collection route no longer provides,
  injects or loads it. Neither the KPI strip nor Analysis mounts on this page.

- `InterventionLabelStore` — component-scoped (provided in
  `InterventionDetailPage`); CRUD over the organization's intervention label
  catalog (`InterventionLabelService`) via `withEntities`, backing
  `ui/dialogs/intervention-label-manage-dialog`. Never writes to
  `InterventionPlanningOptionsStore`, which still owns the labels a picker
  offers — the page reloads that store's options after a mutation succeeds.
- `InterventionRecurrenceStore` — component-scoped (provided in
  `InterventionsPage`); CRUD over the organization's recurring intervention
  schedules (`InterventionRecurrenceService`) via `withEntities`, backing the
  **Recurrences tab** of `InterventionsPage` (`?view=recurrences`). The tab
  renders `InterventionRecurrenceTable` (`ui/tables/`) full-width; the table
  reports edit/delete/toggle intents; each row groups edit and delete under the
  standard ellipsis menu. Recurrence creation lives in the page header's split
  creation menu, while create and edit happen in
  `ui/sheets/intervention-recurrence-sheet` (540px, bottom drawer below `sm`),
  which hosts the Signal Forms `ui/forms/intervention-recurrence-form` and
  confirms a dirty close through `@shared/unsaved-changes`; delete confirms in
  `ui/dialogs/intervention-recurrence-delete-dialog`. Only the page talks to
  the store. The list loads once per organization, on the tab's first activation.
  Changing organization clears rows, request states and page dialog targets, cancels obsolete
  reads and invalidates accepted writes' results, including A-B-A navigation. Accepted writes
  finish independently: update and delete share one lock per recurrence id, while creation
  admits one request per organization generation. `updateCallStates`/`removeCallStates` and
  `savingIds`/`removingIds` expose each row's state. Mutation events carry `recurrenceId` for
  update/delete; the page closes only the surface awaiting that operation on that target.
  Opening or closing a surface clears its wait, and failures preserve its draft.
  `create`/`update`/`remove` patch the entity
  collection from the response rather than reloading the list, so the
  server-authoritative `nextOccurrenceAt` lands without a second round trip. A
  materialized intervention carries no back-reference to the recurrence that
  produced it.
  `InterventionWorkspaceStore.assignTeam` (own `assignTeamCallState`) snapshot-expands
  one organization team's active members into the intervention's participants —
  union, deduped, never a replace — via `InterventionService.assignTeam`. Online-only,
  no offline queue: team membership at request time cannot be meaningfully replayed
  later. Results and failures belong to the captured workspace generation; an old assignment
  cannot change a replacement workspace, including an A-B-A visit. Commands on the active
  workspace share one assignment lock without cancelling accepted writes in older contexts.
  A `409` (the intervention left its mutable window) silently reloads the
  workspace instead of surfacing a stale error.

Data-access (transport boundary — `data-access/`):

- `InterventionService` — HTTP API service (`HydraApiService`). Also owns the
  intervention activity timeline (`listActivities`, `addComment`), and the
  whole-organization statistics snapshot (`statistics`).
- `InterventionLabelService` — HTTP API service (`HydraApiService`) for the
  organization-scoped intervention label catalog (CRUD); labels are embedded
  as `InterventionLabelSummary` on `InterventionOutput.labels`.
- `InterventionTemplateService` (4.3) — HTTP API service (`HydraApiService`)
  for the organization-scoped intervention template catalog: `list` (feeds
  `InterventionPlanningOptionsStore.loadCreationOptions`'s `templates`) and
  `instantiate` (feeds `InterventionStore.instantiateFromTemplate`).
- `InterventionRecurrenceService` — HTTP API service (`HydraApiService`) for
  the organization-scoped recurring intervention schedule catalog (CRUD),
  backing `InterventionRecurrenceStore`.
- `InterventionOfflineService` — IndexedDB persistence façade + cross-cutting purges (public entry point). Delegates to its internal collaborators:
  - `InterventionDatabaseService` — IndexedDB connection/schema, CRUD primitives, owner binding (also published for logout reset).
  - `InterventionOutboxRepository` — replay outbox + `hasUnsyncedChanges` signal.
  - `InterventionWorkspaceRepository` — normalized workspace persistence.

  The local persistence layer (database/outbox/workspace + façade) lives under
  `data-access/services/intervention-offline/` because IndexedDB is local
  transport; only the façade and `InterventionDatabaseService` are public.

Behavior coordinators (`services/`):

- `InterventionSyncService` — outbox replay engine.
- `InterventionSyncCoordinatorService` — replays the outbox when connectivity/visibility is regained.
  Its `problem` signal carries the first blocked operation's own server error, and
  `InterventionSyncIndicator` now renders it under the blocked count: the panel used to announce a
  number with no cause, which `PRODUCT.md`'s second principle forbids. It stays silent when the
  failure carried no message rather than inventing one.
- `InterventionPwaUpdateService` — defers service-worker updates until the outbox is clean.
- `InterventionPrefetchService` — warms offline workspaces for the current member.
- `InterventionOfflineLifecycleService` — clears local data on logout.

These coordinators are armed once at app init via `provideInterventionsFeature`
(`start()`), each gated by a `started` signal driving a constructor `effect`.

Connectivity decisions across the feature read the shared
`ConnectivityService` (`core`), not `navigator.onLine` directly.

Architecture note:

- `state/` hosts NgRx SignalStore slices only.
- `data-access/` hosts the transport boundary: the HTTP service and the local
  IndexedDB persistence layer (façade + database/outbox/workspace).
- `services/` hosts intervention behavior coordinators (sync, prefetch, PWA
  update, lifecycle), one folder per service.

Main provider:

- `provideInterventionsFeature`

Shell contribution:

- `withSyncIndicator` (`providers/sync-indicator/`) — contributes
  `InterventionSyncIndicator` to the dashboard shell's header-actions slot.
  Published through `@features/organization` the same hop-by-hop path as
  `withAssistantToggle`: the provider's own local `index.ts`, re-exported by
  `organization/providers/index.ts` (a deep import, bypassing this feature's
  own root barrel on purpose — see Published Contracts), then
  `organization/index.ts`. Wired into `app.routes.ts`'s dashboard route
  `headerActions`, order `20`, between the assistant toggle (`10`) and the
  theme switcher (`100`).

</details>

## Intervention workspace reference

The owner contract is [Detail workspace composition](../../src/app/features/organization/features/interventions/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

The detail uses a stable horizontal Spartan line tab list at every width:
Work (`overview` in the URL), Changes, Attachments, Facilities, Equipment and
Inspections. The native paginated tab list contains overflow within the bar.
Operational properties occupy the right rail and remain outside every tab. Their
order is reference, type, status, priority, site, responsible and planned
window; participants, labels, description, revision and updated continue in
the native secondary disclosure. Status is stated once in Properties.

The Work panel starts with a compact readiness item group and the work items.
A writable empty scope has one add action and no zero progress/count. Activity
and its comment form remain mounted and directly visible, preserving drafts.
The activity menu item opens Work and focuses the comment after rendering.
Blockers stay reachable from every tab through the split button menu.
Their desktop/mobile placement retains the existing 896px
container threshold and focus fallback.

**Page decomposition (5.1) — behavior-frozen extractions, layout untouched.**
The page component delegates to units that carry their own specs: the label
derivations live in `utils/intervention-summary/`; the capability surface
(phase, the status-menu targets, and the action gates) is built by
`createInterventionCapabilities` (`utils/intervention-capabilities/`), a
factory over page-owned signals — a factory rather than store computeds
because the workspace store and the route-provided member-access store live in
different injectors. **The action gates read the API's own
`InterventionOutput.allowedActions` block** (present on reads and on every
mutation response since backend 1.3.0), computed server-side by the same
`InterventionActionPolicy` that enforces each write — the factory no longer
re-derives the permission/status/identity matrix; only phase, the menu
composition (over `allowedTransitions`, with the withdraw move gated on
`allowedActions.canWithdraw`), label management and QR scanning remain
client-derived, since the backend does not advertise them. An intervention
rehydrated from a pre-upgrade offline cache may lack the block; every
server-advertised gate then degrades to denied until the next sync; the delete/skip confirmation is the presentational
`ui/dialogs/intervention-confirm-dialog/` (its request/accepted types in
`models/intervention-confirm/`), while **abandoning has its own
`ui/dialogs/intervention-abandon-dialog/`** — it is the lifecycle's one
terminal, read-only transition, and `DESIGN.md` rule 5 makes per-case wording
the point. That dialog collects nothing: the workflow keeps a `reviewNote`
only for `changes_requested`, so a reason field on an abandon would take text
the backend discards; publication state is
`InterventionPublicationStore` (above); QR-scan matching and upload preparation
belong to `InterventionFieldExecutionService.scanToWorkItem` and
`InterventionPhotoCompressorService.prepareAll`. The page keeps same-named
protected aliases over the factory's signals, so the template contract never
changed during the decomposition. Below 896px of container width
(`@4xl/detail`) the container drops to `flex flex-col`: `<hlm-tabs>` (rail,
then whichever panel is active, in document order) stacks above the
properties/issues-checklist column; the command remains in the page header.

The container observer only determines the visible issues checklist; tab
orientation and keyboard direction stay horizontal throughout resizing.

1. **Header** — the intervention's name is the shell breadcrumb's `<h1>`
   (`interventionTitleResolver`, `data.title`), not an in-page band. Discussion
   and one `⋯` overflow menu — carrying both the status transition group (when
   `transitionTargets().length > 0`) and Duplicate/Export report/Abandon/Delete
   — register on the shell header through `PageActionsService` (`@core/page-actions`)
   instead, the same contract every other route page's header actions use
   (`organization/FEATURE.md` "Page header (shell contract)"). The status tag
   itself is on the band directly beneath (item 4).
2. **Meta line** — who acted last and when, plus the revision, derived from
   the most recent loaded activity entry (`InterventionWorkspaceStore.activities`)
   and falling back to `updatedAt` while the timeline is empty or still
   loading. Outside every section, so the last-touched summary needs no
   scroll to see.
3. **Split command** — registered in the page header, independent of the active
   tab and shared across viewport sizes. No bottom band or reserved bottom padding.
4. **Page error alert** — recoverable loading failures; mutations use feedback toasts.
5. **Overview tab** — `app-intervention-getting-started` (rendered only in
   `prepare`, while a prerequisite is still missing), the mobile issues
   checklist (`execute`/`review`, `@4xl/detail:hidden`), the work-items block (scan
   button, `app-intervention-work-item-table`), `app-intervention-
activity-thread`, and the comment-form block.

   **The "Linked" stat-cards row (facility/equipment/inspection counts) that
   used to open this section is retired**, not carried into the Overview
   tab: with the same three counts now standing, always-visible, on the
   rail's own triggers, repeating them a second time one scroll below would
   have been the same numbers shown twice on one screen for no reason. If a
   future redesign narrows the rail's counts away (an icon-only rail, say),
   revisit whether Overview needs its own summary back.

6. **Changes / Attachments tabs** — `app-intervention-change-table` and
   `app-intervention-attachments`, each the sole content of its own lazily
   mounted (`hlmTabsContentLazy`) panel, carrying `pendingChangesCount()` /
   `store.attachments().length` as their trigger's count badge. Both moved
   out of Overview in the same change that introduced the status band; see
   `### The rail is not the retired workspace tabs` for what that narrows.
7. **Facilities / Equipment / Inspections tabs** — one `hlmTable` each, read
   for the intervention's own linked records, no pagination, no row actions
   (see the tables' own component docs for the column sets).
8. **Operational properties** start the right rail and remain mounted.
   Readiness actions open their matching editor directly. Lifecycle and
   planning values remain visible; secondary metadata and the description are
   compacted behind the local Spartan `hlmCollapsible` disclosure. A collapsed
   rail exposes a top "More details" trigger; an expanded rail replaces it
   with a bottom "Show less" trigger after the audit metadata. The disclosure
   resets for a different intervention and preserves its state across a
   refresh of the same one. On the desktop container breakpoint, the complete
   rail stays sticky below the dashboard chrome so its first properties are
   never covered by the page header.
9. **Secondary information and desktop issues** occupy the second track;
   mobile issues stay in Work and the visible instance receives focus.
10. **Prev/next footer** — unchanged.

Activating the getting-started item for missing scope (`workItems`) switches
the rail to Overview first — `InterventionDetailPage.revealFieldWork()` —
then scrolls to and focuses the work-items section, deferred one tick when a
tab switch actually happened (`[hidden]` on the previous panel only clears
once that binding flushes). The status band calls the same method and may
fire from any of the other five tabs, which is why the switch cannot be
skipped the way it could when Overview was the whole page. Its
blockers-requested output is the same shape: `revealBlockers()` switches to
Overview, then focuses whichever of the two issues-checklist copies the
current viewport shows.

### The rail is not the retired workspace tabs

`### Retired invariants` records two prior retirements of a workspace tab
rail, and a reviewer who remembers that history should read this paragraph
before flagging the current rail as reopening either one. It narrows the
same failure mode to the one thing that actually matters, rather than
claiming the page has no tabs at all — it does, again, on direct
instruction — so hold it to a sharper bar than "no tabs":

**Nothing that gates publication readiness is visible only inside a tab
panel.** `intervention.blockersCount` and the phase's forward action both render
from `app-intervention-status-band`, sticky under the header, which does not
belong to `<hlm-tabs>` and does not react to `activeLinkedTab`. An operator
parked on the Facilities tab still sees the same blocker count and the exact
same forward-action button a reviewer on Overview does — the specific defect
both earlier retirements describe (a count or a blocker invisible unless the
right tab happened to be open) cannot recur, because the thing that must
never hide behind a click was never moved into a tab to begin with.

What genuinely is now behind a click, honestly stated: Work items and
Activity — previously part of one continuous always-visible flow — only
render while Overview is the active tab; Changes and Attachments went one
step further and each moved into its own tab. That is a real, acknowledged
narrowing of the 3.0 "one continuous flow" invariant, not a distinction to
argue away; it is also exactly what this instruction asked for. The
mitigation is `revealFieldWork()` switching to Overview before it scrolls,
so nothing the phase action points at is ever unreachable — reachable
through one extra click from another tab, same as
Facilities/Equipment/Inspections/Changes/Attachments are reachable with one
click from Overview.

### One address, one implementation, one host

The forward action has **one implementation and one live address, at every
viewport.** This retires two earlier designs in sequence: "renders exactly
once" (broken by the grid collapse, which put the second column after the
whole content flow on a phone) and its own fix, "one implementation split
across two viewport-gated hosts" (`app-intervention-action-box` at `lg` and
up, `app-intervention-command-bar` below it — both retired with this
change, see `### Retired invariants`).

`app-intervention-command-button` is the implementation: the button, its
spinner and its disabled state, and nothing else. `app-intervention-status-band`
is its one host — sticky (`top-0`) directly under the title row, outside the
tab grid, rendering the same button at every width instead of picking
between two mutually-exclusive copies. The band reads `commandAction()` and
emits into `invokeCommandAction()`, same as the two retired hosts did, so
nothing about the write path changed — only the number of places the button
can render from.

The band also carries the blocker count as its own control
(`data-testid="intervention-detail-blockers"`); activating it calls
`InterventionDetailPage.revealBlockers()`, which switches the rail to
Overview if needed and focuses whichever of the two
`app-intervention-issues-checklist` copies (mobile, inline in Overview;
desktop, in the second grid track) the current viewport actually shows —
the list itself never lived in the band.

The band breaks out of the page padding (`sm:-mx-4 md:-mx-6`) and blurs its
background over whatever scrolls beneath it (`bg-background/95 backdrop-blur`),
so it reads as a fixed toolbar rather than a floating card at any width.

**The target comes from the workflow policy, not from the phase.**
`resolveCommandTransitionTarget` (`utils/intervention-command-target/`) takes the
nearest legal status strictly ahead of the current one, out of
`resolveAllowedTransitions` — i.e. out of the API's own per-card
`allowedTransitions`. Deriving it from the phase put `planned` in `execute` and
therefore computed `submitted`, which the server refuses from `planned`: the
band offered "Submit for review", and the only path to `in_progress` was three
levels deep in the shell's overflow menu, rendered as a status tag rather than
a verb. From `planned` the band now says **Start field work**.
`changes_requested` shares `in_progress`'s rung on the forward line, so
"resubmit" stays ahead of it and its command is still `submitted`.

**The band carries a second action when there is one.** `secondaryAction` /
`secondaryInvoked` render the reviewer's "Send back for changes" beside the
primary, gated on `canReview()` and a `submitted` status — not on `canPublish`.
A reviewer without publish rights used to get an empty band, which `PRODUCT.md`
forbids: their action must be reachable there. It opens the same
`app-intervention-request-changes-dialog` the overflow menu does.

### The forward move has one gate

`transitionTargets()` — a labeled group inside the header's `⋯` overflow menu
(`data-testid="intervention-detail-transition"`, folded in alongside
Duplicate/Abandon/Delete rather than its own standalone trigger) — offers
only the moves the status band does **not** own: starting or reopening field
work (`in_progress`) and sending an intervention back (`changes_requested`).

Unlike the other menu entries, **"Export report"** (`data-testid="intervention-detail-export-report"`)
carries no permission or phase gate — any caller who can read the intervention
can fetch its PDF (`InterventionService.exportReport`,
`GET /api/interventions/{id}/report`), so it is the one entry that keeps the
`⋯` trigger present even when every other action drops out.

It used to offer the forward move too, which made the band's (then the
action box's) readiness gate advisory: from `in_progress` an operator saw
"Complete 3 remaining items" (the band deliberately refusing to offer
submit) and, four pixels away, "Submitted" — which submitted immediately,
three items open, with nothing telling the reviewer. From `draft` the menu
likewise offered "Planned" without the site/responsible/dates check.

`InterventionDetailPage.commandTransitionTarget` is the single source: the
status `invokeCommandAction()` dispatches for the current phase (`planned` in
`prepare`, `submitted` in `execute`, `null` in `review`, where the forward step
is a publication). `invokeCommandAction()` dispatches it; `transitionTargets()`
subtracts it. Adding a phase means touching one signal, and the menu follows.

One identity gate sits on top of the capability filter: **withdrawing a
submission** (`submitted` → `in_progress`, added to the backend policy and
mirrored in `INTERVENTION_STATUS_TRANSITIONS`) is reserved server-side to the
responsible member, so `transitionTargets()` hides it unless `canSubmit()` —
the same responsible-identity signal that gates submission. Since 5.2 the list
page's row menu applies **the same gate**: the table stays presentational and
receives the signed-in member's IRI as a plain input (`currentMemberIri`), and
disables the responsible-only moves with a stated reason instead of offering an
action that predictably 403s. The optimistic `transition` rollback and the
`transitionFailed` toast remain the safety net for a race the client cannot
see (a reassignment landing between render and click).

`app-intervention-issues-checklist` (execute and review phases) gives every
loaded issue a direct address instead of a message to decode: blocker or
warning, activating one moves the operator to the rail tab, in-place editor,
or field-work section that resolves it (`resolveInterventionIssueTarget`,
grounded in the exact `resource`/`field` pairs `InterventionIssueFinder`
emits). It never bypasses the gate above — activating an issue only
navigates, the same way `onReadinessActivated` does for a prepare-phase gap;
the write that actually clears the issue still goes through the in-place
editor, the work-item table, or the equipment record it points at.

### Proposed changes: reject is the only client action

`UpdateInterventionChangeInput.status` only ever accepts
`'proposed' | 'rejected'` — the client can reject a change, never accept one,
and acceptance is not a client action at all: a proposed change is applied
automatically **at publication**, and the list's caption says so.
`InterventionWorkspaceStore.rejectChange` performs the rejection (offline it
queues the existing `change.update` outbox operation and applies it
optimistically; a genuine server rejection dispatches the `rejectChangeFailed`
toast and leaves the change untouched). `app-intervention-change-table` offers a
per-row Reject button when the page grants `canReject` — `submitted` requires
`.review` (a pure reviewer CAN reject during review), `in_progress` /
`changes_requested` require `.execute`, mirroring the backend's permission
mapping; the responsible/participant membership guard is not approximated and
surfaces as the toast. A change row locks and spins on **its own** write
through `pendingChangeIds`, the same rule as work-item rows.

### Editing

Every property is edited **where it is displayed** (ARCHITECTURE.md §10.5), on
`@shared/inplace-field`. There is no planning sheet and no planning wizard.

Two commit modes, chosen by the control rather than by taste:

| Mode      | Fields                                | Why                                                                                                                                           |
| --------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pick`    | priority, site, responsible, schedule | a value picked in one gesture commits on that gesture — a Save button after choosing "Urgent" from four options is a click that means nothing |
| `confirm` | description, participants, labels     | free text and sets have no single "done" gesture                                                                                              |

`plannedStartAt` and `dueAt` are **one field**: picked together in a range control
and sent in one patch, which §10.5 admits as "a small coherent group".

**Nothing is dispatched for a value equal to the one already stored** — every
accepted patch increments `revision`, which publication is pinned to.

**A commit is confirmed, not undoable.** `FeedbackMessage` carries no action, so
an "Undo" toast would be a new cross-app primitive; instead every successful
in-place commit shows a success toast, so a mis-click is visible within the
toast's lifetime rather than discovered at review.

Mutability follows the backend's **replanning matrix** (the former draft-only
`assertPlanningMutable` is retired): dates, priority and participants stay
writable through `planned`, `in_progress` and `changes_requested`
(`canEditSchedule`) — a delayed intervention is rescheduled in place, and the
backend answers with a `rescheduled` activity the timeline renders (amber
calendar marker, "moved the planned window to …"); the responsible accepts a
handover in `draft` and `planned` only (`canEditResponsible`); the site stays
draft-only (`canEditSite`); description and labels hold until a terminal
status (`canEditDetails`); `submitted` freezes everything — withdraw first. A
field that cannot be written renders as a **disabled trigger** — no hover, no
pencil, out of the tab order. The `plan` permission gates all three planning
signals; the backend additionally lets a pure planning payload through without
the responsible/participant guard, so a planner who is neither can reschedule.

`name` is deliberately **not** editable here: the gate covering it is documented
in neither set, and offering an edit the API might refuse is what the read-only
rule exists to prevent. Resolve it against the backend before opening it.

### Progressive planning, without a wizard

`app-intervention-getting-started` is the whole of what replaced the four-step
guide, and it is deliberately not a progress-bar-plus-next-item strip: it lists
every prerequisite **at once** — site, responsible, due date, scope — each a
direct `hlm-item` row into the in-place editor that satisfies it. A planner
filling in a draft sees the whole short list up front rather than one item
revealed at a time, which suits "go progressively, not too many fields at once"
better than hiding all but the next gap would. It is a table of contents over
the in-place editors, never a second place to edit — which is why it can guide
without duplicating a single field.

It renders in `prepare` only. `description`, `labels` and `participants` are
**not** in the list — putting them there would invent obligations the backend
does not have. It is empty everywhere else: in `execute` the phase action is
already the living "Complete N remaining items" pointer to the checklist; in
`review` nothing left is a gap the operator can click their way to; and an
**abandoned** intervention falls back to the `prepare` phase, so without an
explicit guard it would offer to plan something that left the workflow.

### Notices

Each condition renders **once, where it is relevant**, instead of a single
ranked stack under the header: an unattributed store error is one alert above
the content sections; a reviewer's note (`changes_requested`) is a
**neutral** alert in the page content flow below the band — **not** inside it,
because the band is a fixed thumb-zone bar on mobile (`max-sm:fixed bottom-0`)
and an unbounded-length note pinned there overran the work items. Neutral, not
destructive: muted ground, a `lucideMessageSquareQuote` glyph in
`text-muted-foreground`, title in `text-foreground` — `changes_requested` is
an intermediate workflow state, and the Two Ends Rule spends colour only on the
terminal ends, so requesting changes reads as review feedback, not a failure
(the sheet's submit is the Ink default button for the same reason, never a
destructive tint). a failed activity
fetch is an alert with a
retry inside the Activity section; the blocker count is the band's own
control, and the blocking compliance issues it points at sit in the issues
checklist; a publication failure is inline in the publish confirmation,
which stays open so the operator can retry; an unsynced outbox is the
shell's own sync indicator rather than a dismissable page-level banner; and a
**blocked** outbox — the one sync state where data is at risk — is
additionally an on-page alert on the detail workspace (see `### Offline`). A
field-level rejection is already shown by the field itself
(`editState.failed`) and is excluded from the top-of-page alert so it never
renders twice.

**A failed load is a state, not a banner.** The in-page alert only ever
appears alongside a rendered intervention, so it cannot report the failure that
prevented one: `load` sets `intervention: null` **and** `errorCallState`
together, and an alert nested inside the "we have an intervention" branch is
unreachable on exactly the path a field agent on a weak connection takes. That
is why the page has a third branch, `store.loadFailed()`, rendering the store's
message with **Try again** and a way back — and why the "not found" state is
now only for a fetch that genuinely returned nothing.

The store owns which message that is: `loadFailure()` reads
`ConnectivityService.isNetworkFailure(error)` and phrases an unreachable
network differently from a rejection, so the page shows the reason rather than
guessing at it. When the offline snapshot is missing, `fetchWorkspace` rethrows
the **original** network error rather than a generic one, which is what keeps
that branch reachable.

**Retry is offered only where retrying is the repair.** `retryLoad()` re-runs
`load`, which fixes a failed fetch and is the wrong answer to a rejected patch,
so the alert's button is gated on `store.loadFailed()`. A write failure states
what happened and offers nothing that would silently discard it.

`hlm-alert` has exactly two variants and the theme carries no warning or info
token (`--success` exists, but only for status glyphs — the Glyph Rule), so a
notice's kind is conveyed by its **icon and title, never by colour**.
Every alert paints its own ground (`bg-muted/50`, `bg-destructive/5`) because
`--card` and `--background` are the _same colour in the light theme_ — a stock
alert would be white on white, separated by one hairline.

### Offline

The workspace store already queues writes, applies them optimistically and keeps
an IndexedDB snapshot. The visible surface is `app-intervention-sync-indicator`
(`ui/components/intervention-sync-indicator/`), a **shell** widget contributed
to the dashboard's header-actions slot through `withSyncIndicator()`
(`providers/sync-indicator/`, mirroring `withAssistantToggle()`) rather than
mounted per intervention page — offline is a permanent condition of the
workspace, not a per-page notice, and the former per-page
`app-intervention-sync-status` unmounted entirely once healthy, leaving an
agent who had just saved offline work with no confirmation once they
navigated to another page. The indicator is present on **every** dashboard
page, not only the interventions ones: the outbox is device-global, not
scoped to whichever intervention screen happens to be open.

**`blocked` is the one state that also speaks on the page.** The indicator
alone was the whole report, and at that size it is a 12px triangle on a 32px
ghost button behind a popover — an agent whose field work failed to replay
learned nothing on the very workspace holding the data at risk, while the
popover's `role="alert"` live region told a screen-reader user. So
`InterventionDetailPage` renders `app-intervention-sync-blocked-alert`
(`ui/components/intervention-sync-blocked-alert/`) above the work content
whenever this intervention has queued operations left `failed` or `conflict`.
It **names them** — `INTERVENTION_OUTBOX_LABEL` (lifted to the feature's
`constants/`, the indicator being its other consumer) plus each operation's
own server error — and offers **Retry blocked** only. Discard is data loss
and stays confirm-gated in the indicator's panel; the popover remains the
device-global drill-in.

The page reads the list itself (`InterventionOfflineService.listOutbox`,
filtered to `failed`/`conflict`), gated on
`InterventionSyncCoordinatorService.blockedOperations()` so the common case
never touches IndexedDB, and refreshes after every retry — a retry that fails
again leaves the same blocked count, so watching that count alone would go
stale. The coordinator's `problem` is `blocked[0]?.error`, which the list
already prints, so the alert suppresses the reason line when a listed
operation carries it verbatim.

Its tone follows the Glyph Rule rather than the alert primitive's
`destructive` variant: hairline `border-destructive/30` on `bg-destructive/5`,
the triangle in `text-destructive`, and every word in the normal foreground.
The destructive variant tints the title _and_ the description, which at 375px
turns a five-line alert into a wall of red text — the same objection that
retired the coloured reviewer note.

**The two offline notices** (list and detail, `servedFromLocalCache()`) read
at `text-sm` in the page foreground beside a `lucideCloudOff` glyph, not the
`text-xs text-muted-foreground` they used to: `PRODUCT.md` principle 3 calls
offline first-class, and the system's quietest register said the opposite.
Their `role="status"` and their i18n ids are unchanged.

Five mutually exclusive states, in priority order (a dropped connection
outranks a blocked replay, which outranks one in flight, which outranks
self-syncable work still queued): **offline** (muted glyph, popover explains
the offline state and any pending count), **blocked** (destructive glyph plus
a count badge, popover carries Retry blocked / Discard blocked — discard
confirm-gated because it is data loss), **syncing** (spinner), **pending**
(neutral glyph plus a count badge, popover offers Sync now), **synced**
(quiet, no badge, popover states "Last synced `<relative time>`" via
`InterventionSyncCoordinatorService.lastSyncedAt`, reusing
`formatInterventionRelativeTime` — the activity thread also uses it). Resolves to
`synced` server-side without an explicit SSR guard:
`ConnectivityService.online` is optimistic-online there, and the coordinator
and outbox signals default to their empty values before any IndexedDB access
runs.

The popover **lists the queue**, it does not only count it. Opening it reads
`InterventionOfflineService.listAllOutbox()` — device-global, oldest first, and
loaded on open rather than kept warm, so an agent who never opens the panel
never pays the IndexedDB read. Each line names the operation through
`INTERVENTION_OUTBOX_LABEL` (local to the indicator: one consumer), shows the
server's own error when it carries one, and offers **Retry** and **Discard**
per operation via `retryOutbox`/`removeOutbox`. The whole-queue Retry blocked /
Discard blocked stay: they are the bulk verbs, and discarding everything is
still confirm-gated. A pending operation that will sync on its own gets no
per-operation action — there is nothing to decide about it.
`InterventionSyncCoordinatorService.problem` is rendered under the blocked
count, so the panel names the cause instead of a bare number.

**The list is offline-first, like the workspace.** `InterventionStore.load`
falls back to `InterventionOfflineService.listInterventions(organizationId)` on
a network failure, and only on a network failure — a 4xx/5xx still surfaces as
an error, which matters because the list store also feeds the board. An empty
snapshot rethrows rather than rendering a false empty. The fallback sets
`servedFromLocalCache`, which the page turns into a `role="status"` banner and
into a **closed export gate with a reason** (`[appGateReason]`): export needs
the server. `InterventionWorkspaceStore` carries the same flag for the detail
page's own banner, and skips re-saving a snapshot it just read — rewriting it
would only refresh its timestamp and lie about its age.

Being a shell widget, `InterventionSyncIndicator` is — unlike every other
component in this feature — allowed to inject `InterventionSyncCoordinatorService`,
`InterventionOfflineService` and `ConnectivityService` directly rather than
taking them as inputs (`ARCHITECTURE.md`: "Layouts may render feature-owned
widgets through public APIs"). Publishing `withSyncIndicator()` to
`app.routes.ts` therefore pulls the whole offline/IndexedDB graph into the
dashboard shell's own bundle, the same trade-off `withAssistantToggle()`
already accepts for the assistant — accepted here because the indicator now
being permanent means that graph loads for every dashboard visit regardless.

The discard confirm is `app-intervention-sync-discard-dialog`
(`ui/dialogs/intervention-sync-discard-dialog/`), a purely presentational
component the indicator still hosts itself: DESIGN.md's ban on inline
page-level confirm markup names the _page_ as the alternative host, but this
widget has none — it is the "documented container component" the rule
reserves for a non-page overlay host, the same exception that already lets it
inject its own collaborators.

The indicator's trigger deliberately keeps the retired component's
`data-testid="intervention-sync-status"` rather than minting a new one, so
every existing sync locator — e2e specs and page objects included — survives
the migration unchanged.

### Activity and team chat

The primary Discussion action opens the activity disclosure and focuses the
intervention comment. The existing Mercure-backed `SubjectDiscussion` remains
available as Team chat in the secondary menu, gated on messaging read, and
loads only when opened. Team messages and the compliance activity remain
distinct records; neither is copied into the other.

### Comment mentions

`app-intervention-comment-form` inserts the backend's own `@{memberUuid}`
token verbatim when a mention is picked (typed `@` or the at-sign trigger
button) — there is no label-to-marker rewrite step, unlike collaboration's
message composer, because the backend notifies (in-app + email,
`intervention.comment_mention`) off exactly that token in the stored body.
`app-intervention-activity-thread` resolves the same tokens client-side to
render a name; both share `utils/intervention-mentions/`. See both
components' own docs for the mirrored-vs-shared reasoning against the
collaboration feature's caret-query machinery. Offline, the composer relabels
its action to "Queue comment" and carries a hint that the comment is queued
and sent on reconnect, not lost — the same offline-queue policy the store
applies (`PRODUCT.md`: an offline comment is a queued action, never a
failure); a post in flight reads as `aria-busy` with a "Posting…" label.

### Attachments and field capture

`app-intervention-attachments` lists synced and queued files with native Spartan
Attachment primitives, preserving per-file actions and offline metadata. Its
picker actions stack below the caption on narrow screens. It offers a picker
plus a camera capture whose images the
page shrinks through `InterventionPhotoCompressorService` before upload. Picks
are pre-checked against the backend's MIME whitelist (images + PDF), the
**25-file cardinality cap**
(`AttachmentConstraints::MAX_ATTACHMENTS_PER_PARENT`) and — for non-image
files only — its 10 MiB ceiling: a multi-megabyte camera capture is exactly
what the compression pipeline exists for, so images skip the local size check
and the server stays authoritative on the final size; a row's delete button
emits a request event straight away — `app-intervention-attachments` owns no
confirm of its own — and the detail page hosts the confirmation
(`ui/dialogs/intervention-attachment-delete-dialog/`) and locks the row on
its own write via the store's `pendingAttachmentIds` once accepted. The cap
surfaces as a `n / 25` badge that appears once
the list is half full and turns destructive at the ceiling, a hint line, and
disabled pickers — an enabled button that can only answer 422 is worse than no
button. A multi-file pick that would overflow the remaining slots is rejected
**whole**, not partly, so the user is never left guessing which of their files
landed. Gating mirrors the backend's
`mutationPermission`: nothing in `submitted`/`published`/`abandoned`, `.plan`
while drafting, `.execute` afterwards. Every row also offers a download
button, available regardless of manage permission: `InterventionService.downloadAttachment`
reads the bearer-authenticated `GET /api/intervention-attachments/{id}/download`
route as a `Blob` (a bare `<a href>` cannot carry the auth header) and the
detail page hands it to the feature's `BrowserDownloadService` — the same
service the list page's CSV export uses, lifted there once the attachment
download became its second consumer. Offline, download **and** delete are
disabled with the reason stated once at the card head
(`#intervention-attachments-offline-reason`) and wired to both buttons through
`aria-describedby` — a greyed control that cannot say why is a dead end
(`DESIGN.md` "Closed gates speak"); the reason is shared rather than repeated
per row because the gate is one global connectivity condition, not a
per-file one. Plain uploads **queue offline**: when the
device is offline or the request fails on a network error (the comment
policy), the compressed file is stored as an `attachment.upload` outbox
operation — Blob plus metadata in IndexedDB — replayed with the other
operations in queue order, shown as a dashed row with a "Pending sync" badge
that counts toward the 25-file cap and the shell sync indicator, and
discardable while queued (confirm-gated, it is data loss). The queue is
bounded device-wide to **25 files / 50 MB**
(`INTERVENTION_ATTACHMENT_QUEUE_MAX_*`); a full queue refuses the pick with an
explicit message. Signature uploads stay online-only — the page chains the
submit transition on their success. Replays are **idempotent**: the queued
row's `clientId` rides along as the endpoint's multipart idempotency key
(`POST /api/interventions/{id}/attachments` mirrors equipment's media
endpoint), so a crash between server success and local dequeue returns the
already-created attachment on the next replay instead of duplicating
it. The QR button in the field-work section
(`scanSupported()` devices, execute phase only) decodes a capture through
`InterventionFieldExecutionService.scan`, normalizes it via
`InterventionDiscoveryService.normalizeScannedTarget` and reveals the matching
work item, or toasts when nothing matches.

Each work-item row also carries its own evidence affordance
(`app-intervention-work-item-table`'s `canAttachEvidence`, gated the same as
`canManageAttachments`), showing the row's `evidenceCount` as a small badge
once it is above zero. The row only _requests_ evidence
(`evidenceRequested`) — the table stays presentational; the page opens the
same photo-intake path attachments use (`InterventionPhotoCompressorService.prepareAll`
then `store.uploadAttachment`), passing the row's work-item id so the upload
scopes to it. The row locks and spins on its own through the page-local
`evidenceUploadingWorkItemIds`, cleared once the shared
`attachmentWriteCallState` settles. An attachment scoped to a work item
carries that id back (`workItemId` on `InterventionAttachmentOutput`) and the
attachment list shows it as a subtle chip naming the work item (resolved
from the workspace's loaded work items; an id that no longer resolves — the
item was deleted after upload — shows no chip). **Deletion invariant:**
deleting a work item does not delete the evidence that documents it; the
backend `SET NULL`s the attachment's `workItemId`, so the file survives as
plain intervention-level evidence and its chip disappears.

### Completion signature (Phase 5d.2)

Attachments carry a `kind: 'file' | 'signature'` (`InterventionAttachmentOutput.kind`),
mirroring the backend's `InterventionAttachmentKind` byte for byte, and
`InterventionOutput.hasSignature` reports whether the intervention already
carries one — at most one exists per intervention; a re-upload replaces it,
never flips it back to `false`. The issue finder nudges a ready-but-unsigned
intervention with a `recommendation`-severity issue, surfaced the same way
every other issue is (`app-intervention-issues-checklist`); it does not gate
anything, since the backend never requires a signature to submit.

Capture is a **hand-rolled canvas signature pad**
(`ui/dialogs/intervention-signature-dialog/`) — the spartan/ui catalog (46
generated primitives plus everything still addable through
`npx ng g @spartan-ng/cli:ui`) has no signature or freehand-canvas primitive,
so this is the documented `ARCHITECTURE.md` §8.5 vendored-code exception. A
fixed-size, device-pixel-ratio-aware `<canvas>` tracks Pointer Events
(mouse/touch/pen alike) into `hasStrokes`, which gates Confirm; Confirm
encodes the pad via `canvas.toBlob` (PNG) and emits `signed(Blob)`. All canvas
work runs from a user gesture (opening the dialog, drawing a stroke) — there
is nothing to guard for SSR, since the dialog's content is not in the DOM
until it is open. The pad offers no keyboard-drawing simulation; the dialog
copy states its purpose and the surrounding `hlm-dialog` still gives it a
focus trap and Escape-to-dismiss.

The dialog interposes on the `execute` phase's forward action
(`InterventionDetailPage.invokeCommandAction`), and only there: once the field
work is actually resolved (the same gate `commandTransitionTarget` already
applies) and the loaded intervention carries no signature yet, the click opens
the dialog instead of dispatching the `submitted` transition directly. A
"Submit without signature" button submits explicitly; Cancel, Escape and backdrop
closure never submit. Signature remains optional. Confirming instead uploads
the PNG through the workspace store's `uploadAttachment` with `kind:
'signature'`; the submit transition is **not** dispatched inline — it chains
off the store's `attachmentUploadSucceeded` event once the upload has actually
landed (a page-local `signingSubmitPending` flag arms the chain and is cleared
either by that event or by the write's own `attachmentWriteCallState` turning
to error), so a failed upload never silently submits an unsigned intervention.
The dialog and drawing stay open until the upload succeeds; a failure preserves
both the input and its inline error. Passive closure never dispatches a transition.

Display: `app-intervention-publication-summary` gains a signed/unsigned line
(icon + label, never colour alone) from `hasSignature`, rendered in both its
call sites (the rail's publication group and the publish confirmation) from
the one definition, same as its other stats. The attachment list shows a
small "Signature" chip on `kind: 'signature'` rows, reusing the existing chip
pattern next to the work-item chip.

### Write attribution is exact, not approximated

The store's former **single `mutationCallState` for every write** — and the
page-side approximation it forced (`pendingWorkItemId`, a `settleWrite` driven
by the global `saving`) — is retired. Every write concern has its own named
call state, the in-place fields settle on `updateDetailsCallState` alone, each
overlay (comment composer, add-work-item sheet, request-changes dialog) binds
the call state of the write it actually performs, and per-row attribution for
the concurrent `mergeMap` writes is the store's own `pendingWorkItemIds` /
`pendingChangeIds` sets. Two writes in flight now each mark their own row, and
one write's success can no longer clear another's error. `busy` on the
work-item table still gates only the add affordances, whose sheet is modal.

</details>

## Retired intervention designs

The owner contract is [Retired invariants](../../src/app/features/organization/features/interventions/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

Rules from earlier detail-page designs that are **retired**, not merely unimplemented:

- _"The publication outcome renders where the action was taken."_ It was justified
  only by a mobile command bar mirroring `publicationMessage`, and that bar never
  existed in the tabbed workspace. The publish confirmation now stays open on
  failure and shows the outcome inline, so the operator sees it exactly where
  they took the action and can retry without reopening the dialog.
- _"In `execute`, the work comes before the context."_ It was implemented as an
  `ng-template` plus two `ngTemplateOutlet`s reordering a single-column DOM, and
  it only paid for itself alongside a per-phase progressive-disclosure layout
  that is not rebuilt. The tabbed workspace makes the point structurally instead:
  Field work is its own tab, so an operator mid-execution never scrolls past
  planning context to reach it.
- _"Everything worth saying lives in one ranked notice stack under the header."_
  Retired in the 2.0 tabbed redesign: seven conditions competing for one slot,
  folded behind a counted toggle, put a wall between the operator and the
  content they opened the page for. Each condition now has exactly one
  contextual home (see `### Notices` above) instead of a shared rank.
- _"The properties rail is a fixed `19rem` column on the right, and the phase
  action is a single button pinned to the top-right of the page header."_
  Retired in the 2.0 tabbed redesign: properties became a responsive card grid
  inside the Overview tab, and each phase's forward action rendered inside the
  tab where that work happened.
- _"The workspace is three focused `hlm-tabs` panels — Overview, Field work,
  Publication."_ Retired in the 3.0 pull-request-style redesign: the model
  already reads like a PR (proposed changes, an activity thread, a single
  merge/publish gate) and tabs were hiding that shape — blockers and proposed
  changes were invisible unless an operator happened to open the right tab,
  and `activities`/`changes` sat unused in the store from day one. The page is
  now one fixed-order flow of disclosures instead, and the phase's forward
  action moved from "inside whichever tab is showing" to one fixed address,
  `app-intervention-action-box`.
- _"A locked empty state fills the Publication tab before the intervention
  reaches `review`."_ Retired in the 3.0 redesign: `app-intervention-action-box`
  already communicates the workflow state through its own phase-appropriate
  content (a plan/submit button, then the recap), so a separate "not ready
  yet" panel said the same thing a second time.
- _"The page is one continuous, pull-request-style flow, not a set of
  tabs."_ Retired in the 4.0 three-column redesign: the flow had grown enough
  content that it stopped reading as a short PR and started reading as a
  long scroll a field operator had to get past to reach the work-item table.
  Tabs are back, but not the 2.0 shape that was retired above — this time the
  action box, its blocker list and its pending-changes count sit outside every
  tab, and the properties rail is a column rather than a tab, so the specific
  failure the 2.0 design was retired for (a count invisible unless the right
  tab happened to be open) cannot recur. The earlier `detailsExpanded` /
  `hlmCollapsible` "Details" section and its collapsed chip-row summary
  (`intervention-detail-chips`) were removed with that design; the current
  properties grid uses a separate local `hlmCollapsible` only to compact
  secondary metadata, without hiding the action context or publication
  blockers.
- _"The tab rail (Overview / Work items / Changes) sits in its own column,
  and `InterventionDetailPage.tabOrientation` flips it horizontal below
  `lg`."_ Retired within the same 4.0 pass, on direct product feedback: with
  the rail gone the page reads as one continuous scroll of always-visible
  sections instead of tab panels the operator has to click between. This is a
  fast iteration inside one design pass, not a multi-release retirement —
  nothing about the rail shipped long enough to accumulate its own history.
  The two-column layout, the properties/action-box `sticky` column, and the
  fixed-order content sections all carry over unchanged; only the rail and
  its tab-switching machinery (`activeTab`, `onTabActivated`, `tabOrientation`,
  the `InterventionDetailTabId` type) are gone.
- _"The page reads as one continuous scroll of always-visible sections
  instead of tab panels the operator has to click between."_ Retired by this
  change, on direct instruction, adding a left-hand rail (Overview /
  Facilities / Equipment / Inspections) so the intervention's own linked
  facility, equipment and inspection records get a real drill-down table
  each, beside — not inside — the always-visible flow. This is **not** a
  reinstatement of the tab rail retired directly above: that rail split the
  page's _own_ workflow content (Overview / Work items / Changes) three
  ways, which is exactly what made a blocker or a pending-changes count
  invisible unless the right tab was open. This rail keeps every one of
  those under one "Overview" tab, unsplit, and adds three genuinely new
  lookup tabs for sibling-feature data that never had a home on this page
  before. The thing the 2.0/4.0 retirements actually protect — the action
  box, its blockers and its pending-changes count outside every tab — still
  holds; see `### The rail is not the retired workspace tabs`. What is a
  real, acknowledged trade-off this time: Work items, Changes, Attachments
  and Activity are behind the Overview tab, not on screen regardless of
  scroll position, which the 3.0/4.0 "one continuous flow" language
  explicitly ruled out. `activeLinkedTab` and
  `InterventionLinkedResourceTabId` replace the retired
  `activeTab`/`tabOrientation` pair and `InterventionDetailTabId`; the tab
  list now stays horizontal in the page header and paginates when space is
  constrained.
- _"The phase's forward action is one implementation split across two
  viewport-gated hosts, `app-intervention-action-box` at `lg` and up and
  `app-intervention-command-bar` below it."_ Retired by this change:
  `app-intervention-status-band` is now the one host, at every viewport, and
  both components are deleted along with their specs. The band is sticky
  under the title row rather than living inside the second grid track or
  outside it as a bottom bar, so it no longer needs a breakpoint to decide
  which of two copies is live — there is only ever one. Its content still
  changes with the phase and status exactly as the action box's did (a
  plan/submit button with its disabled reason; the phase's action plus a
  blocker count in `execute`/`review`; a locked terminal line once
  `published`), and a `changes_requested` reviewer note that used to sit
  atop the Work items section now renders as a strip inside the band
  instead. `app-intervention-publication-summary`, previously rendered in
  both the action box's `review`-phase content and the publish confirmation,
  now renders in the confirmation only — the band states a blocker count,
  not the full recap. The standalone "Move this intervention" status-menu
  trigger is retired with it: `transitionTargets()` now renders as a labeled
  group inside the header's `⋯` overflow menu instead of its own trigger,
  broadened to appear whenever there is a transition to offer or an
  overflow action to take. Two further sections, Changes and Attachments,
  moved out of the Overview tab into their own lazily-mounted tabs in the
  same change — see `### The rail is not the retired workspace tabs` for
  what that narrows on top of the action-box/command-bar retirement.
- The list header's view switch is a spartan `hlm-toggle-group` (the hand-rolled `role="tablist"` is retired); "New intervention" becomes a split button (`hlmButtonGroup` + `hlmDropdownMenuTrigger`) whose menu selects one of `InterventionPlanningOptionsStore.templates` in the creation sheet for confirmation — the only header split button in the app, because its items are variants of the primary verb (`DESIGN.md` "Header actions").

</details>
