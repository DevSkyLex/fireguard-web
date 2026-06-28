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

- `/organizations/:organizationId/interventions` — index page hosting the workflow
  pipeline board (default), the planner table and the scheduling calendar as three
  views switched via `?view=board|list|calendar` (the `board` default omits the param).
- `/organizations/:organizationId/interventions/calendar` — convenience entry that
  opens the index page on its calendar view (same `InterventionsPage`).
- `/organizations/:organizationId/interventions/:interventionId`

## State and Data Access

Stores:

- `InterventionStore` — root-scoped; intervention list and creation (normalized entities + request state).
- `InterventionWorkspaceStore` — component-scoped (provided in `InterventionDetailPage`); the active intervention workspace (intervention, work items, changes, issues) with online/offline mutations.
- `InterventionCalendarStore` — component-scoped (provided in `InterventionsPage`); every organization intervention plus the current member IRI driving the calendar view's All/Mine scope. Loaded lazily, only while the calendar view is active.
- `InterventionBoardStore` — component-scoped (provided in `InterventionsPage`); a bounded page of cards per workflow lane plus per-status server totals, with optimistic status moves (rollback on failure). Loaded lazily, only while the board view is active. Lane grouping and legal transitions derive from `constants/` + `utils/` (mirroring the backend `InterventionTransitionPolicy`); `published` is reached through the publication flow, not a drag. Rendered by `ui/components/intervention-board`, a thin wrapper that composes the generic `@shared/components` `Kanban` (lanes + CDK drag-and-drop) and projects the intervention card, gating drops with the transition policy.

Data-access (transport boundary — `data-access/`):

- `InterventionService` — HTTP API service (`HydraApiService`).
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
