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

- `/organizations/:organizationId/interventions` — index page offering a
  Linear-style **List / Board / Calendar** browsing experience over one shared
  dataset, toggled with segmented toolbar view tabs and synced to `?view=`
  (default `list`, omitted from the URL). List groups interventions into
  status sections (collapsible `p-panel`s); Board lays them into
  draft/planned/in_progress/review/published columns (`app-board`,
  drag-and-drop applies a status `transition`, gated by the workflow policy
  and RBAC capability) with a "Show abandoned" toggle for a 6th read-only
  column; Calendar reuses the existing bounded-window calendar. A header
  search box debounces into `?q=` and reloads the store with a server-side
  `name` filter. `?create=1` opens the guided creation drawer on arrival and is
  consumed once, so the parent feature's landing page can offer "New
  intervention" as a primary action that actually starts the work.

  A toolbar sits under the canonical page header: render selector, search, a
  filter popover (status, type, site, responsible, deadline window), a sort
  popover (due date / creation / priority, either direction) and the
  "Show abandoned" toggle. **Every one of those narrowings reaches the wire** —
  the ten query parameters the API accepts used to be dead. Sort, fold state and
  the abandoned toggle are remembered in a cookie by
  `InterventionListPreferencesService`; filters deliberately are not, being
  questions asked now rather than reading preferences.

  **Work views** sit above that toolbar: five shipped questions (All, Mine,
  Overdue, To review, Drafts) then up to five the operator saves. A view carries
  its narrowing, its ordering, its **grouping** and its render, so selecting one
  applies all four; the active view is marked when the toolbar has changed it
  since. Views and the open view id live in the same cookie as the rest, through
  `InterventionListPreferencesService`. The built-in "Mine" stores the `@me`
  sentinel in `responsible`, resolved to the current member at query time so a
  stored view never hard-codes whoever created it.

  **Each render groups by what it is**: the list by the view's grouping (status,
  deadline window, site or responsible), the board by workflow status — its
  drag-and-drop _is_ a status transition — and the calendar by date. A view's
  grouping therefore applies to the list render only, by design.

  **One behaviour across the three renders** is an invariant: "Show abandoned"
  applies to List, Board and Calendar alike (it used to exist on the Board
  alone), and the non-date filters are forwarded to the calendar's own bounded
  query — its visible window remains its only date filter. The metric strip is
  gone from this page (`InterventionSummaryStore` is unused here, kept for a
  future dashboard).

- `/organizations/:organizationId/interventions/:interventionId`

## State and Data Access

Stores:

- `InterventionWorkspaceStore` additionally owns `delete` (`InterventionService.remove`, the canonical `DELETE /api/interventions/{id}`): only `draft` or `abandoned` interventions may be deleted (permission `INTERVENTIONS_PLAN` for draft, `INTERVENTIONS_EXECUTE` for abandoned — see `canDeleteIntervention` on the detail page), surfaced as a confirm-gated "Delete intervention" entry in the header overflow menu. The 409 for any other status is surfaced verbatim via the inline workspace error banner; success dispatches `deleteSucceeded` (toast) and the page navigates back to the list.
- `InterventionStore` — component-scoped (provided in `InterventionsPage`); intervention list and creation (normalized entities + request state). `load` accumulates up to 500 interventions across 100-item pages (the backend clamps `itemsPerPage` at 100) and sets `isListCapped` when the organization has more, driving the list page's "refine your search" notice. `transition` applies a single status change optimistically (entity patch → PATCH with `If-Match` → merge fresh output on success, rollback + `transitionFailed` toast event on error); `orderedIds` exposes the current entity order for prev/next navigation.
- `InterventionWorkspaceStore` — component-scoped (provided in `InterventionDetailPage`); the active intervention workspace (intervention, work items, changes, issues) with online/offline mutations. Async state is held as `loadCallState` (the workspace fetch), `mutationCallState` (shared by every write) and `activityCallState`; `loading`, `saving` and `error` are derived signals over them, and `mutationError` exposes the normalized `StoreError` so a page can hand a 422 to the form that caused it. Also owns the activity timeline (`activities`, `loadActivities`, `addComment`); comment posting is refused outright while offline (not queued to the outbox) and failures dispatch a `commentAddFailed` toast event via `interventionWorkspaceStoreEvents`.
- `InterventionCalendarStore` — component-scoped (provided in `InterventionsPage`); the interventions inside a bounded date window (the visible month ± one month) plus the current member IRI driving the calendar card's All/Mine scope. Loaded for the active organization and refetched when the visible month changes (fed by the calendar's `focusedDateChange`); the window is fetched as the de-duped union of a `plannedStartAt`-range query and a `dueAt`-range query (the anchor is `plannedStartAt ?? dueAt`), and the member IRI is resolved once per organization and reused across window refetches.
- `InterventionSummaryStore` — component-scoped (provided in `InterventionsPage`); loads the full organization intervention set once (via `InterventionService.listAll`) and derives the dashboard metric-strip KPIs (in progress, planned, overdue, blocked). Overdue and blocked exclude interventions in a terminal status (`published`, `abandoned`).
- `InterventionHeaderStore` — root-provided bridge between the detail page and the workspace layout's page-header action slot: the page publishes its header view state (phase action, request-changes, prev/next, overflow) and clears it on destroy; the slot widget renders from it and dispatches `interventionHeaderEvents` back to the page.

