# Facilities Feature

## Purpose

Owns organization-scoped facility workflows.

This subfeature is responsible for:

- listing facilities for the active organization as a paginated list,
- facility creation,
- active facility context for detail and edit flows,
- facility detail and edit route orchestration.

This subfeature does not own top-level organization selection. That remains in `features/organization`.

## Entry Points

- Routes: `facilities.routes.ts`
- Public API: none. The feature root barrel was removed — it `export *`-ed
  `state`, `models` and `data-access` and had no external consumer.

## Routes

- `/organizations/:organizationId/facilities`
- `/organizations/:organizationId/facilities/map`
- `/organizations/:organizationId/facilities/create`
- `/organizations/:organizationId/facilities/:facilityId`
- `/organizations/:organizationId/facilities/:facilityId/edit`

`map` is listed ahead of `:facilityId` in `FACILITY_ROUTES` so it is never
swallowed as a facility id.

Facility detail routes **seed** facility context without blocking activation:
`facilityResolver` fires the fetch into `ActiveFacilityStore` and returns
immediately, the detail page paints a full-page skeleton from the store's
pending state (first-order on slow field connections), the title resolver
answers synchronously with a neutral label until the record lands (the page
then re-sets the document title through `TitleService`), and a load failure
toasts globally and returns to the organization landing page from the page.
The resolver stays the single loading path for the record — the page never
re-fetches it.

Facility coordinates come from the backend `latitude`/`longitude` fields
(optional on `FacilityOutput`), enforced both-or-neither. They may be set at
creation (`ui/forms/facility-create-form`) or afterward, in place, on the
record's Information tab (`ui/components/facility-information-panel`) — there
is no separate coordinates form.

A generic, domain-agnostic map primitive exists at `shared/map/`
(`ARCHITECTURE.md` §8.5): MapLibre GL JS over OpenFreeMap's public vector
tiles, with self-hosted, achromatic (grayscale) light/dark style JSONs under
`public/map/` built from OpenFreeMap's Positron style
(`tools/map-style/build-map-styles.mjs`). No geocoding. `maplibre-gl` is
imported dynamically and browser-only by that primitive's single component —
the documented `ARCHITECTURE.md` §1.1 dependency addition.

This subfeature is the primitive's first consumer, in two places:

- **`ui/pages/facility-map-page`** (`FacilityMapPage`,
  `facilities/map`) renders every facility with both coordinates set
  (`FacilityMapStore.loadMapped`, `hasCoordinates: true`) as a marker;
  selecting one navigates to that facility's record. A discreet banner names
  how many facilities still lack coordinates (`loadUnplacedCount`, read from
  a single-item page's `totalItems` rather than a second full fetch) and
  links back to the list; when no facility has coordinates at all, an
  `app-empty-state` replaces the map entirely. `facility.status` maps onto
  the primitive's severity-free vocabulary — `active` as `neutral`,
  `archived` as `muted` (`utils/facility-marker`) — since a facility carries
  no severity of its own.
- **`ui/dialogs/facility-map-picker-dialog`** (`FacilityMapPickerDialog`) is
  the "Pick on map" affordance shared by `FacilityCreateForm` and
  `FacilityInformationPanel`'s coordinates editor: an `hlm-dialog` hosting an
  interactive `app-map`; a click patches the caller's latitude/longitude
  drafts and closes the dialog. The numeric inputs remain the field of
  record — they stay editable and are what actually gets submitted; the
  picker only ever pre-fills them. `utils/facility-map-center` resolves
  where it opens: the draft's own coordinates once both are filled, else (on
  the create form only, since the data is already loaded for the parent
  combobox) the average of the organization's other located facilities, else
  the primitive's own neutral default — never a fetch made just for this.

## UI (this pass)

- `ui/pages/facilities-page` (`FacilitiesPage`) — the roots-only list:
  search, an "include archived" filter, a list/grid/map toggle
  (`ui/tables/facility-table` / `ui/dataviews/facility-grid`), and a "New
  facility" link. Row actions are limited to Archive/Restore. `map` is not a
  rendering mode of this page — it is page-local view state (`layout`, not
  URL-synced), too light a mechanism for an interactive map, so selecting it
  navigates to the dedicated `facilities/map` route instead.
- `ui/pages/facility-create-page` (`FacilityCreatePage`) —
  `ui/forms/facility-create-form`, requiring only `type` and `name`; parent,
  code, address and coordinates are optional here and remain editable on the
  record afterward.
