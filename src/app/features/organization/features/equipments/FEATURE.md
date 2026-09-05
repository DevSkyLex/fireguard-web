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
  search box (`?q=`, mapped to the backend `search` filter) and an editable
  type/status filter chip row (`app-collection-filter-bar`,
  `@shared/collection-filters`, replacing the earlier popover), paginated
  server-side. No row menu and no bulk actions — the record itself is where
  every property is edited (see below), so the list has nothing left to
  orchestrate beyond search, filter, page and a "New equipment" link
  (`EQUIPMENT_WRITE`-gated) into `create`. `EquipmentTable`'s Equipment
  (type), Brand / model (brand) and Status heads are sortable — the
  backend's own `order[<field>]` whitelist (`type`, `status`, `brand`,
  `model`, `createdAt`, `updatedAt`; `ListEquipmentsProvider`) intersected
  with the columns this table renders; `model` and the two timestamps have
  no dedicated column and carry no sortable head. `EquipmentsPage.sortOrder`
  is sent through the typed `RequestOptions.sort` option (`@core/api`), and
  remembered across visits by `EquipmentListPreferencesService`
  (`fg-equipment-list` cookie) — the third feature-local occurrence of the
  cookie-preference shape `InterventionListPreferencesService` introduced;
  kept local rather than shared (`ARCHITECTURE.md` §2.9).
- The list toolbar's **Export** button downloads a server-side CSV
  (`EquipmentService.exportCsv`, `GET
/api/organizations/{organizationId}/equipment/export`, mirroring
  `InterventionService.exportCsv`: direct `this.http` call, `responseType:
'blob'`, saved through `BrowserDownloadService`). The endpoint accepts
  **no filter by design** — the export always covers the whole inventory —
  so any active search or filter raises the
  `equipment.list.exportFiltersIgnored` warn toast before the download. The
  server caps the collection at 50,000 rows; the resulting 422's RFC 7807
  `detail` (read back through `resolveCsvExportErrorDetail`,
  `@features/organization/utils`) is surfaced as the error toast.
- The list toolbar's **Print QR labels** button downloads the printable QR
  label sheet as PDF (`EquipmentService.exportLabels`, `GET
/api/organizations/{organizationId}/equipment/labels`, same
  direct-`this.http` blob shape, saved as
  `equipment-labels-{organizationId}.pdf`). From this toolbar the scope is
  the **whole active inventory** — no `ids[]`/`facilityId` narrowing is
  sent. The endpoint refuses a selection past 500 labels with a 422 whose
  RFC 7807 `detail` (read back through `resolveCsvExportErrorDetail`) is
  surfaced as the error toast. The facility-scoped variant of the same
  endpoint lives on the estate explorer (`organization/FEATURE.md`
  "Assets"), which prints the selected node's subtree via `facilityId`.
- The detail page's header carries **Export equipment sheet**
  (`EquipmentService.exportReport`, `GET
/api/organizations/{organizationId}/equipment/{equipmentId}/report`): the
  equipment's PDF sheet, same direct-`this.http` blob shape, saved as
  `equipment-{equipmentId}-sheet.pdf`. The endpoint is additionally gated on
  the organization's plan tier (pro/max): a non-entitled plan answers 403
  with an RFC 7807 `detail`, read back through `resolveCsvExportErrorDetail`
  and surfaced verbatim as the error toast.
- `/organizations/:organizationId/equipments/create` — a functional redirect onto the list with `?create=1` (keeping `?facility=`); creation is `EquipmentCreateSheet`, opened by `EquipmentsPage`:
  `EquipmentCreateForm` (Signal Forms) asking for the one required field,
  `type`; the five remaining editable properties are filled in afterward, in
  place, on the created record. Navigates to `/:equipmentId` on success.
