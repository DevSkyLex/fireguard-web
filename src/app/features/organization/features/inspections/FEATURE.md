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
- `/organizations/:organizationId/inspections/analytics`
- `/organizations/:organizationId/inspections/:inspectionId`

`analytics` (`InspectionAnalyticsPage`) renders the organization-wide
non-conformity statistics snapshot
(`GET /organizations/{organizationId}/non-conformities/statistics`): a KPI
strip (open total, SLA-breached open, average/median resolution days), the
per-severity open/resolved breakdown as labelled proportional bars
(`hlm-progress` + the status-tag registry — never colour alone; deliberately
not the shared line-chart primitive, which a four-row categorical breakdown
does not warrant), and top-10 facilities / equipment types tables. Its
period selector mirrors the dashboard Trends presets (7d/30d/90d/12m,
default 30d) plus **All time**, resolved to inclusive ISO 8601 `from`/`to`
bounds on `createdAt`. It sits under the same pathless
`organization.inspection.read` guard as the rest of the feature and is
reached from the index's **Analytics** page action.

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
  organization's inspections (`InspectionTable`), a URL-synced search box
  (`app-collection-search-box`, `?q=`), a status/result editable filter chip
  row (`app-collection-filter-bar`, `@shared/collection-filters`), sortable
  "Performed on"/"Result"/"Status" table heads, paginated server-side, and a
  "New inspection" link (`INSPECTION_WRITE`-gated). No row menu and no bulk
  actions — the record itself is where every property is edited. The active
  ordering is remembered across visits (`InspectionListPreferencesService`,
  `services/inspection-list-preferences/`, cookie `fg-inspection-list`); page
  size is not.
- `ui/pages/inspection-create-page` (`InspectionCreatePage`) —
  `ui/forms/inspection-create-form`, asking for what
  `CreateInspectionInput` requires — `equipmentId` (a combobox sourced from
  `InspectionCreationOptionsStore`), `result`, `performedAt`, `inspectorType`
  and `inspectorName` — plus the optional `checklistId` select, sourced from
  a component-scoped `ChecklistStore` provided on this page
  (`ChecklistStore.ensureInspectionCreateOptionsLoaded`, active checklists
  only). `notes` and `signature` are filled in afterward, in place, on the
  created record.
- `ui/pages/inspection-detail-page` (`InspectionDetailPage`) — a header
  naming the record with its status, result and non-conformity count, a
  lifecycle band (Submit + confirm-gated Cancel while `draft`, Close while
  `submitted`, nothing once terminal), and
  `ui/components/inspection-information-panel` for the in-place edit
  surface. When the record carries a `checklistId`, the page resolves the
  checklist's name directly through `ChecklistService.get` (browser-only,
  secondary UI data) and passes it to the panel as `checklistName`; a
  deleted/unresolvable checklist degrades to the panel's own neutral
  fallback text rather than a raw id or a toast. See "Cross-Feature
  Dependencies" below for exactly which fields it opens.
- `ui/components/inspection-status-tag` — the `InspectionOutput.status`,
  `.result`, and the non-conformity `severity`/`status` registry
  (`kind: 'status' | 'result' | 'nonConformitySeverity' | 'nonConformityStatus'`),
  the only appearance of any of the four enums in this feature. Reuses the
  exact `inspectionStatus.*` / `inspectionResult.*` i18n ids
  `interventions`' own registry already defined for the same enums (one
  translation, two call sites) when it renders an inspection read-only on
  the intervention detail page's Linked tab.
- `ui/dataviews/non-conformity-list` — the detail page's non-conformities
  section, expanded from the header's non-conformity count (its anchor,
  collapsed by default so the list loads only on first expansion — secondary
  UI data, `AGENTS.md`). One card per record: severity/status tags,
  description, due/resolved dates, notes, and — while `INSPECTION_WRITE` and
  the status is not `done`/`waived` (both immutable server-side) — a status
  select. A waive attempt that lands as **202** (the organization's
  four-eyes waiver gate) renders an inline "pending approval" notice on that
  row, linking to `/organizations/:organizationId/approvals`, instead of
  changing the row's status tag — the record itself stays untouched until
  the request is decided.
