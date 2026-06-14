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

## Invariants

- Intervention workflows remain organization-scoped.
- Offline outbox replay belongs to this subfeature, not `core`.
- Intervention pages orchestrate intervention services and intervention stores.
- Intervention route pages live under `ui/pages/`.