- `ui/pages/facility-detail-page` (`FacilityDetailPage`) — three tabs.
  **Overview** (default) renders `ui/components/facility-hierarchy-chart`,
  built on the shared `shared/tree` `Tree` primitive (only when
  `hasChildren`), plus the `FacilityOverviewStore` summary
  (compliance rate, equipment count/breakdown, next inspection, recent
  inspections). **Information** renders
  `ui/components/facility-information-panel`, the in-place edit surface for
  `name`/`code`/`address`/coordinates; `type` and the parent render as
  read-only rows. **Plans** renders `ui/components/facility-plan-list`
  (upload, primary badge, per-row View/Set as primary/Delete menu) beside
  `@shared/plan-viewer`'s `app-plan-viewer` over `FacilityPlansStore`, with
  `@shared/empty-state` when the facility has no floor plan yet. A header
  **Delete** action is danger, confirm-gated (`hlm-alert-dialog`), and
  `FACILITIES_WRITE`-gated.
- `ui/components/facility-status-tag` — the `FacilityOutput.status` registry
  (`active`/`archived`), the only appearance of the enum in this feature.

## Facility Attachments and Floor Plans (Plans Tab)

`FacilityAttachmentService` (`data-access/services/facility-attachment/`) owns
the attachment resources — `/api/facilities/{id}/attachments` (list, scoped
by `kind`; upload, multipart with an optional `kind` field) and
`/api/facility-attachments/{id}` (read, delete with `If-Match`) plus the
`/primary` action. It is a separate service from `FacilityService`: a
different, non-organization-scoped URL family, following the interventions
subfeature's `InterventionService.uploadAttachment`/`listAttachments`
precedent for the multipart shape.

`FacilityAttachmentOutput` (`models/facility-attachment/`) carries `kind`
(`'document' | 'floor_plan'`), `isPrimaryPlan`, and nullable
`imageWidth`/`imageHeight` — probed server-side for a `floor_plan`, null for
a `document`, an SVG, or a failed probe.

The Plans tab (`FacilityPlansStore`, `state/facility-plans/`) is
**tab-scoped**, provided on `FacilityDetailPage` alongside
`FacilityOverviewStore`, and loads only on first activation of the tab
(browser-only — secondary content, `ARCHITECTURE.md` §12.4). It lists
`kind=floor_plan` attachments only; plain documents are out of scope for this
pass. Named `CallState` fields track list/upload/setPrimary/delete
independently; `withEntities` (`collection: 'plan'`) backs the list so
setting a new primary can flip both the previous and the new plan's
`isPrimaryPlan` locally, mirroring the backend's atomic swap without a
re-fetch. `selectedPlan` defaults to the primary plan, then the first
uploaded one, until a row is explicitly selected.

`FacilityAttachmentOutput` carries no download URL — bytes are only ever
served at `GET /api/facility-attachments/{id}/download`
(`Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`,
bearer-authenticated), never as a resource field, mirroring
`InterventionAttachmentOutput`/`InterventionService.downloadAttachment`.
`FacilityAttachmentService.download` reads that route with `responseType:
'blob'`. `FacilityPlansStore` reacts to `selectedPlan` changing (a
`withHooks` effect) by fetching that plan's bytes and republishing them as a
browser object URL (`planImageUrl`), revoking the previous one on every
change and on destroy; `app-plan-viewer`'s `src` is fed `planImageUrl`, not
the attachment record.

## Plan Overlay (Read-Only)

The same `withHooks` effect that fetches `planImageUrl` also fetches the
selected plan's **read-only** zone/equipment overlay through
`FacilityService.getPlanOverlay` (`GET
/api/organizations/{organizationId}/facilities/{facilityId}/plan-overlay?attachmentId=…`),
kept on `FacilityService` rather than `FacilityAttachmentService` because the
route is organization-scoped like the rest of that service, not part of the
attachment URL family. Not a Hydra item (no `@id`/`@type`), so the service
reads it directly through `HttpClient`, mirroring
`FacilityAttachmentService.download`. `FacilityPlansStore` now also holds
`organizationId` (set by `load`) purely so this effect — triggered
internally, not from a page call — can build the URL.

