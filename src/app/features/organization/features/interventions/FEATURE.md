# Missions Feature

## Purpose

Owns organization-scoped field mission workflows.

This subfeature is responsible for:

- mission listing and creation,
- mission detail orchestration,
- mission publication and issue checks,
- mission offline persistence and outbox replay.

## Entry Points

- Routes: `missions.routes.ts`
- Public API: `index.ts`
- Feature providers: `missions.feature.ts`

## Routes

- `/organizations/:organizationId/missions`
- `/organizations/:organizationId/missions/:missionId`

## State and Data Access

Stores:

- `MissionStore` — root-scoped; mission list and creation (normalized entities + request state).
- `MissionWorkspaceStore` — component-scoped (provided in `MissionDetailPage`); the active mission workspace (mission, work items, changes, issues) with online/offline mutations.

Primary services:

- `MissionService`
- `MissionOfflineService` — thin façade + cross-cutting purges. Delegates to:
  - `MissionDatabaseService` — IndexedDB connection/schema, CRUD primitives, owner binding.
  - `MissionOutboxStore` — replay outbox + `hasUnsyncedChanges` signal.
  - `MissionWorkspaceRepository` — normalized workspace persistence.
- `MissionSyncService` — outbox replay.
- `MissionSyncCoordinatorService` — replays the outbox when connectivity/visibility is regained.
- `MissionPwaUpdateService`
- `MissionPrefetchService`

Connectivity decisions across the feature read the shared
`ConnectivityService` (`core`), not `navigator.onLine` directly.

Architecture note:

- `state/` hosts NgRx SignalStore slices only.
- `services/` hosts mission utility services, one folder per service.

Main provider:

- `provideMissionsFeature`

## Invariants

- Mission workflows remain organization-scoped.
- Offline outbox replay belongs to this subfeature, not `core`.
- Mission pages orchestrate mission services and mission stores.
- Mission route pages live under `ui/pages/`.
