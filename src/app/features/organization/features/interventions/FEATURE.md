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

Data-access (transport boundary — `data-access/`):

- `InterventionService` — HTTP API service (`HydraApiService`). Also owns the
  intervention activity timeline (`listActivities`, `addComment`).
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

## Published Contracts

The root `index.ts` stays deliberately narrow (see the comment in the file): a wide barrel
drags the IndexedDB/offline graph into every consumer's initial bundle. It publishes:

- `provideInterventionsFeature` — bootstrap providers.
- `InterventionService` — the transport service, consumed by the parent feature's landing page
  (`OrganizationTodayStore`) to list the interventions each work queue holds. Exported from its
  implementation path rather than through `./data-access`, because that barrel also carries the
  offline services.

Nothing else is published from the root barrel. The parent feature additionally consumes three
concern-level barrels, which are public surfaces in their own right (ARCHITECTURE.md §13.2):

- `models` — `InterventionOutput`, the queue types, the status/priority unions.
- `utils` — `buildInterventionQueueRequests`, the catalogue mapping a named question to the
  collection queries answering it.
- `data-access` — `InterventionOfflineService`, for the "waiting to sync" queue. This one does
  pull the offline graph in, deliberately: the landing page must list local work, and the
  detail page injects the same service for its `unsynced` notice.
- `ui/components` — `InterventionTag`, so a queue row renders an intervention enum through this
  feature's own registry rather than a copied map.

Internal code imports deep paths directly.

## Cross-Feature Dependencies

- Depends on organization route context and permissions from the parent `features/organization`
  feature (`organizationPermissionGuard` from `@features/organization/http/guards`,
  `ORGANIZATION_PERMISSION` from `@features/organization/models`).
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

## Detail workspace composition

The detail page (`ui/pages/intervention-detail-page`) is **tabbed again**, on
direct instruction after a same-session correction to the 4.5 redesign this
document originally described (see `### The rail is not the retired
workspace tabs` for why this is not a reopening of the 3.0/4.0 retirements).
Three regions, left to right at `lg` and up:

1. **The rail** (`hlm-tabs-list`, `orientation="vertical"`, narrow, `w-fit`)
   — four triggers: Overview, Facilities, Equipment, Inspections, the last
   three carrying their live `intervention.*Count`. It is the **first** grid
   track's own internal flex layout (`<hlm-tabs orientation="vertical">`
   renders as a flex row when vertical — brain's own mechanism for a
   side-rail, not a page-level grid track of its own), not a fourth column.
2. **The active tab's panel**, filling the rest of that same first track
   (`flex-1` on `[hlmTabsContent]`, from the component). **Overview** holds
   every section this page rendered before the rail existed — readiness
   checklist, work items, changes, attachments, activity, comments — moved
   here unchanged, not rebuilt. **Facilities / Equipment / Inspections**
   each render one read-only `hlmTable`
   (`InterventionFacilitiesTable`/`…EquipmentTable`/`…InspectionsTable`)
   from `InterventionLinkedResourcesStore`, mounted lazily
   (`hlmTabsContentLazy`) on first activation and kept mounted after.
3. **The second grid track — unchanged, and tab-independent.** The
   properties card and, beneath it, the action box, exactly as before this
   change: `sticky` (`top-4`) at `lg` and up, in normal document flow below.
   Nothing here reacts to which of the four tabs is active — see
   `### The rail is not the retired workspace tabs` for why that is the
   invariant that matters.

The outer grid is therefore still `lg:grid-cols-[minmax(0,1fr)_20rem]`,
**unchanged** from before this rail existed — the rail-plus-panel split lives
entirely inside `<hlm-tabs>`'s own flex layout in the first track, not in a
new grid-template.

**The second track stays page-local — `DASHBOARD_PANEL_SLOT` was considered
and declined (5.1).** The shell's panel slot is for shell-contextual rails; this
column is route-record page content whose tab-independent visibility is an
invariant of this document, with its own sticky behavior inside the page grid
and a below-`lg` fallback to the command bar. Migrating it would change the
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
above the properties/action-box column, same order as before.

`InterventionDetailPage.linkedTabsOrientation` mirrors a
`(min-width: 1024px)` media query (`vertical` at `lg` and up, `horizontal`
below) into `[orientation]` on `<hlm-tabs>`, driving the same signal that
switches `hlm-tabs`' internal flex axis and keyboard handling. The same
signal also picks which list component the template renders: `hlm-tabs-list`
at `vertical`, brain's `hlm-paginated-tabs-list` (previous/next chevrons over
a horizontally-scrolling row) at `horizontal` — its own overflow pattern for
a tab row that doesn't fit its container, rather than letting the four
triggers wrap onto a second line and overlap the content below. The four
`hlmTabsTrigger` buttons live once, in a shared `#linkedTabTriggers`
`ng-template` projected into whichever list is active via `ngTemplateOutlet`,
so the two list shapes never duplicate the trigger markup or its i18n ids.
`hlm-paginated-tabs-list` only shows its chevrons once the row's `scrollWidth`
actually exceeds its container — otherwise the four triggers just fit and
scroll natively. Trade-off, stated plainly: the media query only resolves
client-side, so the very first paint (SSR and pre-hydration) always renders
`horizontal`, upgrading to `vertical` once the browser evaluates the query —
a one-time layout adjustment on desktop loads, accepted rather than adding
`PLATFORM_ID`/`afterNextRender` machinery for a cosmetic first frame.