- `/organizations/:organizationId/equipments/:equipmentId` —
  `EquipmentDetailPage`. `equipmentResolver` (route `resolve`) **seeds**
  `ActiveEquipmentStore` fire-and-forget so activation never waits on the
  network (first-order on slow field connections): the page paints a
  full-page skeleton from the store's pending state, and on load failure the
  page — not the resolver — toasts through the global feedback listener and
  returns to the index. `equipmentTitleResolver` (route `title`) answers
  synchronously via `buildEquipmentTitle` (`utils/equipment-title/`), falling
  back to a neutral section label; once the record lands the page re-sets the
  document title through `TitleService`, which also refreshes the
  breadcrumb's current-page label. The resolver stays the single loading path
  for the record — the page never re-fetches it.

  The lifecycle status band (page header) names the single relevant forward
  transition for the current status — commission, resume service, or move
  to maintenance — as the primary action, with Decommission as the
  secondary; both read `EquipmentOutput.status` only, no per-status template
  branching. `EquipmentStore.commission` serves both "Commission"
  (`in_stock`) and "Resume service" (`under_maintenance`): the backend
  handler accepts either non-decommissioned status and always lands on
  `operational`.

  **Decommission confirms; the forward transitions do not.** It is the one
  terminal move — `primaryAction()` resolves to `null` on a `decommissioned`
  record, so nothing puts the equipment back in service afterwards — which is
  exactly the case `DESIGN.md` §Action Surfaces rule 5 reserves a confirmation
  for. It opens `ui/dialogs/equipment-decommission-dialog/`, a feature-local
  alert-dialog on the `organization-delete-dialog` model: presentational, it
  emits `confirmed` and never calls the store. Until 2026-08-28 the action
  fired on a single click from the shell header, with no way back.

**Creation is site-scoped.** `EquipmentCreatePage` binds `?facility=` and the
create form carries a **Site** field, so a link from the asset explorer's
selected site lands on a form already assigned. `CreateEquipmentInput.facility`
had always accepted it — the backend validates a flat
`^/api/facilities/{uuid}$` IRI — but no frontend surface ever sent one, so the
only path was: create unassigned → detail page → assignment dialog → search the
site in a combobox. The form maps the picked id onto that IRI itself; the
`?facility=` seed writes the model rather than the field, so arriving
preselected does not start the form dirty and does not trip the
unsaved-changes guard.

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

**Attachments, maintenance history, tags, and facility assignment are now
built** on the detail page, closing the "Deferred, not built" gap this
section used to record. Three tabs sit beside **Overview** (the identity
fields, unchanged): **Attachments** (`EquipmentAttachments`, `ui/components/`)
— upload/list/download/delete, base64 JSON on the wire
(`EquipmentService.addAttachment`'s `AddAttachmentInput.content`; the page
converts each picked `File` with the local `utils/file-to-base64/` before
calling the store) and download via `EquipmentService.downloadAttachment`
(`GET .../attachments/{attachmentId}/download`, `responseType: 'blob'`,
mirroring `InterventionService.downloadAttachment`) saved through
`BrowserDownloadService`; **Maintenance** (`EquipmentMaintenanceHistory`) —
read-only, newest-first, rendering `EquipmentMaintenanceLogOutput`'s `source`
(`'status_transition' | 'intervention'`) as an icon-and-label pair and
linking to the originating intervention (`FG-{interventionNumber}`) when
`interventionId` is present; **Tags** (`EquipmentTags`) — the current tags as
removable chips plus an `hlm-combobox` over the organization's tag catalog
that creates-or-attaches by name (`AddTagInput`) on a typed match or a "Create"
pick, mirroring `FacilityMoveDialog`'s combobox pattern. Each tab's data
loads once, on its own first activation (`EquipmentDetailPage.onTabActivated`),
mirroring `FacilityDetailPage`'s Plans tab.

Facility assignment/unassignment (`EquipmentStore.assignToFacility` /
`unassignFromFacility`) gets its own dialog
(`EquipmentAssignFacilityDialog`, `ui/dialogs/`) opened from the header's
facility row — a single pick/clear action, not a browsing surface, so it did
not earn a fourth tab. Unassign has no separate confirm dialog, matching the
header's own Decommission action.

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

The list page's KPI strip is backed by `EquipmentKpisStore`
(`state/equipment-kpis/`, `withQueryState`), component-scoped on the list
route and reloaded only on an organization switch. Its data comes from
`EquipmentService.kpis()` (`GET /organizations/{organizationId}/equipment/kpis`).
`EquipmentKpiOutput.openNonConformities` is organization-wide, not
equipment-scoped — non-conformities attach to inspections, not equipment —
and the strip's tile label states that explicitly rather than implying a
per-record count.

