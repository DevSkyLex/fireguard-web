# Maintenance Schedules Feature

**Reading guide:** [Documentation index](../../../../../../docs/README.md) · [Related guide](../../../../../../docs/architecture/patterns-and-examples.md).

## Adaptive maintenance interface

The central interaction-capabilities contract controls mobile cards and 44px controls regardless of
viewport width. Campaign creation uses one Spartan sheet with the same form instance:
bottom on mobile and right on desktop. Automatic detection can resolve that side
without recreating the form; validation and server errors remain attached to it.
Dismissal remains blocked while generation is pending.
Schedule overrides, scope, permission checks and campaign generation retain their
existing business behavior.

## Purpose

Owns the organization's historical schedules and independent equipment operation
plans over the backend Maintenance module:

- listing maintenance schedules — one row per published equipment — with server-side search, filtering and pagination,
- overriding a single schedule's inspection interval, or clearing the
  override back to the organization default,
- generating an inspection campaign (an intervention) from every schedule
  currently due or overdue, optionally narrowed to one facility or
  equipment type.

## Independent equipment operations

`/organizations/:organizationId/maintenance/plans` owns the operation library,
guarded by the existing maintenance-read permission and provided with its own
page-scoped `MaintenancePlansStore`. Controls and maintenance use separate
server-filtered queries and exact server totals; neither the browser nor the
list derives deadline, completion, availability or anomaly status.
The equipment dossier may link with `equipmentId` and `operationKind` query
parameters; both are forwarded to the same authorized server collection.

`MaintenancePlanService` transports the organization-scoped `/maintenance/plans`
resources and `/maintenance/engine` state. A new operation is prepared inactive,
then its next three dates are reviewed from the server before explicit activation.
Day, week, month and year units require an explicit organization choice; the form
does not supply equipment-specific or regulatory frequencies. Historical cadence
and missing first deadlines remain visible. Calendar calculations belong to the API.
Date inputs send `anchorOn`/`nextDueOn` calendar strings for the server to interpret
in its preserved `calendarTimezone`. Fixed calendar dates render without timezone
conversion; historical deadline instants retain the organization date formatter.
Editing sends only changed calendar fields. An open occurrence locks its cadence,
anchor and deadline while leaving the operation name editable, including when the
historical calendar is incomplete. Renaming never reschedules its existing work.

The page orchestrates its presentational form and flat operation list. Equipment
choices use the public `EquipmentService` and `buildEquipmentTitle` from equipments,
in server pages of 30 with search; reads begin only when opening a new-plan form.
Selected labels survive a different option page. Authenticated plan and engine reads
begin after hydration, with no response serialized into TransferState.

Configuration, legacy preparation and the consequential authority switch require
maintenance-manage. Generation additionally requires interventions-plan and confirmed
plan-engine authority. Switching uses a native alert dialog, stays open and busy-locked
until confirmation, and renders migration conflicts inline for correction and retry.
Preparation does not switch authority. The server remains the sole arbiter of active
engine and historical campaign linkage.

Generation is bounded to one equipment operation. Ordinary submission recovers already
created work; a new attempt is a separate action exposed only by `retryAllowed` from the
API. Original due dates and attempt numbers remain visible. Creating work never counts
as completion. Accepted writes survive navigation without replacing another
organization's current page; stale queries and previews are cancelled or ignored.

Named `maintenance-schedules`, not the unqualified `maintenance` — an
app-level feature already owns that name for the unrelated app-maintenance-mode
page (`src/app/features/maintenance/`), and a collision on `app-maintenance-*`
selectors was a real risk.

This subfeature does not own equipment lifecycle, facility records, or
intervention workflow past creation — it hands off to `equipments`,
`facilities` and `interventions` respectively. It does not compute
`dueStatus` client-side; that value is authoritative from the backend's
event-driven recalculation with an hourly recovery sweep and is rendered as-is.

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
  historical schedules, guarded on
  `organization.maintenance.read` on the pathless parent, the same shape
  `EQUIPMENT_ROUTES`/`INSPECTION_ROUTES` use. There is no create or detail
  route — a schedule is derived server-side the moment an equipment of a
  tracked type exists; it is never authored directly.
- `/organizations/:organizationId/maintenance/plans` — `MaintenancePlansPage`:
  the operation library and explicit preparation/configuration workflows.

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
`facility`/`equipmentType`/`dueStatus`/`dueBefore` narrowing is forwarded identically. The server caps the
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
- Consumes `EquipmentTypeCatalogStore` and `EquipmentTypeOption` through the
  equipments public API for filters, table labels and campaign scope. Server
  labels support custom codes and historical archived types. The page loads
  this secondary catalog after hydration, forwards options to presentation
  components, clears old organization data on scope changes and offers explicit retry.
- Consumes `FacilityOptionsStore` through `facilities/state`, `FacilityOption`
  through `facilities/models`, and the published `FacilityOptionPicker` through
  `facilities/ui/components` for filter and campaign scope controls. Options
  load on first use in the browser, never on SSR or page construction, in
  server pages of 200 with search. Failed reads can retry; organization/session
  changes cancel reads and delayed searches. Selected labels remain available
  while another option page is shown. Facility records stay owned by facilities.
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

- `evaluatedAt` is the last successful server evaluation, distinct from `updatedAt`.
  A missing evaluation renders an explicit pending state, including legacy rows awaiting
  their first recalculation. The frontend never infers evaluation freshness from due dates.