Data-access (transport boundary — `data-access/`):

- `InterventionService` — HTTP API service (`HydraApiService`). Also owns the
  intervention activity timeline (`listActivities`, `addComment`).
- `InterventionLabelService` — HTTP API service (`HydraApiService`) for the
  organization-scoped intervention label catalog (CRUD); labels are embedded
  as `InterventionLabelSummary` on `InterventionOutput.labels`.
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
- `withInterventionHeaderActions`, `withInterventionSyncChip` — workspace shell contributions.
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
  workspace shell already mounts the sync chip, which injects the same service.
- `ui/components` — `InterventionTag`, `InterventionPriorityIcon`, so a queue row renders status
  and priority through this feature's own registry rather than a copied map.

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

## Detail workspace composition

The detail page (`ui/pages/intervention-detail`) is a **full-bleed,
divider-based Linear-style workspace** (claude.ai/design "Intervention
Dashboard" option 2a): the workspace layout's `<main>` is unpadded (every
other routed page applies the `p-3 sm:p-6 md:p-7 lg:p-8` convention on its own
root) and this page owns its edges. The page renders **no top bar of its
own** — the layout breadcrumb handles back navigation and carries the
intervention name (via `interventionTitleResolver`) as the page h1, and the
**main actions live in the header's action slot**:
`ui/components/intervention-header-actions` is contributed to the workspace
layout's `WORKSPACE_PAGE_HEADER_SLOT` through `withInterventionHeaderActions()`
(`providers/page-header/`, registered in `app.routes.ts` and exported from the
feature `index.ts`). The feature also contributes the shell-wide
offline/sync-status chip: `ui/components/intervention-sync-chip` (connectivity
state, pending outbox count via `InterventionOfflineService.pendingCount`,
blocked operations, manual "Sync now") is registered in the workspace layout's
`CONVERSATION_HEADER_SLOT` through `withInterventionSyncChip()`
(`providers/conversation-header/`,
exported from the feature `index.ts`). The page publishes its header view state — prev/next
chevrons with a `position / total` pill (walking the shared
`InterventionStore`'s `orderedIds()`, provided at the parent route — see
`interventions.routes.ts`), a secondary **Request changes** button while the
intervention is submitted and the user may review, the **single canonical
forward action** for the current phase (Plan / Submit / Publish), and the
overflow menu — into the root `state/intervention-header/`
`InterventionHeaderStore`, clears it on destroy, and reacts to the slot's
`interventionHeaderEvents` (command / request-changes / prev / next), so
orchestration never leaves the page. The command action is a **living
recommended action**: during execution it reads "Record field work" /
"Complete N remaining items" (revealing the checklist or the discovery
drawer) until the checklist is resolved, then becomes the phase-exit gate;
when a gate is disabled, its `disabledReason` renders next to the button
(header slot and mobile bar) so it never dead-ends silently. `j`/`k` navigate
next/previous within the cached list ordering (ignored while typing or while
a drawer is open). The phase action and Request changes are mirrored into a
mobile thumb-zone bar (rendered when either exists, so a reviewer without
publish rights still reaches Request changes on mobile). Every drawer guards
accidental dismissal: PrimeNG's open-time Escape listener is disabled and
replaced by a dirty-aware document handler, and the backdrop is
non-dismissible while the composed form reports unsaved edits (`dirty`
signal on every form). The
page's banner stack surfaces errors, blocked sync operations, the offline
outbox, the **reviewer's note while status is `changes_requested`** (the only
place `reviewNote` is shown to the agent), a blockers banner listing the
blocking issues (review phase only — publication blockers are noise during
preparation/execution), and review banners (execution-complete when submitted
with zero blockers; published confirmation).

