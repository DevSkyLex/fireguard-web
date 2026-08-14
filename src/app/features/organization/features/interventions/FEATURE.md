# Interventions Feature

## Purpose

Owns organization-scoped field intervention workflows.

This subfeature is responsible for:

- intervention listing and creation,
- intervention detail orchestration,
- intervention publication and issue checks,
- intervention offline persistence and outbox replay.

## Entry Points

- Routes: `interventions.routes.ts`
- Public API: `index.ts`
- Feature providers: `interventions.feature.ts`

## Routes

- `/organizations/:organizationId/interventions` — the index page: a spartan
  `hlmTable` of the organization's interventions, grouped and paginated, with a
  debounced search box synced to `?q=` (a server-side `name` filter), a filter
  popover (status, type, priority, site, responsible, label, deadline window),
  a "my interventions" toggle chip (`?mine=1`, the API's `member`
  responsible-OR-participant filter), a column menu, row selection, and
  permission-gated bulk actions. `?create=1` opens the creation sheet on
  arrival and is consumed once, so the parent feature's landing page can offer
  "New intervention" as a primary action that actually starts the work.
  **Export is a client-side CSV serialization of the current question** (same
  filters, sort and visible columns as the screen), never a backend endpoint:
  the already-loaded page is downloaded directly when it is the whole result
  set, otherwise every matching row is drained through
  `InterventionService.listAll` and capped at 1000 rows
  (`ui/pages/interventions-page/utils/intervention-csv-export/`).

  **Filters live in the URL** (5.2 — this flips the earlier "questions asked
  now, never persisted" stance): one query param per filter, raw ids for the
  IRI-valued ones, parsed and validated by
  `parseInterventionListFilters` / `serializeInterventionListFilters`
  (`ui/pages/interventions-page/utils/intervention-list-query/`). A filtered
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
  combination — a custom mix built from the popover — highlights none of the
  four rather than a misleading nearest one. Picking a view calls the same
  `applyFilter` path a popover select uses, so a view is a shortcut into the
  one filter contract, not a second state to keep in sync with it.

  **Removable filter chips (6.3)** render below the toolbar whenever a filter
  is active: one `hlmBadge` per set field (status, type, priority, site,
  responsible, label, deadline window), each removed by patching that one
  field back to `null` through `applyFilter` — the same effect as clearing it
  from the popover. `mine` keeps its own toggle chip outside this row, as
  before (it was already excluded from `activeFilterCount`). The popover
  remains the sole editor; the "Clear filters" button that used to live
  inside it now lives at the end of the chip row instead, since the two are
  the same action once chips make the active narrowing visible outside the
  popover.

  **The parent feature's Today page deep-links its three collection-backed
  queues' "See all" buttons into this narrowing**, reusing
  `serializeInterventionListFilters`'s own param names: overdue →
  `?due=overdue`, sent back → `?status=changes_requested`, awaiting review →
  `?status=submitted`. The unsynced queue has no server-side filter to
  deep-link to, so its "See all" stays absent. **The Overdue view is broader
  than Today's overdue queue**: the view is every status past due
  (`dueAtBefore=now`, no status narrowing), while `OrganizationTodayStore`'s
  `overdue` queue narrows to `planned`/`in_progress` — a past-due `submitted`
  or `changes_requested` intervention shows in the Overdue view but not in
  the Today queue of the same name. Do not conflate the two when reasoning
  about either.

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
  scrollable shell then fills exactly what the header, KPI strip, views row,
  toolbar, chips row and footer leave. The sticky `thead` is `sticky top-0`
  on `hlmTableContainer` itself (`h-full overflow-y-auto`), not on a separate
  outer wrapper — `overflow-x-auto` (needed for wide tables) forces
  `overflow-y` to compute as `auto` too regardless of what is written, so a
  wrapper split across two nested divs makes the sticky header pin to the
  wrong (non-scrolling) ancestor. Changing any of these three files without
  the others reintroduces page-level scrolling or an unstuck header.

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

## State and Data Access

Stores:

- `InterventionStore` — provided on the pathless parent route in
  `interventions.routes.ts` (not on the list page), so it survives list ↔ detail
  navigation. Intervention list and creation (normalized entities + request
  state). `load` fetches **exactly one server page** — `page`/`itemsPerPage`
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
  activation of an already-loaded tab is a no-op, and switching to a
  different intervention (prev/next) resets all three to idle so the next
  activation refetches. See `### The rail is not the retired workspace tabs`
  below.
- `InterventionPublicationStore` — component-scoped (provided in
  `InterventionDetailPage`); the publication request+poll flow, one named
  `publishCallState`. The store is a thin wrapper: `InterventionPublicationService`
  keeps sole ownership of the POST-202 + bounded-poll timing, and the store only
  normalizes the outcome (a terminal `failed` result and a rejected promise both
  surface through `error()`) and dispatches `publishSucceeded` on a genuine
  completion — the page subscribes to that event for the toast and the
  skeleton-free `reload`. Component-scoped so a stale failure never leaks into
  the next intervention's visit.
- `InterventionCalendarStore` — the interventions inside a bounded date window.
  **Currently dormant**: the calendar render is not part of the rebuilt list page.
- `InterventionStatisticsStore` (5.3) — component-scoped (provided in
  `InterventionsPage`); one `withQueryState` slice over
  `InterventionService.statistics`, backing the list page's KPI strip
  (`app-intervention-kpi-strip`, `ui/components/`). The snapshot is
  **whole-organization, not filter-scoped** — the backend endpoint takes no
  narrowing beyond `organization` — so the page reloads it only on an
  organization switch, never on the list's own search/filter/sort/page
  changes that reload `InterventionStore`. There is no cross-store refresh on
  create/delete/transition either: the strip is a coarse "state of the
  organization" snapshot, not a precise live counter, and wiring it to every
  list mutation would trade a simple, obviously-correct reload trigger for a
  fragile one covering a case the KPI strip's own purpose does not need.

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

## Published Contracts

The root `index.ts` stays deliberately narrow (see the comment in the file): a wide barrel
drags the IndexedDB/offline graph into every consumer's initial bundle. It publishes:

- `provideInterventionsFeature` — bootstrap providers.
- `InterventionService` — the transport service, consumed by the parent feature's landing page
  (`OrganizationTodayStore`) to list the interventions each work queue holds. Exported from its
  implementation path rather than through `./data-access`, because that barrel also carries the
  offline services.

Nothing else is published from the root barrel — `withSyncIndicator` included: `organization/providers/index.ts`
imports it from `providers/sync-indicator`'s own local `index.ts` directly, the same deep-import shape
`withAssistantToggle` uses for collaboration's assistant provider, precisely so this widening never has to
flow through (and thereby widen) the deliberately narrow root barrel above.

The parent feature additionally consumes three
concern-level barrels, which are public surfaces in their own right (ARCHITECTURE.md §13.2):

- `models` — `InterventionOutput`, the queue types, the status/priority unions.
- `utils` — `buildInterventionQueueRequests`, the catalogue mapping a named question to the
  collection queries answering it.
- `data-access` — `InterventionOfflineService`, for the "waiting to sync" queue. This one does
  pull the offline graph in, deliberately: the landing page must list local work, and
  `InterventionSyncIndicator` injects the same service for the shell's sync indicator.
- `ui/components` — `InterventionTag`, so a queue row renders an intervention enum through this
  feature's own registry rather than a copied map.

Internal code imports deep paths directly.

## Cross-Feature Dependencies

- Depends on organization route context and permissions from the parent `features/organization`
  feature (`organizationPermissionGuard` from `@features/organization/http/guards`,
  `ORGANIZATION_PERMISSION` from `@features/organization/models`).
- Consumes `ListPagination` from the parent `features/organization` feature
  (`@features/organization/ui/components`) for the list page's shared pagination band — see
  `organization/FEATURE.md` § UI Conventions.
- The parent feature consumes this feature's public API for its landing page's work queues
  (ARCHITECTURE.md §4): the root barrel's `InterventionService` plus the `models`, `utils`,
  `data-access` and `ui/components` concern barrels listed above. Read-only — the parent lists
  and counts interventions and reads the local outbox, but owns no intervention state and takes
  no workflow decision.
- `?create=1` on the index route is part of that contract: it is how the parent's landing page
  starts an intervention without duplicating the creation drawer.
- May reference facility, equipment, and inspection ids as linked counts on the workspace properties
  rail, but must not absorb ownership of those sibling organization subfeatures.
- The detail page's "Linked" tabs cross-import `FacilityService`, `EquipmentService` and
  `InspectionService` straight from each sibling's `data-access` barrel
  (`@features/organization/features/{facilities,equipments,inspections}/data-access`) — the same
  established pattern `intervention-sync.service.ts` and
  `InterventionPlanningOptionsStore` already use for the same three siblings, extended with one
  read-only method per service (`listByIntervention`). Read-only: this feature lists a sibling's
  records scoped to one intervention and renders them through its own tables; it creates, edits and
  deletes nothing on their behalf, and owns no facility/equipment/inspection state beyond the three
  call states in `InterventionLinkedResourcesStore`.
- The detail page's Discussion sheet (6.2) embeds `SubjectDiscussion` from
  `@features/organization/features/collaboration/ui/components` — an approved cross-feature
  dependency, recorded in collaboration's own `FEATURE.md` under Published Contracts. This feature
  supplies `organizationId`/`interventionId` and gates the trigger on
  `organization.messaging.read`; it owns no messaging state, injects no collaboration store or
  service directly, and the sheet's only wiring is the component's own inputs.

## Detail workspace composition

The detail page (`ui/pages/intervention-detail-page`) is **tabbed again**, on
direct instruction after a same-session correction to the 4.5 redesign this
document originally described (see `### The rail is not the retired
workspace tabs` for why this is not a reopening of the 3.0/4.0 retirements).
Three regions, left to right at `lg` and up:

1. **The rail** (`hlm-tabs-list`, `orientation="vertical"`, narrow, `w-fit`)
   — six triggers: Overview, Changes, Attachments, Facilities, Equipment,
   Inspections, every one but Overview carrying a live count
   (`pendingChangesCount()`, `store.attachments().length`, then the three
   `intervention.*Count` fields). It is the **first** grid track's own
   internal flex layout (`<hlm-tabs orientation="vertical">` renders as a
   flex row when vertical — brain's own mechanism for a side-rail, not a
   page-level grid track of its own), not a fourth column.
2. **The active tab's panel**, filling the rest of that same first track
   (`flex-1` on `[hlmTabsContent]`, from the component). **Overview** holds
   the readiness checklist, the mobile issues checklist, the work-item
   table, the activity thread and the comment form. **Changes** and
   **Attachments** each hold the one component that used to sit inside
   Overview (`app-intervention-change-list` / `app-intervention-attachments`),
   mounted lazily (`hlmTabsContentLazy`) on first activation — a DOM-mount
   deferral only, since `InterventionWorkspaceStore` already loads both
   with the rest of the workspace on entry. **Facilities / Equipment /
   Inspections** each render one read-only `hlmTable`
   (`InterventionFacilitiesTable`/`…EquipmentTable`/`…InspectionsTable`)
   from `InterventionLinkedResourcesStore`, mounted lazily
   (`hlmTabsContentLazy`) on first activation and kept mounted after — for
   these three, the mount deferral also gates the sibling-feature fetch.
3. **The second grid track — unchanged, and tab-independent.** The
   properties card and, beneath it, the desktop issues checklist (`execute`
   and `review` phases only): `sticky` (`top-32`, tuned against the band's
   measured worst case — 117px with the `changes_requested` review-note strip
   showing) at `lg` and up, in normal document flow below. Nothing here
   reacts to which of the six tabs is active — see `### The rail is not the
retired workspace tabs` for why that is the invariant that matters.

The outer grid is therefore still `lg:grid-cols-[minmax(0,1fr)_20rem]`,
**unchanged** from before this rail existed — the rail-plus-panel split lives
entirely inside `<hlm-tabs>`'s own flex layout in the first track, not in a
new grid-template.

**The second track stays page-local — `DASHBOARD_PANEL_SLOT` was considered
and declined (5.1).** The shell's panel slot is for shell-contextual rails; this
column is route-record page content whose tab-independent visibility is an
invariant of this document, with its own sticky behavior inside the page grid,
independent of the status band that now serves the forward action at every
width instead of a below-`lg` fallback. Migrating it would change the
rendered geometry — a sixth layout redesign — and the slot has no production
consumer to anchor against (collaboration explicitly declined it too). Do not
relitigate this without a product-level reason.

**Page decomposition (5.1) — behavior-frozen extractions, layout untouched.**
The page component delegates to units that carry their own specs: the label
derivations live in `utils/intervention-summary/`; the capability surface
(phase, permission gates, the mutability matrix, the status-menu targets) is
built by `createInterventionCapabilities` (`utils/intervention-capabilities/`),
a factory over page-owned signals — a factory rather than store computeds
because the workspace store and the route-provided member-access store live in
different injectors; the abandon/delete/skip confirmation is the presentational
`ui/dialogs/intervention-confirm-dialog/` (its request/accepted types in
`models/intervention-confirm/`); publication state is
`InterventionPublicationStore` (above); QR-scan matching and upload preparation
belong to `InterventionFieldExecutionService.scanToWorkItem` and
`InterventionPhotoCompressorService.prepareAll`. The page keeps same-named
protected aliases over the factory's signals, so the template contract never
changed during the decomposition. Below `lg` the container drops to `flex flex-col`: `<hlm-
tabs>` (rail, then whichever panel is active, in document order) stacks
above the properties/issues-checklist column, same order as before; the
status band sits above both, outside this container, at every width.

`InterventionDetailPage.linkedTabsOrientation` mirrors a
`(min-width: 1024px)` media query (`vertical` at `lg` and up, `horizontal`
below) into `[orientation]` on `<hlm-tabs>`, driving the same signal that
switches `hlm-tabs`' internal flex axis and keyboard handling. The same
signal also picks which list component the template renders: `hlm-tabs-list`
at `vertical`, brain's `hlm-paginated-tabs-list` (previous/next chevrons over
a horizontally-scrolling row) at `horizontal` — its own overflow pattern for
a tab row that doesn't fit its container, rather than letting the six
triggers wrap onto a second line and overlap the content below. The six
`hlmTabsTrigger` buttons live once, in a shared `#linkedTabTriggers`
`ng-template` projected into whichever list is active via `ngTemplateOutlet`,
so the two list shapes never duplicate the trigger markup or its i18n ids.
`hlm-paginated-tabs-list` only shows its chevrons once the row's `scrollWidth`
actually exceeds its container — otherwise the six triggers just fit and
scroll natively. Trade-off, stated plainly: the media query only resolves
client-side, so the very first paint (SSR and pre-hydration) always renders
`horizontal`, upgrading to `vertical` once the browser evaluates the query —
a one-time layout adjustment on desktop loads, accepted rather than adding
`PLATFORM_ID`/`afterNextRender` machinery for a cosmetic first frame.

