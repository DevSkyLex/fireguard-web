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

- `/organizations/:organizationId/equipments` — `EquipmentsPage`: an
  `hlmTable` of the organization's equipment (`EquipmentTable`), a debounced
  search box (`?q=`, mapped to the backend `search` filter) and a filter
  popover (type, status), paginated server-side. No row menu and no bulk
  actions — the record itself is where every property is edited (see
  below), so the list has nothing left to orchestrate beyond search, filter,
  page and a "New equipment" link (`EQUIPMENT_WRITE`-gated) into `create`.
- `/organizations/:organizationId/equipments/create` — `EquipmentCreatePage`:
  `EquipmentCreateForm` (Signal Forms) asking for the one required field,
  `type`; the five remaining editable properties are filled in afterward, in
  place, on the created record. Navigates to `/:equipmentId` on success.
- `/organizations/:organizationId/equipments/:equipmentId` —
  `EquipmentDetailPage`. `equipmentResolver` (route `resolve`) populates
  `ActiveEquipmentStore` before the page renders, redirecting back to the
  index on failure; `equipmentTitleResolver` (route `title`) names the
  document title and breadcrumb from the same resolved record via
  `buildEquipmentTitle` (`utils/equipment-title/`).

  The lifecycle status band (page header) names the single relevant forward
  transition for the current status — commission, resume service, or move
  to maintenance — as the primary action, with Decommission as the
  secondary; both read `EquipmentOutput.status` only, no per-status template
  branching. `EquipmentStore.commission` serves both "Commission"
  (`in_stock`) and "Resume service" (`under_maintenance`): the backend
  handler accepts either non-decommissioned status and always lands on
  `operational`.

**The record is the edit surface.** Every property `UpdateEquipmentInput`
accepts (`type`, `subType`, `brand`, `model`, `serialNumber`, `locationLabel`)
opens where it is displayed, through `@shared/inplace-field`
(`EquipmentInformationPanel`, `ui/components/`); the panel owns the shared
text draft and the cancel path, the page owns the call (ARCHITECTURE.md
§10.5) and the `EquipmentEditState`/`EquipmentEditTarget` pair
(`models/equipment-edit/`) that tracks which field is open, saving, or
rejected. `type` reuses the same `EQUIPMENT_TYPE_OPTIONS` catalog as the
create form and commits on selection (`pick`); the other five are free text
with an explicit Save (`confirm`), sharing one draft signal since only one
field is ever open at a time. There is no separate edit page and no
planning wizard.

Equipment status (`in_stock`/`operational`/`under_maintenance`/
`decommissioned`) and maintenance-due status
(`unscheduled`/`up_to_date`/`due_soon`/`overdue`) render through this
feature's own presentation registry, `models/equipment-status-tag/` +
`ui/components/equipment-status-tag/` (`EquipmentStatusTag`,
`app-equipment-status-tag`) — named `-status-tag`, not `-tag`, because
`equipment-tag/` already names the unrelated labeling-tag resource
(`EquipmentTagOutput`). Its `status` kind reuses the exact `equipmentStatus.*`
i18n ids `interventions`' own registry already defined for the same enum
(one translation, two call sites) when it renders equipment read-only on the
intervention detail page's Linked tab.

**Deferred, not built:** attachments, maintenance-log history and the
labeling-tag (`EquipmentTagOutput`) UI. `EquipmentStore` already carries the
state and `EquipmentService` the transport for all three (see below), but
none is named by a route in this document, and building three more
subsystems (file upload, a log table, tag chips) was judged disproportionate
to what is documented here. Revisit when a route requires one. Facility
assignment/unassignment (`EquipmentStore.assignToFacility` /
`unassignFromFacility`) is likewise data-access-only for now; the detail
header shows the assigned facility's name (`EquipmentOutput.facilityName`)
read-only.

There is no `/:equipmentId/edit` route: the record itself is the edit
surface (see above), and no route in this document links to one.

## State and Data Access

Primary stores:

- `EquipmentStore` — provided per leaf route (list, create, detail), each
  getting its own instance: unlike `interventions`, this feature has no
  documented list ↔ detail state-sharing requirement (no prev/next walk), so
  the simpler independently-scoped default applies (`ARCHITECTURE.md` §10.11).
- `ActiveEquipmentStore` — root-provided; the currently active record,
  populated by `equipmentResolver`.

Primary service:

- `EquipmentService`

Utility:

- `buildEquipmentTitle` (`utils/equipment-title/`) — the shared "type —
  brand model" title, consumed by both `equipmentTitleResolver` (document
  title, breadcrumb) and `EquipmentDetailPage` (page `<h1>`), so the two
  never drift.

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