`FacilityPlanOverlayOutput` (`models/facility-plan-overlay/`) carries the
plan's `imageWidth`/`imageHeight` and two collections in **normalized 0–1
image coordinates**: `zones` (a child facility's polygon outline, `points`
in order) and `equipment` (a pinned equipment's `x`/`y`). `FacilityOutput`
separately gains an optional `planGeometry` (`models/facility/`) — one
facility's own outline on its parent's plan, detail-read only; not yet
consumed by any UI in this pass.

`ui/components/facility-plan-overlay` (`FacilityPlanOverlay`) renders the
overlay, projected into `app-plan-viewer`'s `overlayTemplate` from the Plans
tab so it inherits pan/zoom through the DOM. Zones are hatch-filled SVG
polygons (achromatic per `PRODUCT.md` — zones carry no status colour) with a
name label at the polygon centroid (`utils/polygon-centroid`, a pure area-
weighted formula with a vertex-average fallback for a degenerate shape);
each is a focusable, keyboard-activatable SVG `<a role="button">` (Enter/Space)
since it navigates via an emitted output, not a real `href`. Equipment pins
are positioned `<button>`s, `utils/normalized-point` converting the wire
format to image-pixel coordinates; each pin is counter-scaled by
`1 / scale` (`scale` from `PlanViewerOverlayContext`) so it keeps a constant
on-screen size while the plan is zoomed, and coloured by status through a
**feature-owned** `models/equipment-status-tag/` registry — the equipment
status enum belongs to the sibling `equipments` feature, but this is the
only place this feature renders it, so it is duplicated locally rather than
imported, mirroring `interventions`' own `equipmentStatus` kind on
`intervention-tag.util.ts` (same `$localize` ids, three call sites, no
cross-feature registry import). The component is presentational — inputs
and outputs only, no store or service — and the page owns the navigation on
`zoneActivated`/`equipmentActivated` (absolute paths, to
`/organizations/:organizationId/facilities/:facilityId` and
`/organizations/:organizationId/equipments/:equipmentId`).

`showZones`/`showEquipment` are store-held visibility toggles (both default
`true`, `FacilityPlansStore.setShowZones`/`setShowEquipment`), rendered as
`hlm-switch` chips above the viewer, shown only when
`FacilityPlansStore.overlayHasContent()` — no zones and no equipment renders
no toggle chrome at all.

## Facility Listing (Roots-Only DataView)

The facility list page presents the organization's **root** facilities as a
flat, paginated dataview with a list/grid layout toggle:

- root facilities are loaded and paginated on init via
  `FacilityStore.loadRootFacilities`, which requests
  `GET /organizations/{orgId}/facilities?rootsOnly=true` (never combined with
  a parent filter; `includeArchived` defaults to `false`),
- the page is **roots-only**: nested children are no longer expanded inline.
  Hierarchy navigation (drill-down into children) is deferred to the facility
  detail page,
- the `hasChildren` boolean is still returned per item by the backend and is
  available for the detail page; the dedicated
  `GET /organizations/{orgId}/facilities/{facilityId}/children` endpoint and
  `FacilityStore.loadChildFacilities` / `FacilityService.listChildren` remain
  in place for direct-child lazy loading,
- the `/descendants` endpoint is used by the facility detail overview, not by
  the root listing.

Search and pagination operate on the **root level only** (the `?page=` query
param is synced for roots). Row actions are Open (into the record, which is
also the edit surface — there is no separate row-level edit action) and
Archive/Restore.

## Facility Hierarchy (Detail Overview)

The facility detail page's **Overview** tab renders the descendant hierarchy
through `FacilityHierarchyChart`, built on the shared `shared/tree` `Tree`
primitive (`utils/facility-to-tree-node`'s `facilityToTreeNode` maps
`FacilityOutput` onto `TreeNode`; each row projects the facility's icon, name
and `FacilityStatusTag` through `Tree`'s `nodeTemplate`). Loading is based on
the backend descendants endpoint, not on `Tree`'s own lazy expansion:

- all descendants are auto-loaded once the facility resolves (only when
  `facility.hasChildren` is `true`), via an `effect` calling
  `FacilityStore.ensureFacilityDescendantsLoaded`,
- `FacilityService.listDescendants` calls
  `GET /organizations/{orgId}/facilities/{facilityId}/descendants`, then the
  store groups the flat Hydra `member` collection by `parentFacilityId` for
  `FacilityHierarchyChart`,
- because the whole subtree is already resolved before `Tree` renders,
  `Tree`'s `expandRequested` never fires in practice and is wired to a no-op;
  `loadingIds`/`failedIds` stay empty,
- `FacilityStore.loadChildFacilities` remains available for direct-child
  loading flows, but the detail overview uses `/descendants`,
- all secondary fetches are **browser-only** (no `TransferState`), and node
  selection navigates to the chosen facility's detail page.

The list page stays **roots-only**; hierarchy navigation lives here in the
detail Overview.

## Compliance Layer (Facility Map)

`ui/pages/facility-map-page` carries an optional, off-by-default
**compliance layer** (`FacilityMapStore.complianceVisible`), a switch beside
the list/map layout toggle. Switching it on the first time lazily loads the
Compliance-owned facility tree (`GET /api/organizations/{organizationId}/facility-tree`,
browser-only, never on page init) via a small local
`data-access/services/compliance-tree/ComplianceTreeService` — `FacilityService`
is the org-scoped-facilities family, but this route belongs to the Compliance
module and returns a different, recursive shape, so a dedicated,
narrowly-scoped service was judged cheaper than teaching `FacilityService` a
foreign resource. `utils/facility-tree-flatten` flattens the response into a
`facilityId -> complianceRate` map, joined onto `FacilityMapStore.mappedFacilities`
by id.

While the layer is on:

- each marker's bucket comes from `utils/compliance-bucket` (`≥90` positive,
  `60–89` warning, `<60` critical, no data muted — thresholds in
  `constants/compliance-bucket-thresholds.constants.ts`) instead of the
  facility's lifecycle status, and the rate is folded into the marker's label
  (`"{name} — {rate}% compliant"`, `utils/facility-compliance-marker`) so the
  signal is never colour/glyph-only,
- a compact **"worst sites"** ranking (`ui/components/facility-compliance-worst-sites`,
  fed by `FacilityMapStore.worstFacilities`, the five lowest-rate located
  facilities) renders beside the map; selecting a marker or a ranked entry
  both navigate to the facility's record. `@shared/map`'s `Map` primitive
  only ever reads its `center` input once, at mount — it has no way to
  re-center an already-mounted instance — so "click a worst site to focus
  the map" was not achievable as a live camera move; navigating to the
  record was chosen instead, and re-centering support is a `@shared/map`
  follow-up, not a defect here. While the tree load is pending, the ranking
  slot renders skeletons in a `role="status"` region instead of the
  confirmed-empty message.

**Known limitation:** during that fetch the map pins themselves stay in the
muted/"no data" state — the markers are a pure computed over
`complianceMap`, which is empty until the response lands, and the map
primitive has no per-layer pending state to show instead. Documented, not
fixed.

**Merge note:** a sibling branch (`feat/compliance-explorer`) is building its
own, richer compliance transport and models for a dedicated explorer surface.
This layer's `ComplianceTreeService`, `ComplianceTreeNodeOutput` and the
bucket thresholds were deliberately kept small and facilities-map-scoped
rather than shared with a branch not yet merged; consolidating them with the
explorer's compliance slice (a single transport, a single set of bucket
thresholds) is expected work at merge time, not a gap in this pass.

