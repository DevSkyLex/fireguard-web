# Maintenance Schedules Feature

## Purpose

Owns the organization's read surface over the backend Maintenance module and
the two actions it exposes to an operator:

- listing maintenance schedules — one row per tracked equipment type per
  facility — with server-side filtering and pagination,
- overriding a single schedule's inspection interval, or clearing the
  override back to the organization default,
- generating an inspection campaign (an intervention) from every schedule
  currently due or overdue, optionally narrowed to one facility or
  equipment type.

Named `maintenance-schedules`, not the unqualified `maintenance` — an
app-level feature already owns that name for the unrelated app-maintenance-mode
page (`src/app/features/maintenance/`), and a collision on `app-maintenance-*`
selectors was a real risk.

This subfeature does not own equipment lifecycle, facility records, or
intervention workflow past creation — it hands off to `equipments`,
`facilities` and `interventions` respectively. It does not compute
`dueStatus` client-side; that value is authoritative from the backend's
hourly sweep and is rendered as-is.

## Entry Points

- Routes: `maintenance-schedules.routes.ts`
- Public API: none. Nothing outside this subfeature imports it; the sidebar
  entry links by path (`/organizations/:organizationId/maintenance`), not by
  symbol.
- Root provider: none. `MaintenanceSchedulesStore` is provided once, on the
  single leaf route, per `ARCHITECTURE.md` §10.11 (route-specific, must
  reset).

## Routes

- `/organizations/:organizationId/maintenance` — `MaintenanceSchedulesPage`:
  the only route this subfeature owns. Guarded on
  `organization.maintenance.read` on the pathless parent, the same shape
  `EQUIPMENT_ROUTES`/`INSPECTION_ROUTES` use. There is no create or detail
  route — a schedule is derived server-side the moment an equipment of a
  tracked type exists; it is never authored directly.

## State and Data Access

Primary store: `MaintenanceSchedulesStore` — `withEntities<MaintenanceScheduleOutput>`
keyed by id, plus three independent `CallState` fields (`listCallState`,
`overrideCallState`, `campaignCallState`). A successful override replaces
exactly the patched entity from the server's full recomputed response; the
list is never refetched for it. A successful campaign carries
`{ interventionId, number, workItemsCount }` for the page to navigate with —
the store also dispatches the success toast itself
(`campaignSucceeded`), since the message needs the result's interpolated
values.

Primary service: `MaintenanceScheduleService` — extends `HydraApiService`
but calls the **canonical** `/api/maintenance/schedules` and
`/api/maintenance/campaigns` resources, not an organization-scoped path; the
organization is instead a required filter/input field, the same shape
`InspectionService.listByIntervention` already uses for its own
canonical-collection bypass.

The list toolbar's **Export** button downloads a server-side CSV
(`MaintenanceScheduleService.exportCsv`, `GET
/api/maintenance/schedules/export`, mirroring `InterventionService.exportCsv`:
direct `this.http` call, `responseType: 'blob'`, saved through
`BrowserDownloadService`); the organization travels as the same required
`organization` IRI query parameter the list uses. The screen's
`facility`/`equipmentType`/`dueStatus` narrowing is forwarded; `dueBefore`
is **not** part of the export's contract, so an active bound raises the
`maintenance.list.exportFiltersDropped` warn toast. The server caps the
collection at 50,000 rows; the resulting 422's RFC 7807 `detail` (read back
through `resolveCsvExportErrorDetail`, `@features/organization/utils`) is
surfaced as the error toast.

Every campaign-generation failure — including the backend's documented 422
"No due maintenance schedules match the given filters." — stays in
`campaignError` and is rendered inline in `MaintenanceCampaignDialog`, never
dispatched as a toast; that is a deliberate simplification from
`EquipmentStore.update`'s pattern of doing both, since a create-flow
rejection reads more naturally as an inline form message than a duplicated
toast.

## Cross-Feature Dependencies

- Depends on organization route context from the parent feature.
- Consumes `EQUIPMENT_TYPE_OPTIONS` from the `equipments` subfeature's
  published public API (`@features/organization/features/equipments`) for
  the equipment-type filter, the table's type label and the campaign
  dialog's scoping select — the same catalog `onboarding` already imports.
- Consumes `FacilityService` directly from the `facilities` subfeature's
  `data-access` barrel to populate the facility filter/scoping selects —
  the same direct cross-feature service dependency `equipments/FEATURE.md`
  already documents for `FacilityPlansStore` → `EquipmentService`. This
  feature does not own facility records and publishes nothing back.
- May be referenced by other organization subfeatures for its route path,
  but the schedule domain stays local to this subfeature.

## Invariants

- `dueStatus` is authoritative and is never re-derived from `nextDueAt`
  client-side; the hourly sweep means it can lag the raw date by up to an
  hour, and that lag is accepted.
- `nextDueAt` absent with `dueStatus: 'overdue'` renders the explicit "Never
  inspected" label, not a blank cell — it means "tracked but never
  inspected", a real and distinct state from `unscheduled`.
- The override control (`organization.maintenance.manage`) and the "Generate
  inspection campaign" action (that permission **and**
  `organization.interventions.plan` together) are gated so the button only
  ever offers what the backend actually accepts — a single 403 is possible
  server-side but the UI does not offer the action into it.
- A successful override replaces the row from the PATCH response; nothing in
  this feature refetches the list for it.
- Status is never colour-only: `MaintenanceDueStatusTag` always pairs its
  severity tint with an icon and a label (`models/maintenance-tag/`).