1. **Header** — the intervention's name is the shell breadcrumb's `<h1>`
   (`interventionTitleResolver`, `data.title`), not an in-page band. Discussion
   and one `⋯` overflow menu — carrying both the status transition group (when
   `transitionTargets().length > 0`) and Duplicate/Abandon/Delete — register on
   the shell header through `PageActionsService` (`@core/page-actions`)
   instead, the same contract every other route page's header actions use
   (`organization/FEATURE.md` "Page header (shell contract)"). The status tag
   itself is on the band directly beneath (item 4).
2. **Meta line** — who acted last and when, plus the revision, derived from
   the most recent loaded activity entry (`InterventionWorkspaceStore.activities`)
   and falling back to `updatedAt` while the timeline is empty or still
   loading. Outside every section, so the last-touched summary needs no
   scroll to see.
3. **Status band** (`app-intervention-status-band`) — sticky (`top-0`)
   directly under the header, outside `<hlm-tabs>` and tab-independent, the
   host for the current phase's forward action at **every** viewport. See
   `### One address, one implementation, one host` for why the earlier
   desktop-action-box/mobile-command-bar split is retired.
4. **Page error alert** — the store's last unattributed failure.
5. **Overview tab** — `app-intervention-getting-started` (rendered only in
   `prepare`, while a prerequisite is still missing), the mobile issues
   checklist (`execute`/`review`, `lg:hidden`), the work-items block (scan
   button, `app-intervention-work-item-table`), `app-intervention-
activity-thread`, and the comment-form block.

   **The "Linked" stat-cards row (facility/equipment/inspection counts) that
   used to open this section is retired**, not carried into the Overview
   tab: with the same three counts now standing, always-visible, on the
   rail's own triggers, repeating them a second time one scroll below would
   have been the same numbers shown twice on one screen for no reason. If a
   future redesign narrows the rail's counts away (an icon-only rail, say),
   revisit whether Overview needs its own summary back.