Primary service:

- `EquipmentService`

Utility:

- `buildEquipmentTitle` (`utils/equipment-title/`) — the shared "type —
  brand model" title, consumed by both `equipmentTitleResolver` (document
  title, breadcrumb) and `EquipmentDetailPage` (page `<h1>`), so the two
  never drift.
- `fileToBase64` (`utils/file-to-base64/`) — converts a picked `File` to the
  base64 string `AddAttachmentInput.content` expects; the single consumer is
  `EquipmentDetailPage`'s attachment upload handler.

## Cross-Feature Dependencies

- Depends on organization route context from the parent feature.
- Consumes `CollectionPagination`, `CollectionToolbar`, `CollectionSearchBox`,
  `CollectionFilterBar` and `CollectionFilterToggle` from `@shared/collection-pagination`,
  `@shared/collection-toolbar` and `@shared/collection-filters` for the list page's shared
  pagination band, toolbar shell, search box, "Filters" toggle and editable type/status filter
  chip row — see `organization/FEATURE.md` § UI Conventions.
- May be referenced by other organization subfeatures, but equipment ownership stays local to this subfeature.
- Publishes the canonical localized label and Lucide icon catalog as
  `EQUIPMENT_TYPE_OPTIONS` through the feature public API (`index.ts`); the onboarding
  `create-equipment-form`, organization compliance form, and the `maintenance-schedules`
  subfeature's filter bar, table and campaign dialog all consume it so the equipment type
  catalog is not duplicated.
- `EquipmentService` is depended on directly by the `facilities` subfeature's `FacilityPlansStore` (`listByFacility`, `setPlanPosition`) for the floor-plan editor's equipment-pin placement — the same cross-feature dependency `FacilityOverviewStore` already took on for the equipment status summary. `EquipmentService.setPlanPosition` (`PUT
/api/organizations/{organizationId}/equipment/{equipmentId}/plan-position`)
  places, moves, or clears (all-null body) one equipment item's pin on its
  assigned facility's floor plan; the 409 the backend returns when the
  equipment carries no facility assignment is reworded client-side by the
  calling store, not here.
- The reverse dependency: `EquipmentDetailPage` injects the `facilities`
  subfeature's `FacilityService.list` directly, read-only, to preload the
  organization's facilities as options for `EquipmentAssignFacilityDialog` —
  the same pattern `maintenance-schedules`' `MaintenanceSchedulesPage` already
  uses for its facility-scoping select. No write ever crosses into
  `facilities`; the equipment side of the assignment stays on
  `EquipmentStore.assignToFacility` / `unassignFromFacility`.

- Facility pickers (`equipment-create-form`, `equipment-assign-facility-dialog`)
  take `FacilityOption[]` from the facilities feature's `models` barrel, and the
  list/detail pages provide the facilities feature's `FacilityOptionsStore`
  (its `state` barrel) instead of listing facilities inline — one loader, one
  option shape, no raw id on a trigger.

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
- A write response merges into the already-known entity (`utils/merge-equipment`) in both `EquipmentStore` and `ActiveEquipmentStore` — fields a response omits never erase known values, since API Platform omits null fields and a lifecycle Result may serialize fewer fields than the detail read. The one exception is unassign: its response's absent facility relation means unassigned, so `facilityId`/`facilityName` are cleared, never resurrected by the merge.
- A create refusal that carries no violations (the 409 plan-quota refusal) renders inline in the create form through the normalized `StoreError.message`; the store deliberately suppresses the generic error toast for quota refusals.
- `EquipmentsPage` closes the create sheet and resets the create operation only after the success navigation resolves; the sheet's own unsaved-changes gate replaces the route-level `unsavedChangesGuard`, and `?create=1` is ignored without `EQUIPMENT_WRITE`.
- The detail header keeps one primary lifecycle action; Decommission — irreversible — lives in the header's overflow menu as a destructive item and still confirms (`DESIGN.md` "Header actions").
