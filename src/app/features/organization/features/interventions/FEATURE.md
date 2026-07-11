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

The detail page (`ui/pages/intervention-detail`) uses a Linear-style two-column
layout instead of a phase-panel wizard. A top bar carries back navigation, the
`FG-{number}` code, prev/next chevrons (walking the shared `InterventionStore`'s
`orderedIds()`, provided at the parent route so it survives navigation from the
list page — see `interventions.routes.ts`) and the **single canonical forward
action** for the current phase — Plan / Submit / Publish — mirrored into a mobile
thumb-zone bar. The wide main column renders identity, a blockers banner, the
description (editable through `ui/drawers/intervention-edit-drawer`, extended with
a `description` field) and a **single work-item checklist** — the one work-item
surface, no duplicate table view. Each row toggles complete via its checkbox; its
overflow menu carries every per-item action for the current phase (attach evidence
photo for equipment, skip, delete), and the section header carries the phase
affordances ("+" to create in draft; add-discovery and scan-QR in execution).
Proposed changes render below as a plain section
(`ui/components/intervention-change-diff` — a legible field → value diff, not raw
JSON), followed by the activity timeline (`@shared/components` `ActivityFeed` +
`CommentComposer`, fed by the workspace store's `activities`/`loadActivities`/
`addComment`). The narrow "Properties" sidebar covers status (with a transition
menu — selecting `changes_requested` opens
`ui/drawers/intervention-request-changes-drawer` with a required note), priority,
assignees, due date, facility/equipment counts, labels (a `p-multiselect` of the
organization's labels, loaded by `InterventionPlanningOptionsStore`) and
publication. Readiness stays one `ui/components/intervention-readiness-checklist`,
now phase-scoped inline in the sidebar rather than per-panel.

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