6. **Changes / Attachments tabs** — `app-intervention-change-list` and
   `app-intervention-attachments`, each the sole content of its own lazily
   mounted (`hlmTabsContentLazy`) panel, carrying `pendingChangesCount()` /
   `store.attachments().length` as their trigger's count badge. Both moved
   out of Overview in the same change that introduced the status band; see
   `### The rail is not the retired workspace tabs` for what that narrows.
7. **Facilities / Equipment / Inspections tabs** — one `hlmTable` each, read
   for the intervention's own linked records, no pagination, no row actions
   (see the tables' own component docs for the column sets).
8. **Properties card** (second grid track, top) — `app-intervention-
properties-grid` inside an `hlmCard`, always mounted, tab-independent.
   Activating a getting-started item for `site`, `responsible` or `schedule`
   opens its in-place editor directly; there is no disclosure to expand
   first, because the card is never collapsed.
9. **Desktop issues checklist** (second grid track, beneath the properties
   card, `execute`/`review` only, `max-lg:hidden`) —
   `app-intervention-issues-checklist`, the same component the Overview
   tab's mobile copy renders; each viewport sees exactly one of the two. The
   second track as a whole — properties card and this checklist together —
   is what stays `sticky` (`top-32`, tuned against the band's measured worst
   case — 117px with the review-note strip showing) at `lg`.
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
panel.** `blockerIssues().length` and the phase's forward action both render
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

The band breaks out of the page padding (`-mx-4 md:-mx-6`) and blurs its
background over whatever scrolls beneath it (`bg-background/95 backdrop-blur`),
so it reads as a fixed toolbar rather than a floating card at any width.

### The forward move has one gate

`transitionTargets()` — a labeled group inside the header's `⋯` overflow menu
(`data-testid="intervention-detail-transition"`, folded in alongside
Duplicate/Abandon/Delete rather than its own standalone trigger) — offers
only the moves the status band does **not** own: starting or reopening field
work (`in_progress`) and sending an intervention back (`changes_requested`).

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
toast and leaves the change untouched). `app-intervention-change-list` offers a
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
the content sections; a reviewer's note is a strip inside the status band,
below the badge/phase/action row; a failed activity fetch is an alert with a
retry inside the Activity section; the blocker count is the band's own
control, and the blocking compliance issues it points at sit in the issues
checklist; a publication failure is inline in the publish confirmation,
which stays open so the operator can retry; and an unsynced outbox is the
shell's own sync indicator rather than a dismissable page-level banner (see
`### Offline`). A
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

