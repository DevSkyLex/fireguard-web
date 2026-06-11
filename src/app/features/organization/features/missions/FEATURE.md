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

Primary store:

- `MissionStore`

Primary services:

- `MissionService`
- `MissionOfflineService`
- `MissionPwaUpdateService`

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
