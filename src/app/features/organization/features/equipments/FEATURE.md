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

Equipment detail routes resolve active equipment context before rendering.

## Maintenance status

`EquipmentOutput.maintenanceDueStatus` (`unscheduled` | `up_to_date` | `due_soon`
| `overdue`) is resolved cross-module by the backend and rendered as its own
column, through the `maintenanceDueStatus` family of the equipment tag registry.

It is **orthogonal to `status`**: an `operational` asset can be `overdue`, and a
`decommissioned` one is simply `unscheduled`. The two must never be folded into a
single column — doing so would hide overdue maintenance behind a green
"Operational" badge.

The fleet counters above the table come from
`GET /organizations/{orgId}/equipment/kpis` (`EquipmentKpiStore`), kept in a
separate store so paging the list does not refetch them, and render as a
4-card KPI strip (`EquipmentFleetSummary`, reusing `shared/components/metric-card`)
matching the collaboration-phase prototype: Total assets, Compliant (with a
computed `compliant / totalAssets` percentage subtitle), Due soon (subtitle
names the platform default 30-day reminder window — see
`OrganizationComplianceDefaults::REMINDER_WINDOW_DAYS`; an organization that
customized its window still sees this fixed copy since `EquipmentKpiOutput`
does not expose the effective value), and Non-conformity.

`openNonConformities` — rendered as the "Non-conformity" card — is
organization-wide, not equipment-scoped: the backend computes it that way
because non-conformities attach to inspections rather than equipment, so the
count does not describe only the assets in the table above it. Surfacing it
here is a deliberate, prototype-driven exception to that boundary, not a claim
that the number is per-asset.

This supersedes an earlier decision to render the counters as a plain text
line to avoid `PRODUCT.md`'s card-everything anti-reference; the prototype
treats this specific 4-metric strip as the page's headline KPI row rather than
a generic card-per-section layout.

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
