# Inspections Feature

## Purpose

Owns organization-scoped inspection workflows.

This subfeature is responsible for:

- listing inspections for the active organization,
- inspection creation, draft editing, detail, and cancellation,
- submission and closure lifecycle actions,
- non-conformity creation, detail, listing, and status updates,
- active inspection state,
- orchestration of inspection forms and inspection page flows.

This subfeature does not own facility, equipment, or checklist data, even when inspection pages need those inputs.

## Entry Points

- Routes: `inspections.routes.ts`
- Public API: none. The feature root barrel was removed — it `export *`-ed
  `state`, `models` and `data-access` and had no external consumer.

## Routes

- `/organizations/:organizationId/inspections`
- `/organizations/:organizationId/inspections/create`
- `/organizations/:organizationId/inspections/:inspectionId`
- `/organizations/:organizationId/inspections/:inspectionId/edit`

Inspection detail routes **seed** active inspection context without blocking
activation: `inspectionResolver` fires the fetch into `ActiveInspectionStore`
and returns immediately, the detail page paints a full-page skeleton from the
store's pending state (first-order on slow field connections), the title
resolver answers synchronously with a neutral label until the record lands
(the page then re-sets the document title through `TitleService`), and a load
failure toasts globally and returns to the index from the page. The resolver
stays the single loading path for the record — the page never re-fetches it.
The API delete operation represents cancellation and is exposed as such in
the UI.

## UI (this pass)

- `ui/pages/inspections-page` (`InspectionsPage`) — an `hlmTable` of the
  organization's inspections (`InspectionTable`), a status/result filter
  popover, paginated server-side, and a "New inspection" link
  (`INSPECTION_WRITE`-gated). No search box: unlike facilities/equipments,
  `InspectionOutput` carries no searchable text field. No row menu and no
  bulk actions — the record itself is where every property is edited.
- `ui/pages/inspection-create-page` (`InspectionCreatePage`) —
  `ui/forms/inspection-create-form`, asking only for what
  `CreateInspectionInput` requires: `equipmentId` (a combobox sourced from
  `InspectionCreationOptionsStore`), `result`, `performedAt`, `inspectorType`
  and `inspectorName`. `notes` and `signature` are filled in afterward, in
  place, on the created record.
- `ui/pages/inspection-detail-page` (`InspectionDetailPage`) — a header
  naming the record with its status, result and non-conformity count, a
  lifecycle band (Submit + confirm-gated Cancel while `draft`, Close while
  `submitted`, nothing once terminal), and
  `ui/components/inspection-information-panel` for the in-place edit
  surface. See "Cross-Feature Dependencies" below for exactly which fields
  it opens.
- `ui/components/inspection-status-tag` — the `InspectionOutput.status` and
  `.result` registry (`kind: 'status' | 'result'`), the only appearance of
  either enum in this feature. Reuses the exact `inspectionStatus.*` /
  `inspectionResult.*` i18n ids `interventions`' own registry already
  defined for the same enums (one translation, two call sites) when it
  renders an inspection read-only on the intervention detail page's Linked
  tab.

## State and Data Access

Primary stores:

- `InspectionStore`
- `ActiveInspectionStore`
- `InspectionCreationOptionsStore` (component-scoped to the create page;
  loads the organization's equipment into the creation form's combobox
  through `EquipmentService`, imported via the sibling `equipments` feature's
  `data-access` barrel — the same cross-feature pattern
  `InterventionPlanningOptionsStore` already established for its own
  site/member pickers)

Primary service:

- `InspectionService`

## Deferred, not built

Non-conformity creation, listing, detail and status updates have no `ui/`
surface in this pass, even though `InspectionStore` already carries the full
`loadNonConformities` / `loadNonConformity` / `addNonConformity` /
`updateNonConformityStatus` data-access flow (see above) — the detail page
reads only `InspectionOutput.nonConformitiesCount` for its header line.
Building a table, an add form/sheet and a second presentation registry
(severity + status) was judged disproportionate to what this pass needed,
matching the same call `equipments` made for attachments/maintenance-log
history and `facilities` made for its asset panes. Revisit when a route or
the inspection detail page's design names a non-conformities surface.

The inspection creation form does not offer `facilityId` or `checklistId`,
though both are accepted by `CreateInspectionInput`. Facility is optional
and the inspected equipment already carries its own facility assignment;
checklist has no source at all — the sibling `checklists` subfeature has no
`ui/` yet. Building a second full options picker (mirroring the equipment
one) for an optional field was judged disproportionate. `inspectorUserId`
and `inspectorOrganizationName` are likewise not asked for — `inspectorName`
alone covers the minimum viable record. Revisit any of these once a
workflow actually needs to set the field.

## Cross-Feature Dependencies

- **The record is the edit surface.** Result, performed date, notes and
  signature open where they are displayed, through `@shared/inplace-field`;
  the panel owns the draft and the cancel path, the page owns the call and
  the draft-only edit gate (ARCHITECTURE.md §10.5, and the "only a draft can
  be edited" invariant below).
- Equipment, facility and checklist stay read-only in the panel:
  `UpdateInspectionInput` accepts all three, but the detail page carries none
  of their option lists, and opening a picker with nothing to pick from would
  be worse than a plain value.
- `/:inspectionId/edit` is retired and **redirects onto the record**, so
  installed applications and bookmarks still resolve.
- Depends on organization route context from the parent feature.
- May compose facility, equipment, and checklist data as supporting inputs for inspection workflows.
- Must not absorb ownership of those sibling subfeatures just because the create flow depends on them.

## Invariants

- Inspection pages remain the orchestrators of inspection workflows.
- Supporting dropdown or selector data from sibling subfeatures is consumed, not re-owned.
- Inspection business rules and mutation flows remain local to this subfeature.
- Only draft inspections can be edited, submitted, or cancelled; submitted inspections can be closed.