**Edit affordances follow the backend's mutability rules** (see
`Intervention::assertPlanningMutable`): planning fields (site, responsible,
participants, priority, schedule) are editable in **draft only**
(`canEditPlanning` gates the rail pencils and the planning drawer), while the
description and labels stay editable until a terminal status
(`canEditDetails`). The description is edited **inline** in the identity block
(expand-in-place editor merge-patching only `description`), never through the
planning drawer. The body then splits
into the main column and a tinted right **properties rail** (19rem, divider at
`xl`, stacking below with a top border on smaller screens). The main column
opens with an identity line (status/priority tags, `FG-{number}` code, type,
site, updated date, and the description with its edit affordance) and a
**stage progress row**: the `ui/components/intervention-phase-stepper` compact
pipeline (done phases as green checks, the active phase as a tinted pill
carrying an optional `{done}/{total}` work-item counter, upcoming phases as
outline circles; hidden when abandoned) with the due date right-aligned.

The workspace applies **progressive disclosure per phase**. While the
intervention is a **draft**, the main column renders the
`ui/components/intervention-planning-guide` **guided planning surface** instead
of the checklist: four steps (context → scope → team → schedule), one at a
time with a step rail, each step merge-patching only its edited fields through
the workspace store's `updateDetails` on continue/navigation — selects and
date pickers additionally **autosave** (600 ms debounce) so the final step's
plan action, whose enablement reads the persisted intervention, unlocks
without navigating away; the scope step
lists work items and delegates add/remove to the page (drawer /
confirm-delete), and the final step carries the plan action once every step is
complete. The activity section defaults collapsed during preparation, the
checklist defaults collapsed during review, the rail's Readiness section is
hidden while the guide runs (the steps convey it) and the Publication section
only renders in review. Otherwise the main column stacks flat, divider-
separated sections: a **single work-item checklist** — the one work-item
surface, no duplicate table view — whose header pairs the `{done}/{total}`
counter with a thin completion bar and the phase affordances ("+" to create in
draft; add-discovery and scan-QR in execution), each row a hover-highlighted
flat line toggling complete via its circle checkbox (the workspace's next
recommended item is tinted with the brand accent) with an overflow menu for
the per-item phase actions (attach evidence photo for equipment, skip,
delete); a **proposed changes** section
(`ui/components/intervention-change-diff` — a legible field → value diff, not
raw JSON) headed by a pending/total counter and the atomic-application note;
while submitted, a tinted **publication summary** aside recapping the atomic
contract (pending changes, inspections recorded, revision); and the activity
section (a PrimeNG `p-timeline` + this feature's own
`ui/forms/comment-composer` — interventions-owned (§6.5, strongest ownership):
it expresses this feature's activity-comment workflow, and collaboration
deliberately uses a plain textarea instead — fed by the
workspace store's `activities`/`loadActivities`/`addComment`). The properties
rail stacks divider-separated groups: **Properties** — status (with a
transition menu — selecting `changes_requested` opens
`ui/drawers/intervention-request-changes-drawer` with a required note),
priority, assignees, due date, site, labels (a `p-multiselect` of the
organization's labels, loaded by `InterventionPlanningOptionsStore`) and the
mono revision — **Linked** (facility/equipment/inspection counts),
**Readiness** (one phase-scoped `ui/components/intervention-readiness-checklist`
with a done/total counter) and **Publication**.

## Status / enum presentation (badges & select options)

Every intervention enum (`priority`, `status`, `type`, `workItemAction`,
`workItemStatus`, `issueSeverity`, `changeStatus`, `inspectionResult`) renders
from a single source of truth so the same value looks identical everywhere and
status is never conveyed by colour alone (icon + label always present).

- `models/intervention-tag/` — the shared vocabulary (plain TS, no Angular),
  exported through the feature `models/` barrel:
  - `intervention-tag-descriptor.interface.ts` — `InterventionTagDescriptor`,
    a domain alias of the app-wide `TagDescriptor` (`label`, `severity`, `icon`).
  - `intervention-tag-severity.type.ts` (alias of `TagSeverity`) /
    `intervention-tag-kind.type.ts`.
  - `intervention-tag.util.ts` — per-enum descriptor registry and
    `resolveInterventionTag(kind, value)` (graceful fallback for unknown values).
    The descriptor's `severity` maps straight onto PrimeNG's `p-tag` severity
    scale, so no colour mapping is needed at the render site.
- `ui/components/intervention-tag/` — `<app-intervention-tag kind value />`:
  the **table/panel badge**. A thin wrapper that resolves the descriptor and
  forwards it to PrimeNG's `p-tag`.
- `ui/components/intervention-option/` — `<app-intervention-option kind value />`:
  the **`p-select` option content** (used in `#item` / `#selectedItem`), also a
  `p-tag`, matching the dashboard trend-card filter selects.

To add a new enum value: extend the relevant descriptor map only — both the
badge and the select option follow automatically.

## Conventions (apply to all work in this feature)

- **Tech**: Angular 21 standalone components, signals (`input()`, `computed()`,
  `signal()`), `ChangeDetectionStrategy.OnPush`; PrimeNG for controls; Tailwind
  utilities for styling. **Never edit `src/styles.css`** — style with Tailwind
  classes / component `[pt]`; literal class strings only (Tailwind scans them).
- **Architecture**: keep the `models/` (interfaces, types and the small pure
  utils that operate on them) · `data-access/` (HTTP + local IndexedDB
  transport) · `services/` (behavior coordinators) · `state/` (SignalStore) ·
  `ui/` split. `ui/` holds `pages/`, `forms/`, `tables/`, `dataviews/`,
  `drawers/`, `components/`; one folder per unit with an `index.ts` barrel. **Shared types/data live in `models/`** —
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

- **Publication is confirm-gated, and the confirmation is the recap.** The phase command in
  `review` opens `confirmPublish()`, which states how many pending changes and recorded
  inspections are about to be written and at which revision, then repeats the atomic contract.
  It must never call `publishIntervention()` directly: publication is the one step that writes
  to the compliance record, and every other consequential action here (abandon, delete, discard
  blocked sync) is already gated.
- **In `execute`, the work comes before the context.** The identity block and the stage
  progress row live in an `interventionContext` `ng-template` rendered _after_ the checklist
  during execution and before it in every other phase. The reorder is in the DOM, not in CSS
  `order`, so keyboard focus keeps matching the visual sequence (WCAG 2.4.3). Progressive
  disclosure no longer stops at `draft`.
- **One page-level notice is open at a time.** `activeNotices` ranks them — error, blocked
  sync, reviewer note, publication blockers, offline outbox, ready-to-publish, published — and
  only the first renders; the rest fold behind a counted toggle (`showNotice`,
  `noticesExpanded`). Seven could co-render before, which put a wall between the operator and
  the checklist they opened the page to run. Adding a notice means extending the ranking, not
  appending another always-open banner.
- **The properties rail has one edit entry, not one per row.** The rail is a read-only
  summary with a single "Edit planning" control on its (now visible) group heading. It
  previously carried four pencils — priority, assignees, due date, site — that all called the
  same `editDrawerVisible.set(true)`, so the affordance advertised four scopes and delivered
  one. Description and labels keep their own controls because they open genuinely different
  editors (inline expand-in-place, and the label multiselect).
- **The publication outcome renders where the action was taken.** `publicationMessage` appears in
  the mobile command bar as well as the properties rail, because below `xl` the rail stacks under
  the entire main column — a phone operator would otherwise tap Publish and see nothing change.
- Intervention workflows remain organization-scoped.
- Offline outbox replay belongs to this subfeature, not `core`.
- Intervention pages orchestrate intervention services and intervention stores.
- Intervention route pages live under `ui/pages/`.
