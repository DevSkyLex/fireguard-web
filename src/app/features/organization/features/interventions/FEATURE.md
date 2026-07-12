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
  dataset, toggled with a header `p-selectbutton` and synced to `?view=`
  (default `list`, omitted from the URL). List groups interventions into
  status sections (`app-grouped-list`); Board lays them into
  draft/planned/in_progress/review/published columns (`app-board`,
  drag-and-drop applies a status `transition`, gated by the workflow policy
  and RBAC capability) with a "Show abandoned" toggle for a 6th read-only
  column; Calendar reuses the existing bounded-window calendar. A header
  search box debounces into `?q=` and reloads the store with a server-side
  `name` filter. The metric strip is gone from this page (`InterventionSummaryStore`
  is unused here, kept for a future dashboard).
- `/organizations/:organizationId/interventions/:interventionId`

## State and Data Access

Stores:

- `InterventionStore` — component-scoped (provided in `InterventionsPage`); intervention list and creation (normalized entities + request state). `load` accumulates up to 500 interventions across 100-item pages (the backend clamps `itemsPerPage` at 100) and sets `isListCapped` when the organization has more, driving the list page's "refine your search" notice. `transition` applies a single status change optimistically (entity patch → PATCH with `If-Match` → merge fresh output on success, rollback + `transitionFailed` toast event on error); `orderedIds` exposes the current entity order for prev/next navigation.
- `InterventionWorkspaceStore` — component-scoped (provided in `InterventionDetailPage`); the active intervention workspace (intervention, work items, changes, issues) with online/offline mutations. Also owns the activity timeline (`activities` + `activityCallState`, `loadActivities`, `addComment`); comment posting is refused outright while offline (not queued to the outbox) and failures dispatch a `commentAddFailed` toast event via `interventionWorkspaceStoreEvents`.
- `InterventionCalendarStore` — component-scoped (provided in `InterventionsPage`); the interventions inside a bounded date window (the visible month ± one month) plus the current member IRI driving the calendar card's All/Mine scope. Loaded for the active organization and refetched when the visible month changes (fed by the calendar's `focusedDateChange`); the window is fetched as the de-duped union of a `plannedStartAt`-range query and a `dueAt`-range query (the anchor is `plannedStartAt ?? dueAt`), and the member IRI is resolved once per organization and reused across window refetches.
- `InterventionSummaryStore` — component-scoped (provided in `InterventionsPage`); loads the full organization intervention set once (via `InterventionService.listAll`) and derives the dashboard metric-strip KPIs (in progress, planned, overdue, blocked). Overdue and blocked exclude interventions in a terminal status (`published`, `abandoned`).
- `InterventionHeaderStore` — root-provided bridge between the detail page and the dashboard layout's page-header action slot: the page publishes its header view state (phase action, request-changes, prev/next, overflow) and clears it on destroy; the slot widget renders from it and dispatches `interventionHeaderEvents` back to the page.

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

## Detail workspace composition

The detail page (`ui/pages/intervention-detail`) is a **full-bleed,
divider-based Linear-style workspace** (claude.ai/design "Intervention
Dashboard" option 2a): the dashboard layout's `<main>` is unpadded (every
other routed page applies the `p-3 sm:p-6 md:p-7 lg:p-8` convention on its own
root) and this page owns its edges. The page renders **no top bar of its
own** — the layout breadcrumb handles back navigation, the layout's
page-header banner shows the intervention name (via `interventionTitleResolver`)
as the page h1, and the **main actions live in the banner's action slot**:
`ui/components/intervention-header-actions` is contributed to the dashboard
layout's `PAGE_HEADER_SLOT` through `withInterventionHeaderActions()`
(`providers/page-header/`, registered in `app.routes.ts` and exported from the
feature `index.ts`). The page publishes its header view state — prev/next
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
section (`@shared/components` `ActivityFeed` + `CommentComposer`, fed by the
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
    The `severity → text-*` icon colour mapping now lives in the shared
    `@shared/components` `Tag` (`tagSeverityIconClass`).
- `ui/components/intervention-tag/` — `<app-intervention-tag kind value />`:
  the **table/panel badge**. A thin wrapper that resolves the descriptor and
  forwards it to the shared `<app-tag>` (neutral pill, icon-only colour).
- `ui/components/intervention-option/` — `<app-intervention-option kind value />`:
  the **`p-select` option content** (used in `#item` / `#selectedItem`). A thin
  wrapper over `<app-tag variant="inline">` (bare icon + label, no badge shell),
  matching the dashboard trend-card filter selects. Never put
  `<app-intervention-tag>` inside a select.

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

- Intervention workflows remain organization-scoped.
- Offline outbox replay belongs to this subfeature, not `core`.
- Intervention pages orchestrate intervention services and intervention stores.
- Intervention route pages live under `ui/pages/`.