## State and Data Access

Primary stores:

- `FacilityStore`
- `ActiveFacilityStore`
- `FacilityTreeStore` — the site hierarchy for the parent feature's assets
  explorer. Roots once, then one branch per expansion, each fetched exactly
  once; collapsing and re-expanding is a navigation gesture, not a reason to
  ask the server again. `move` re-parents a site optimistically over the
  loaded roots/branches, with rollback on failure — the flow behind both the
  explorer's `Tree` drag-drop and its `FacilityMoveDialog` "Move to…" action.
- `FacilityMapStore` — the `facilities/map` route's own slice
  (`state/facility-map`). `FacilityStore`'s roots-only, entity-keyed shape
  does not fit this flat, location-scoped read, so it sits beside it rather
  than inside it (`ARCHITECTURE.md` §10.11). Also owns the optional
  compliance layer's state (`complianceCallState`, `complianceVisible`,
  `worstFacilities`) — see "Compliance Layer (Facility Map)" above.
- `FacilityPlansStore` — tab-scoped, the Plans tab's floor plans (see
  "Facility Attachments and Floor Plans" above).

Primary services:

- `FacilityService`
- `ComplianceTreeService` — minimal transport for the Compliance-owned
  facility tree the map's compliance layer reads (see above).
- `FacilityAttachmentService`

