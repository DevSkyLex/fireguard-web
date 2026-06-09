# Equipments Feature

## Purpose

Owns organization-scoped equipment workflows.

This subfeature is responsible for:

- listing equipments for the active organization,
- equipment creation, detail, and editing,
- assignment, unassignment, commissioning, maintenance, and decommissioning actions,
- maintenance logs, attachments, and tags,
- active equipment selection and detail-oriented state.

This subfeature does not own top-level organization context or inspection workflows.

## Entry Points

- Routes: `equipments.routes.ts`
- Public API: `index.ts`

## Routes

- `/organizations/:organizationId/equipments`
- `/organizations/:organizationId/equipments/create`
- `/organizations/:organizationId/equipments/:equipmentId`
- `/organizations/:organizationId/equipments/:equipmentId/edit`

Equipment detail routes resolve active equipment context before rendering. Equipment removal is
not exposed because the API has no delete endpoint.

## State and Data Access

Primary stores:

- `EquipmentStore`
- `ActiveEquipmentStore`

Primary service:

- `EquipmentService`

## Cross-Feature Dependencies

- Depends on organization route context from the parent feature.
- May be referenced by other organization subfeatures, but equipment ownership stays local to this subfeature.

## Invariants

- Equipment workflows remain organization-scoped.
- Equipment state and events stay owned by this subfeature.
- Equipment lifecycle actions must respect the current equipment status.
- Pages orchestrate stores; reusable UI components must not hide equipment workflow decisions.