- `ui/dialogs/non-conformity-add-dialog` — description, severity, optional
  due date and notes, gated `INSPECTION_WRITE` and hidden — replaced by a
  quiet one-line explanation — once the inspection is `closed`, the
  backend's only documented 409 on the add endpoint. A status change, by
  contrast, stays available regardless of the inspection's own status: only
  the add endpoint is blocked on a closed record.

## State and Data Access

Primary stores:

- `InspectionStore`
- `ActiveInspectionStore`
- `NonConformityStatisticsStore` (route-scoped to the analytics page;
  `withQueryState` over the statistics snapshot, refetched on every
  organization or period-window change — mirrors
  `InterventionStatisticsStore`)
- `InspectionCreationOptionsStore` (component-scoped to the create page;
  loads the organization's equipment into the creation form's combobox
  through `EquipmentService`, imported via the sibling `equipments` feature's
  `data-access` barrel — the same cross-feature pattern
  `InterventionPlanningOptionsStore` already established for its own
  site/member pickers)
- `ChecklistStore` (component-scoped to the create page, imported from the
  sibling `checklists` feature's `state` barrel; feeds the create form's
  optional checklist select through `ensureInspectionCreateOptionsLoaded`)

Primary service:

- `InspectionService` — list search and sort are forwarded through
  `RequestOptions`' typed `search`/`sort` fields (`@core/api`), serialized by
  `HydraApiService.buildParams`, not through hand-built params. Search is a
  trigram match against `result`, `status`, `inspectorName`, `equipmentId`,
  `facilityId` and `checklistId` (`InspectionRepository`). The list's
  sortable fields (`result`, `status`, `performedAt`, `createdAt`) mirror the
  backend's `ListInspectionsProvider` whitelist exactly; `createdAt` is
  whitelisted server-side but has no corresponding table column, so
  `InspectionTable` exposes no head for it.
  The list toolbar's **Export** button downloads a server-side CSV
  (`InspectionService.exportCsv`, `GET
/api/organizations/{organizationId}/inspections/export`, mirroring
  `InterventionService.exportCsv`: direct `this.http` call, `responseType:
'blob'`, saved through `BrowserDownloadService`). The screen's
  `status`/`result` narrowing is forwarded; the free-text search is **not**
  part of the export's contract, so an active search raises the
  `inspection.list.exportFiltersDropped` warn toast. The detail page's
  non-conformities section carries its own **Export**
  (`InspectionService.exportNonConformitiesCsv`, `GET
/api/organizations/{organizationId}/non-conformities/export`,
  `severity`/`status` params) — the endpoint has no per-inspection scoping,
  so the `inspection.nc.exportScope` warn toast always announces that the
  file covers the whole organization. Both endpoints cap the collection at
  50,000 rows; the resulting 422's RFC 7807 `detail` (read back through
  `resolveCsvExportErrorDetail`, `@features/organization/utils`) is
  surfaced as the error toast.
  The detail page also exports the inspection's **PDF report**
  (`InspectionService.exportReport`, `GET
/api/organizations/{organizationId}/inspections/{inspectionId}/report`, the
  header's **Export report** button), and the non-conformities section its
  own **Export report (PDF)** (`InspectionService.exportNonConformitiesReport`,
  `GET /api/organizations/{organizationId}/non-conformities/report`,
  `severity`/`status` params, organization-wide like the CSV). Both PDF
  endpoints share the pro/max plan entitlement gate: a non-entitled plan
  answers 403 with an RFC 7807 `detail`, read back through
  `resolveCsvExportErrorDetail` (it decodes any blob-wrapped problem
  document) and surfaced verbatim as the error toast.
  `updateNonConformityStatus` uses `HydraApiService.patchWithStatus`
  (`observe: 'response'`) rather than `patch`, because the endpoint's two
  success statuses carry different, meaningful bodies: a plain **200**
  returns the updated `NonConformityOutput`, a **202** (waiving above the
  organization's waiver-approval threshold) returns a
  `NonConformityWaivePendingOutput` instead and leaves the record itself
  untouched. The method resolves both into one discriminated
  `UpdateNonConformityStatusResult` (`{ kind: 'updated' | 'pendingApproval' }`)
  rather than collapsing the distinction.

`InspectionStore`'s non-conformity status write branches on that result:
`updated` replaces the cached row (`setEntity`) and clears any stale pending
waiver for it; `pendingApproval` leaves the row untouched and records the
pending request under `nonConformityWaivePending`, keyed by non-conformity
id, for `NonConformityList`'s inline notice. A **409** — `done`/`waived` is
immutable server-side, so a further status write on either always answers
409 — refreshes the row (`InspectionService.getNonConformity`) instead of
dispatching the generic failure toast; `nonConformityStatusErrorText`
carries the specific "already resolved" copy for it.

Behavioral service:

- `InspectionListPreferencesService`
  (`services/inspection-list-preferences/`) — cookie-backed memory of the
  list's active ordering only, mirroring `InterventionListPreferencesService`
  minimally (no hidden columns, no page size — this list has neither).

## Deferred, not built

Non-conformity **attachments** have no `ui/` surface — the backend exposes
attachment endpoints under `/non-conformities/{id}/attachments`, but
building an upload/gallery surface for them was judged a separate pass from
the list/status/add surface this document now describes, matching the same
call `equipments` made for its own attachment history. Revisit once a route
or design names an attachments surface for a non-conformity.

The inspection creation form still does not offer `facilityId`, though it is
accepted by `CreateInspectionInput`: the inspected equipment already carries
its own facility assignment, so a second picker for it would be redundant.
`checklistId` **is now offered** (checklists' `ui/` landed in #85) — see "UI
(this pass)" above. `inspectorUserId` and `inspectorOrganizationName` are
likewise not asked for — `inspectorName` alone covers the minimum viable
record. Revisit any of these once a workflow actually needs to set the
field.

## Cross-Feature Dependencies

- **The record is the edit surface.** Result, performed date, notes and
  signature open where they are displayed, through `@shared/inplace-field`;
  the panel owns the draft and the cancel path, the page owns the call and
  the draft-only edit gate (ARCHITECTURE.md §10.5, and the "only a draft can
  be edited" invariant below).
- Equipment, facility and checklist stay read-only in the panel:
  `UpdateInspectionInput` accepts all three, but the detail page carries none
  of their option lists, and opening a picker with nothing to pick from would
  be worse than a plain value. The checklist row does resolve and show the
  checklist's **name** (via `ChecklistService.get`, browser-only) instead of
  the raw id — see "UI (this pass)" above — but that is a read-only label,
  not an editor.
- The `/:inspectionId/edit` redirect was removed as dead weight: the record
  itself is the edit surface, and nothing in the app links to `/edit` anymore.
- Depends on organization route context from the parent feature.
- Consumes `CollectionPagination` from `@shared/collection-pagination`, `CollectionFilterBar` and
  `CollectionFilterToggle` from `@shared/collection-filters`, and `CollectionSearchBox` and
  `CollectionToolbar` from `@shared/collection-toolbar`, for the list page's shared pagination
  band, editable status/result filter chip row, its "Filters" toggle and its search box — see
  `organization/FEATURE.md` § UI Conventions.
- May compose facility, equipment, and checklist data as supporting inputs for inspection workflows.
- Must not absorb ownership of those sibling subfeatures just because the create flow depends on them.

## Invariants

- Inspection pages remain the orchestrators of inspection workflows.
- Supporting dropdown or selector data from sibling subfeatures is consumed, not re-owned.
- Inspection business rules and mutation flows remain local to this subfeature.
- Only draft inspections can be edited, submitted, or cancelled; submitted inspections can be closed.
- **The closed-inspection gate is asymmetric, and both pages honor it as
  documented backend behavior rather than reconciling it themselves.**
  Adding a non-conformity is blocked (409) once the parent inspection is
  `closed`; changing an existing non-conformity's status is **not** — it
  stays available regardless of the inspection's own lifecycle status. The
  UI hides only the add entry point on a closed record; the row status
  select is never gated by inspection status, only by `INSPECTION_WRITE` and
  the non-conformity's own `done`/`waived` terminal state.
- `done` and `waived` are immutable non-conformity statuses: any further
  status write on either answers 409, surfaced as "already resolved" with
  the row refreshed from the server, never as a silent no-op or a generic
  error toast.
- A waive that requires four-eyes approval (202) never renders as if the
  non-conformity were waived — its status tag and the record itself stay
  exactly as they were until a reviewer decides the request from the
  organization's approvals inbox.

## Published Contracts

- `EquipmentSelectOption` (`models/`) — what `InspectionCreationOptionsStore`
  offers the create form: serial number (or the localized type) as the label,
  the localized type and "location · facility" as the qualifier. The raw
  equipment type key and the id never reach a template.
