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
- Public API: `index.ts`, narrowed to `EQUIPMENT_TYPE_OPTIONS` — the only symbol
  any external consumer imports (see below). It used to `export *` the state,
  models, data-access and options trees.

## Routes

- `/organizations/:organizationId/equipments`
- `/organizations/:organizationId/equipments/create`
- `/organizations/:organizationId/equipments/:equipmentId`
- `/organizations/:organizationId/equipments/:equipmentId/edit`

Equipment detail routes resolve active equipment context before rendering.

## State and Data Access

Primary stores:

- `EquipmentStore`
- `ActiveEquipmentStore`

Primary service:

- `EquipmentService`

## Cross-Feature Dependencies

- Depends on organization route context from the parent feature.
- May be referenced by other organization subfeatures, but equipment ownership stays local to this subfeature.
- Publishes the canonical `EQUIPMENT_TYPE_OPTIONS` through the feature public API (`index.ts`); the onboarding `create-equipment-form` consumes it so the equipment type catalog is not duplicated.

## Deletion (data-access only, no duplicate UI)

`EquipmentService.remove` / `EquipmentStore.remove` call the canonical
`DELETE /api/equipment/{id}` endpoint (resolving the current revision via a
canonical `GET` first, since the organization-scoped read never carries
`revision`). For a published equipment — the only state reachable from this
app's org-scoped pages — the backend outcome is **decommissioned**, which is
exactly what the equipment-detail header's existing, non-deprecated
**Decommission** action already does through a different endpoint. To avoid
shipping two buttons with an identical outcome and permission gate, the
canonical `remove()` path is **not** wired to a second detail-page action; it
exists for data-access parity and future consumers (for example, a
draft-equipment hard-delete flow inside an intervention). If a genuinely
distinct "delete" outcome is ever needed here, revisit this decision.

## Invariants

- Equipment workflows remain organization-scoped.
- Equipment state and events stay owned by this subfeature.
- Equipment lifecycle actions must respect the current equipment status.
- Pages orchestrate stores; reusable UI components must not hide equipment workflow decisions.