`hlm-alert` has exactly two variants and the theme carries no success or warning
token, so a notice's kind is conveyed by its **icon and title, never by colour**.
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

Five mutually exclusive states, in priority order (a dropped connection
outranks a blocked replay, which outranks one in flight, which outranks
self-syncable work still queued): **offline** (muted glyph, popover explains
the offline state and any pending count), **blocked** (destructive glyph plus
a count badge, popover carries Retry blocked / Discard blocked — discard
confirm-gated because it is data loss), **syncing** (spinner), **pending**
(neutral glyph plus a count badge, popover offers Sync now), **synced**
(quiet, no badge, popover states "Last synced `<relative time>`" via
`InterventionSyncCoordinatorService.lastSyncedAt`, reusing
`formatInterventionRelativeTime` — this indicator is its third consumer
alongside the detail page's meta line and its activity thread). Resolves to
`synced` server-side without an explicit SSR guard:
`ConnectivityService.online` is optimistic-online there, and the coordinator
and outbox signals default to their empty values before any IndexedDB access
runs.

Being a shell widget, `InterventionSyncIndicator` is — unlike every other
component in this feature — allowed to inject `InterventionSyncCoordinatorService`,
`InterventionOfflineService` and `ConnectivityService` directly rather than
taking them as inputs (`ARCHITECTURE.md`: "Layouts may render feature-owned
widgets through public APIs"). Publishing `withSyncIndicator()` to
`app.routes.ts` therefore pulls the whole offline/IndexedDB graph into the
dashboard shell's own bundle, the same trade-off `withAssistantToggle()`
already accepts for the assistant — accepted here because the indicator now
being permanent means that graph loads for every dashboard visit regardless.

The indicator's trigger deliberately keeps the retired component's
`data-testid="intervention-sync-status"` rather than minting a new one, so
every existing sync locator — e2e specs and page objects included — survives
the migration unchanged.

### Discussion sits beside the activity thread, not inside it

The header's Discussion button (6.2, gated on `organization.messaging.read`) opens a right-anchored
sheet holding collaboration's `SubjectDiscussion` — live team messaging, Mercure-backed, the same
surface a channel or a direct conversation renders. It is a different thing from
`app-intervention-activity-thread`: the activity thread is the system record (status changes,
field-work events) plus the intervention's own comments, append-only and part of the compliance
history; the discussion is ephemeral team chatter that never becomes part of that record. Neither
absorbs the other.

### Comment mentions

`app-intervention-comment-form` inserts the backend's own `@{memberUuid}`
token verbatim when a mention is picked (typed `@` or the at-sign trigger
button) — there is no label-to-marker rewrite step, unlike collaboration's
message composer, because the backend notifies (in-app + email,
`intervention.comment_mention`) off exactly that token in the stored body.
`app-intervention-activity-thread` resolves the same tokens client-side to
render a name; both share `utils/intervention-mentions/`. See both
components' own docs for the mirrored-vs-shared reasoning against the
collaboration feature's caret-query machinery.

### Attachments and field capture

`app-intervention-attachments` (between Changes and Activity) lists the
intervention's files and offers a picker plus a camera capture whose images the
page shrinks through `InterventionPhotoCompressorService` before upload. Picks
are pre-checked against the backend's MIME whitelist (images + PDF), the
**25-file cardinality cap**
(`AttachmentConstraints::MAX_ATTACHMENTS_PER_PARENT`) and — for non-image
files only — its 10 MiB ceiling: a multi-megabyte camera capture is exactly
what the compression pipeline exists for, so images skip the local size check
and the server stays authoritative on the final size; rows delete
confirm-gated and lock on their own write via the store's
`pendingAttachmentIds`. The cap surfaces as a `n / 25` badge that appears once
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
download became its second consumer. **Approved exception:** upload is
**online-only** (the outbox has no attachment operation), a documented
backend follow-up. The QR button in the field-work section
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
attachments card shows it as a subtle chip naming the work item (resolved
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
"Skip" button and the dialog's own Escape/backdrop close both count as
declining the nudge and submit unsigned — the backend does not mandate a
signature, so nothing here should read as blocking. Confirming instead uploads
the PNG through the workspace store's `uploadAttachment` with `kind:
'signature'`; the submit transition is **not** dispatched inline — it chains
off the store's `attachmentUploadSucceeded` event once the upload has actually
landed (a page-local `signingSubmitPending` flag arms the chain and is cleared
either by that event or by the write's own `attachmentWriteCallState` turning
to error), so a failed upload never silently submits an unsigned intervention.
One design note worth keeping: setting the dialog's `visible` input to `false`
from the capture handler still flows back through `hlm-dialog`'s own close
notification, so the page's dismiss handler is a no-op while
`signingSubmitPending` is set — otherwise a successful capture would also fire
an extra, unwanted unsigned submit.

Display: `app-intervention-publication-summary` gains a signed/unsigned line
(icon + label, never colour alone) from `hasSignature`, rendered in both its
call sites (the rail's publication group and the publish confirmation) from
the one definition, same as its other stats. The attachments card shows a
small "Signature" chip on `kind: 'signature'` rows, reusing the existing chip
pattern next to the work-item chip.

### Write attribution is exact, not approximated

The store's former **single `mutationCallState` for every write** — and the
page-side approximation it forced (`pendingWorkItemId`, a `settleWrite` driven
by the global `saving`) — is retired. Every write concern has its own named
call state, the in-place fields settle on `updateDetailsCallState` alone, each
overlay (comment composer, add-work-item sheet, request-changes sheet) binds
the call state of the write it actually performs, and per-row attribution for
the concurrent `mergeMap` writes is the store's own `pendingWorkItemIds` /
`pendingChangeIds` sets. Two writes in flight now each mark their own row, and
one write's success can no longer clear another's error. `busy` on the
work-item table still gates only the add affordances, whose sheet is modal.

## Status / enum presentation (badges & select options)

Every intervention enum (`priority`, `status`, `type`, `workItemAction`,
`workItemStatus`, `issueSeverity`, `changeStatus`, `inspectionResult`) renders
from a single source of truth, so the same value looks identical everywhere and
status is never conveyed by colour alone (icon + label always present).

Three more kinds extend the same registry for the Linked tabs'
sibling-feature statuses — `inspectionStatus`, `facilityStatus`,
`equipmentStatus` — cross-importing `InspectionStatus`/`FacilityStatus`/`EquipmentStatus`
from their owning features' `models` barrels the same way `inspectionResult`
already did. This is the established pattern, not a new one: extend the
registry rather than inventing a per-feature tag component when this
feature already renders another feature's enum.

- `models/intervention-tag/` — the vocabulary (plain TS, no Angular), exported
  through the feature `models/` barrel: the descriptor interface, the kind and
  severity unions, and `resolveInterventionTag(kind, value)` with a graceful
  fallback for unknown values. This is one of the two sanctioned runtime
  exceptions inside `models/` (ARCHITECTURE.md §10.10).
- `ui/components/intervention-tag/` — `<app-intervention-tag kind value />`, the
  one rendering. An `outline` `hlm-badge` where only the glyph carries the tone;
  `asOption` drops the badge and renders the same icon and label as a plain row,
  for use inside a select or combobox item.
- The severity tints are **literal Tailwind palette pairs** in that component's own
  `constants/`, because the theme has no `--success` / `--warning` / `--info`
  token. That file is private to the tag: other surfaces write their own literal
  pairs rather than reaching into it (§2.8).

To add a new enum value, extend the relevant descriptor map only — every consumer
follows.

## Conventions (apply to all work in this feature)

- **Tech**: Angular 22 standalone components, signals (`input()`, `computed()`,
  `signal()`), `ChangeDetectionStrategy.OnPush`; Tailwind
  utilities for styling. **Never edit `src/styles.css`** — style with Tailwind
  classes and the spartan theme tokens; literal class strings only (Tailwind scans them).
- **Architecture**: keep the `models/` (interfaces, types and the small pure
  utils that operate on them) · `data-access/` (HTTP + local IndexedDB
  transport) · `services/` (behavior coordinators) · `state/` (SignalStore) ·
  `ui/` split. `ui/` holds `pages/`, `forms/`, `tables/`, `sheets/`,
  `dialogs/`, `components/`; one folder per unit with an `index.ts` barrel. **Shared types/data live in `models/`** —
  co-located in the unit's own `models/` folder, or in the feature-level
  `models/` when used across components. Do NOT invent sibling layers (e.g. a
  `presentation/` folder). Presentational components stay dumb (inputs/outputs
  only); orchestration lives in pages.
- **Docblocks**: every class, public/protected member and exported function
  carries the project JSDoc style (`@description`, `@access`, `@since`, `@type`,
  `@param`, `@returns`).
- **Strict TypeScript**: explicit types, `readonly` members, no `any`; reuse
  shared model types rather than redeclaring shapes.
- **Quality gate** before considering work done: `npm run format` (oxfmt),
  `npm run lint` (oxlint) and `npm run build` must pass, plus the feature specs.
- **UI notes**: `hlm-sheet` widths are one of three named sizes, an app-wide
  convention (not only this feature's sheets — `organization-role-permissions-sheet`
  and `channel-participants-sheet` follow it too) — `sm:w-[480px]` (default:
  work-item, request-changes, role-permissions, participants), `sm:w-[540px]`
  (create, to fit the template picker) and `sm:w-[560px]` (discussion, to fit
  the message thread). Every width utility on `hlm-sheet-content` needs the
  `!` important marker (`w-full! sm:w-[…px]! sm:max-w-none!`) — `HlmSheetContent`'s
  own base classes carry `data-[side=right]:sm:max-w-sm` and `data-[side=right]:w-3/4`,
  which beat a plain same-specificity utility. The three form-sheets (create,
  request-changes, work-item) pin their embedded form's submit row in a sticky
  `hlm-sheet-footer`: the form's own host is `flex min-h-0 flex-1 flex-col`,
  its `hlm-field-group` scrolls independently (`min-h-0 flex-1
overflow-y-auto`), and the footer sits outside that scroll region as the
  form's last flex child — the form keeps owning the buttons; only the sheet's
  layout changed. That footer stays `flex-col sm:flex-row` (never
  `flex-col-reverse`): DOM order, visual order and tab order must agree at
  every breakpoint (WCAG 2.4.3), so Cancel-first-in-DOM already puts Submit
  last — nearest the thumb on a bottom-anchored mobile sheet — without a
  reversed row.
- **Padding ownership**: these same three form-sheets keep `px-4` on their
  own `hlm-field-group` rather than moving it to the sheet host, unlike the
  page/dialog-hosted create forms elsewhere in `organization` (which inherit
  their gutter from `hlmCard`/the dialog panel). `hlm-sheet-content` supplies
  no inset of its own — header and footer self-pad via their own component
  styles — so the scrollable field group is the only element that can own the
  scroll region's horizontal padding without either double-padding the footer
  or restructuring the sticky-footer-inside-the-form layout the paragraph
  above documents. Cross-referenced from `organization/FEATURE.md` § UI
  Conventions, where the create-surface placement rule lives.

## Invariants

- **Publication is confirm-gated, and the confirmation _is_ the recap.** The phase
  command in `review` only opens the dialog; `publishIntervention()` is `private`
  and reachable solely from its accept handler. `app-intervention-publication-summary`
  now renders in exactly one place — the publish confirmation — fed from the
  same signals the status band's forward action reads, so what the dialog
  recaps and what the band's disabled reason implies cannot drift.
  Publication is the one step that writes to the compliance record.
- **A mutating confirm dialog stays open, busy-locked, until the write
  settles.** The interventions delete confirm mirrors the publish
  confirmation's own rule: it stays open on failure and shows the outcome
  inline, so the operator sees it exactly where they took the action and can
  retry without reopening the dialog, rather than the failure surfacing only
  as a page-level toast.
- **The phase's forward action has exactly one _live_ address, and one
  implementation, at every viewport.** `app-intervention-command-button` is
  the only markup; `app-intervention-status-band` is its only host, sticky
  under the title row. Nothing else on the page renders that action. See
  `### One address, one implementation, one host` — this retires the earlier
  two-hosts-by-breakpoint design (`app-intervention-action-box` /
  `app-intervention-command-bar`), itself a fix for "renders exactly once"
  once the grid collapse made that false on the primary persona's device.
- **The forward move is gated in exactly one place.** The status menu
  (`transitionTargets()`) subtracts `commandTransitionTarget()`, so a phase's
  forward transition can only be taken through the action the readiness gate
  guards. A second control performing the same transition without the check makes
  the gate advisory, which is what it did for `draft → planned` and
  `in_progress → submitted`. See `### The forward move has one gate`.
- **A row locks and spins on its own write, never on any write** — work-item
  rows and change rows alike. `isRowPending` reads membership in the store's
  `pendingWorkItemIds` / `pendingChangeIds` sets; `busy` gates only the add
  affordances. The store queues these writes with `mergeMap` specifically so an
  agent can tick items quickly — a template that disables the whole list undoes a
  deliberate store decision, silently.
- **The activity timeline is loaded newest-page-first**, because the API sorts
  ascending and `metaLine()` reads the last loaded entry as the most recent
  event. Reading page 1 and stopping made the header report the oldest event on
  the record. Older pages are prepended on demand
  (`hasOlderActivities` / `loadOlderActivities`); a partial window always says so.
- **Nothing that gates publication readiness is visible only inside a
  scrollable section.** `app-intervention-status-band` reads `blockerIssues().length`
  directly from the page's own signal, not from the Changes tab or the issues
  checklist it points at. This is the structural fix for the exact failure
  the 2.0 tabbed design was retired for (see `### Retired invariants`): a
  count that exists only inside a hidden panel is a count an operator can
  miss.
- **Every page-level notice renders once, at the location it concerns, never
  as a ranked stack.** An unattributed store error is a single alert above the
  sections; every other condition (reviewer note, blockers, unsynced outbox,
  activity-fetch failure, publication failure) has exactly one home inside the
  section, band or dialog it belongs to. A field-level rejection is
  excluded from the top-of-page alert (`pageError`) so it is never shown twice.
- **A failed load renders its reason and a retry, not "not found".** The
  in-page alert cannot report a failure that produced no intervention, so
  `store.loadFailed()` is its own branch. Never nest the load error inside the
  branch that requires a loaded intervention — that is the exact regression this
  invariant exists to prevent.
- **Publication says what it does, and reports that it is doing it.** The dialog
  names the compliance record before the recap, swaps its button to a spinner and
  a `role="status"` line while the write and its poll run, and confirms success —
  the one irreversible write in the product must not look like a frozen modal.
  The poll itself is **bounded** (~2 minutes) and its exhaustion is
  **recoverable, not terminal** (5.3): a publication stuck server-side past
  the bound surfaces as a distinct timed-out state — "still running in the
  background" with a single-shot "Check again" (`recheck()`, one re-read of
  the publication, no new poll) — never as a spinner that outlives the
  operator's patience, a false success, or a dead-end failure for a write
  that may yet complete. Past ~30 seconds the in-flight copy switches to a
  still-working variant so a long publication reads as long, not frozen. A
  genuine `failed` result still reports inline as before.
- **The page's fixed elements never reorder (WCAG 2.4.3).** Header → meta →
  status band → error alert → tab rail/panel → properties card → desktop
  issues checklist → prev/next never changes with phase — properties card and
  the issues checklist are the second column's own top-to-bottom order,
  unaffected by which of the six tabs is active. The band's position is fixed
  at every width; only its content follows the phase.
- **Rejection is the only client action on a proposed change.**
  `UpdateInterventionChangeInput.status` only accepts `'proposed' | 'rejected'`,
  never `'applied'` — acceptance happens automatically at publication, not
  through a client action. `InterventionWorkspaceStore.rejectChange` is the one
  write, and `app-intervention-change-list` offers it per row only when the
  page grants `canReject` (see `### Proposed changes: reject is the only
client action`).
- **Every property is edited where it is displayed, and each affordance opens a
  different editor.** This supersedes the old "one edit entry, not one per row":
  that rule existed because four pencils all opened the _same_ planning drawer, so
  the affordance advertised four scopes and delivered one. Under in-place editing
  each control genuinely edits its own property, which is the condition the old
  rule was protecting.
- **Deletion goes through `InterventionStore`, never `InterventionWorkspaceStore`.**
  Only the list store removes the entity, decrements `totalInterventions` and
  repairs `orderedIds()` — which the detail page's own prev/next walks. Calling the
  workspace one leaves a ghost id that nothing repairs, because that store is torn
  down on navigation. `InterventionWorkspaceStore.delete` is therefore **unreachable
  from the UI**; it is kept dormant rather than removed, and must not be wired to a
  surface without revisiting this.
- **The detail page's delete gate is the split-capability one** (`INTERVENTIONS_PLAN`
  for a draft, `INTERVENTIONS_EXECUTE` for an abandoned intervention), narrowed first
  through `isInterventionDeletable`. The list page's row and bulk delete gate on
  `INTERVENTIONS_WRITE` instead — this feature has no delete-specific permission
  (the same approved exception as `facilities`). The two are intentionally different
  gates on the same `DELETE /api/interventions/{id}`, and both now ship: keep them
  explicit rather than collapsing one into the other.
- **A row or bulk delete is never offered for a status the API would refuse.**
  `InterventionTable`, `InterventionsPage` and `InterventionDetailPage` all narrow
  through the shared `isInterventionDeletable` util (`utils/intervention-deletable/`,
  statuses `draft`/`abandoned`) rather than duplicating the check, so the surfaces
  cannot drift. A bulk selection is filtered to its deletable subset before the
  confirm dialog opens — the count it shows is always what will actually delete,
  never a promise a 409 would break.
- Intervention workflows remain organization-scoped.
- Offline outbox replay belongs to this subfeature, not `core`.
- Intervention pages orchestrate intervention services and intervention stores.
- Intervention route pages live under `ui/pages/`.

### Retired invariants

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
  tab, and the properties card is a column rather than a tab, so the specific
  failure the 2.0 design was retired for (a count invisible unless the right
  tab happened to be open) cannot recur. `detailsExpanded`, the
  `hlmCollapsible` "Details" section and its collapsed chip-row summary
  (`intervention-detail-chips`) are gone with it — the properties card is
  never collapsed, so there is nothing left to summarize.
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
  explicitly ruled out. `activeLinkedTab` and `linkedTabsOrientation`
  replace the retired `activeTab`/`tabOrientation` pair, and
  `InterventionLinkedResourceTabId` replaces the retired
  `InterventionDetailTabId`.
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
