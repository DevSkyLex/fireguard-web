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

- `/organizations/:organizationId/interventions`
- `/organizations/:organizationId/interventions/:interventionId`

## State and Data Access

Stores:

- `InterventionStore` — root-scoped; intervention list and creation (normalized entities + request state).
- `InterventionWorkspaceStore` — component-scoped (provided in `InterventionDetailPage`); the active intervention workspace (intervention, work items, changes, issues) with online/offline mutations.

Primary services:

- `InterventionService`
- `InterventionOfflineService` — thin façade + cross-cutting purges. Delegates to:
  - `InterventionDatabaseService` — IndexedDB connection/schema, CRUD primitives, owner binding.
  - `InterventionOutboxStore` — replay outbox + `hasUnsyncedChanges` signal.
  - `InterventionWorkspaceRepository` — normalized workspace persistence.
- `InterventionSyncService` — outbox replay.
- `InterventionSyncCoordinatorService` — replays the outbox when connectivity/visibility is regained.
- `InterventionPwaUpdateService`
- `InterventionPrefetchService`

Connectivity decisions across the feature read the shared
`ConnectivityService` (`core`), not `navigator.onLine` directly.

Architecture note:

- `state/` hosts NgRx SignalStore slices only.
- `services/` hosts intervention utility services, one folder per service.

Main provider:

- `provideInterventionsFeature`

## Status / enum presentation (badges & select options)

Every intervention enum (`priority`, `status`, `type`, `workItemAction`,
`workItemStatus`, `issueSeverity`, `changeStatus`, `inspectionResult`) renders
from a single source of truth so the same value looks identical everywhere and
status is never conveyed by colour alone (icon + label always present).

- `models/intervention-tag/` — the shared vocabulary (plain TS, no Angular),
  exported through the feature `models/` barrel:
  - `intervention-tag-descriptor.interface.ts` — `InterventionTagDescriptor`
    (`label`, `severity`, `icon`).
  - `intervention-tag-severity.type.ts` / `intervention-tag-kind.type.ts`.
  - `intervention-tag.util.ts` — per-enum descriptor registry,
    `resolveInterventionTag(kind, value)` (graceful fallback for unknown values)
    and `interventionSeverityIconClass(severity)` (the shared `text-*` icon
    colour, with `dark:` variants).
- `ui/components/intervention-tag/` — `<app-intervention-tag kind value />`:
  the **table/panel badge**. Neutral pill copied from the organization table
  badges (`rounded-full border border-surface-200 bg-surface-0`, neutral label),
  only the icon coloured by severity.
- `ui/components/intervention-option/` — `<app-intervention-option kind value />`:
  the **`p-select` option content** (used in `#item` / `#selectedItem`). Bare
  inline `icon + label` with no badge shell, matching the dashboard trend-card
  filter selects. Never put `<app-intervention-tag>` inside a select.

To add a new enum value: extend the relevant descriptor map only — both the
badge and the select option follow automatically.

## Conventions (apply to all work in this feature)

- **Tech**: Angular 21 standalone components, signals (`input()`, `computed()`,
  `signal()`), `ChangeDetectionStrategy.OnPush`; PrimeNG for controls; Tailwind
  utilities for styling. **Never edit `src/styles.css`** — style with Tailwind
  classes / component `[pt]`; literal class strings only (Tailwind scans them).
- **Architecture**: keep the `models/` (interfaces, types and the small pure
  utils that operate on them) · `services/` · `state/` (SignalStore) · `ui/`
  split. `ui/` holds `pages/`, `forms/`, `tables/`, `components/`; one folder per
  unit with an `index.ts` barrel. **Shared types/data live in `models/`** —
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