1. **Header** — wayfinding only: the intervention `h1`, the reference number,
   the status tag with its transition menu, and an overflow menu for
   abandon/delete.
2. **Meta line** — who acted last and when, plus the revision, derived from
   the most recent loaded activity entry (`InterventionWorkspaceStore.activities`)
   and falling back to `updatedAt` while the timeline is empty or still
   loading. Outside every section, so the last-touched summary needs no
   scroll to see.
3. **Page error alert** — the store's last unattributed failure.
4. **Overview tab** — `app-intervention-getting-started` (rendered only in
   `prepare`, while a prerequisite is still missing), the work-items block
   (scan button, review-note banner, `app-intervention-work-item-table`),
   the conditional `app-intervention-change-list`, `app-intervention-
attachments`, `app-intervention-activity-thread`, and the comment-form
   block — the entire former content column, verbatim.

   **The "Linked" stat-cards row (facility/equipment/inspection counts) that
   used to open this section is retired**, not carried into the Overview
   tab: with the same three counts now standing, always-visible, on the
   rail's own triggers, repeating them a second time one scroll below would
   have been the same numbers shown twice on one screen for no reason. If a
   future redesign narrows the rail's counts away (an icon-only rail, say),
   revisit whether Overview needs its own summary back.

5. **Facilities / Equipment / Inspections tabs** — one `hlmTable` each, read
   for the intervention's own linked records, no pagination, no row actions
   (see the tables' own component docs for the column sets).
6. **Properties card** (second grid track, top) — `app-intervention-
properties-grid` inside an `hlmCard`, always mounted, tab-independent.
   Activating a getting-started item for `site`, `responsible` or `schedule`
   opens its in-place editor directly; there is no disclosure to expand
   first, because the card is never collapsed.
7. **Action box** (second grid track, beneath the properties card) —
   `app-intervention-action-box`, the host for the current phase's forward
   action from `lg` up, tab-independent. Its _content_ changes with the
   phase (a plan/submit label with its disabled reason; the blockers list,
   the `app-intervention-publication-summary` recap and the publish button
   in `review`; a locked terminal state once `published`), but its
   _position_ never does, and it is visible **regardless of which of the
   four rail tabs is active**. The second track as a whole — properties card
   and action box together — is what stays `sticky` at `lg`. Below `lg` the
   box keeps its blockers and recap and **sheds its button**
   (`max-lg:hidden`), hiding itself entirely when that leaves it empty
   (`hasStandaloneContent`).
8. **Command bar** (below `lg` only) — `app-intervention-command-bar`,
   `sticky bottom-0` outside the grid, carrying the same forward action plus
   its disabled reason. See `### One address per viewport`.
9. **Prev/next footer** — unchanged.

Activating the getting-started item for missing scope (`workItems`) switches
the rail to Overview first — `InterventionDetailPage.revealFieldWork()` —
then scrolls to and focuses the work-items section, deferred one tick when a
tab switch actually happened (`[hidden]` on the previous panel only clears
once that binding flushes). The command bar and action box call the same
method and may fire from any of the other three tabs, which is why the
switch cannot be skipped the way it could when Overview was the whole page.

### The rail is not the retired workspace tabs

`### Retired invariants` records two prior retirements of a workspace tab
rail, and a reviewer who remembers that history should read this paragraph
before flagging the current rail as reopening either one. It narrows the
same failure mode to the one thing that actually matters, rather than
claiming the page has no tabs at all — it does, again, on direct
instruction — so hold it to a sharper bar than "no tabs":

**Nothing that gates publication readiness is visible only inside a tab
panel.** `blockerIssues()`, `pendingChangesCount()` and the phase's forward
action all render from `app-intervention-action-box`, in the second grid
track, which does not belong to `<hlm-tabs>` and does not react to
`activeLinkedTab`. An operator parked on the Facilities tab still sees every
blocker and the exact same forward-action button a reviewer on Overview
does — the specific defect both earlier retirements describe (a count or a
blocker invisible unless the right tab happened to be open) cannot recur,
because the thing that must never hide behind a click was never moved
into a tab to begin with.

What genuinely is now behind a click, honestly stated: Work items, Changes,
Attachments and Activity — previously part of one continuous always-visible
flow — only render while Overview is the active tab. That is a real,
acknowledged narrowing of the 3.0 "one continuous flow" invariant, not a
distinction to argue away; it is also exactly what this instruction asked
for. The mitigation is `revealFieldWork()` switching to Overview before it
scrolls, so nothing the phase action or command bar points at is ever
unreachable — reachable through one extra click from another tab, same as
Facilities/Equipment/Inspections are reachable with one click from Overview.

### One address per viewport

The forward action has **one implementation and one live address, and which
address depends on the viewport** — not one position for all viewports, which
is what the earlier "renders exactly once" wording promised and what the grid
collapse quietly broke.

`app-intervention-command-button` is that implementation: the button, its
spinner and its disabled state, and nothing else. Two hosts render it, and
exactly one of them is visible at any width:

| Width       | Host                           | Position                            |
| ----------- | ------------------------------ | ----------------------------------- |
| `lg` and up | `app-intervention-action-box`  | second column, beneath properties   |
| below `lg`  | `app-intervention-command-bar` | `sticky bottom-0`, outside the grid |

Both read the same `commandAction()` signal and both emit into the same
`invokeCommandAction()`, so the two cannot drift and there is never a moment
with two live buttons. The bar carries only the button and the disabled
reason; when a **blocker** is the reason, that line becomes a control that
scrolls to the action box, because the list itself stays there
(`InterventionDetailPage.revealActionBox()`).

The bar breaks out of the page padding (`-mx-4 md:-mx-6`) and pads for the
home indicator (`env(safe-area-inset-bottom)`), so on a phone it is a
full-width thumb target rather than a floating card.

### The forward move has one gate

`transitionTargets()` — the status menu beside the badge — offers only the
moves the action box does **not** own: starting or reopening field work
(`in_progress`) and sending an intervention back (`changes_requested`).

It used to offer the forward move too, which made the action box's readiness
gate advisory: from `in_progress` an operator saw "Complete 3 remaining items"
(the action box deliberately refusing to offer submit) and, four pixels away,
"Submitted" — which submitted immediately, three items open, with nothing
telling the reviewer. From `draft` the menu likewise offered "Planned" without
the site/responsible/dates check.

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
the content sections; a reviewer's note sits atop the Work items section; a
failed activity fetch is an alert with a retry inside the Activity section;
blocking compliance issues sit inside the action box's `review`-phase content,
beside the publish gate; a publication failure is inline in the publish
confirmation, which stays open so the operator can retry; and an unsynced
outbox is a small header indicator rather than a dismissable banner. A
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
an IndexedDB snapshot. The visible surface is
`app-intervention-sync-status` — the **one address** for the outbox's state,
on both the list toolbar and the detail header (it replaced the header's
one-way unsynced badge): a chip that spins during a replay, shows a cloud when
operations wait, and turns destructive with a count when operations are
blocked, opening onto Sync now / Retry blocked / Discard blocked — the discard
confirm-gated because it is data loss. The chip is presentational; each page
injects `InterventionSyncCoordinatorService` and wires its signals in.

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
while drafting, `.execute` afterwards. **Approved exception:** the API exposes
no download URL yet, so rows are metadata-only and the caption says so; upload
is **online-only** (the outbox has no attachment operation) — both are
documented backend follow-ups. The QR button in the field-work section
(`scanSupported()` devices, execute phase only) decodes a capture through
`InterventionFieldExecutionService.scan`, normalizes it via
`InterventionDiscoveryService.normalizeScannedTarget` and reveals the matching
work item, or toasts when nothing matches.

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
  Run `graphify update .` after changing code.

## Invariants

- **Publication is confirm-gated, and the confirmation _is_ the recap.** The phase
  command in `review` only opens the dialog; `publishIntervention()` is `private`
  and reachable solely from its accept handler. The dialog's body is the **same
  `app-intervention-publication-summary` component** the action box renders,
  fed from the same three signals, so the recap and the dialog cannot drift.
  Publication is the one step that writes to the compliance record.
- **The phase's forward action has exactly one _live_ address, and one
  implementation.** `app-intervention-command-button` is the only markup;
  `app-intervention-action-box` hosts it at `lg` and up (second column, beneath
  the properties card) and `app-intervention-command-bar` hosts it below `lg`
  (`sticky bottom-0`, outside the grid). The two are mutually exclusive by
  breakpoint, both read `commandAction()` and both emit into
  `invokeCommandAction()`. Nothing else on the page renders that action. See
  `### One address per viewport` — the earlier "renders exactly once" wording is
  retired because the grid collapse made it false on the primary persona's
  device.
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
  scrollable section.** `app-intervention-action-box` reads `blockerIssues()`
  and `pendingChangesCount()` directly from the store, not from the Changes
  section it also renders. This is the structural fix for the exact failure
  the 2.0 tabbed design was retired for (see `### Retired invariants`): a
  count that exists only inside a hidden panel is a count an operator can
  miss.
- **Every page-level notice renders once, at the location it concerns, never
  as a ranked stack.** An unattributed store error is a single alert above the
  sections; every other condition (reviewer note, blockers, unsynced outbox,
  activity-fetch failure, publication failure) has exactly one home inside the
  section, action box or dialog it belongs to. A field-level rejection is
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
  error alert → Overview → Work items → Changes → Attachments → Activity →
  properties card
  → action box → command bar → prev/next never changes with phase — properties
  card and action box are the second column's own top-to-bottom order,
  unaffected by which sections above render conditionally. The command bar's
  position is fixed too; only its _presence_ follows the breakpoint.
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