> > > > > > > 0aecceb8 (feat(facilities): add the floor plans tab with upload and primary selection)

## Cross-Feature Dependencies

- **The record is the edit surface.** Every writable property of a site opens
  where it is displayed, through `@shared/inplace-field`; the panel owns the
  draft and the cancel path, the page owns the call (ARCHITECTURE.md §10.5).
  `type` and the parent stay read-only because `UpdateFacilityInput` accepts
  neither — the parent moves through its own action.
- `/:facilityId/edit` is retired and **redirects onto the record**, so installed
  applications and bookmarks still resolve.
- Depends on organization route context from the parent organization feature.
- The Plans tab consumes `@shared/plan-viewer`'s `app-plan-viewer` (pan/zoom
  raster viewer, domain-agnostic) for the selected floor plan's image.
- Consumes `ListPagination` from the parent `features/organization` feature
  (`@features/organization/ui/components`) for the list page's shared pagination band — see
  `organization/FEATURE.md` § UI Conventions.
- The parent feature consumes this subfeature's `state` barrel
  (`FacilityTreeStore`), `models` barrel (`FacilityOutput`), `utils` barrel
  (`facilityToTreeNode`) and `ui/dialogs` barrel (`FacilityMoveDialog`) for
  the assets explorer at `/organizations/:organizationId/assets`
  (ARCHITECTURE.md §4). Mostly read-only — the parent browses the hierarchy
  and this subfeature keeps ownership of sites — except the re-parent flow:
  the parent calls `FacilityTreeStore.move` from both `Tree`'s drag-drop and
  `FacilityMoveDialog`, so the write itself still lives in this subfeature's
  store. `facilityToTreeNode` moved here from the parent's own `utils/`
  because both the parent's assets explorer and this subfeature's
  `FacilityHierarchyChart` need it, and its lowest common scope is this
  subfeature (ARCHITECTURE.md §2.8).
- May compose with sibling organization subfeatures in pages when the workflow requires it, but must not take ownership of their state.

### Deferred, not built

`AssetEquipmentTab` / `AssetInspectionTab` — the shared equipment/inspection
panes this document previously named for both the facility record and the
assets explorer — are still **not built**, now that the explorer route
exists (`/organizations/:organizationId/assets`,
`organization/FEATURE.md`). The explorer's right pane turned out not to need
them: it is `organization`'s own `OrganizationAssetsPaneStore`, a read-only
preview reusing `EquipmentService`/`InspectionService` directly rather than a
shared presentational pane, and the `inspections` subfeature still has no
`ui/` of its own. The facility detail page's Overview tab is unaffected — it
still reads its equipment/inspection summary from `FacilityOverviewStore`
(`ARCHITECTURE.md` §10.10/§2.9), not from the explorer's pane. If a shared
pane component is built later (e.g. once `inspections` grows a `ui/`), it
takes an **optional** `facilityId` and navigates by **absolute** path, for
the same reason the rest of this document's cross-feature panes do.

## Deletion

The facility detail page exposes a **Delete** action (danger, confirm-gated,
`FACILITIES_WRITE`) that calls `FacilityStore.remove` →
`FacilityService.remove`, the canonical `DELETE /api/facilities/{id}`
endpoint. Backend semantics depend on the facility's canonical record status
(opaque to this app, which only ever creates `published` facilities through
the organization-scoped endpoints): a published facility is **archived**
server-side — the same outcome as the existing row-menu Archive action, so
deleting simply removes it from active lists and it can still be restored —
while a draft facility (created by an in-progress intervention) would be
hard-deleted and refused with a 409 if it still has children. `remove()`
resolves the current revision via a canonical `GET` first, since the
organization-scoped read never carries `revision`, then sends the required
`If-Match` precondition.

## Invariants

- Facility routes remain organization-scoped.
- Active facility state belongs to this subfeature.
- Archived facilities can be restored.
- Facility resolvers and facility page orchestration belong here, not in the parent feature or layouts.
- At most one floor plan is primary per facility; setting a new primary must reflect the swap on both plans without a re-fetch (mirrors the backend's atomic unset).
- The Plans tab loads only when activated and only in the browser — it is secondary content, never part of the resolver's seeded fetch.
- The plan overlay is read-only in this pass; editing zone/equipment placement is a separate, later stacked branch.
- `FacilityPlanOverlay` never injects a store or service, and never navigates itself — it emits, the page navigates.
