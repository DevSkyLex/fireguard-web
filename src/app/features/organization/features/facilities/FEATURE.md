# Facilities Feature

**Reading guide:** [Documentation index](../../../../../../docs/README.md) · [Related guide](../../../../../../docs/guides/facilities-and-spatial-views.md).

## Purpose

Owns organization-scoped facility workflows.

This subfeature is responsible for:

- listing facilities for the active organization as a paginated list,
- facility creation,
- active facility context for detail and edit flows,
- facility detail and edit route orchestration.

This subfeature does not own top-level organization selection. That remains in `features/organization`.

**Creation is parent-scoped.** `FacilitiesPage` binds `?create=1` and `?parent=`,
opens `FacilityCreateSheet` and seeds its parent combobox from it, so "New facility" from the asset
explorer's selected site opens already nested under it. The seed writes the
model, not the field, so the form does not start dirty.

## Entry Points

- Routes: `facilities.routes.ts`
- Public API: none. The feature root barrel was removed — it `export *`-ed
  `state`, `models` and `data-access` and had no external consumer.

## Routes

- `/organizations/:organizationId/facilities`
- `/organizations/:organizationId/facilities/map`
- `/organizations/:organizationId/facilities/create` — a functional redirect onto
  the list with `?create=1` (the creation sheet), keeping `?parent=`
- `/organizations/:organizationId/facilities/:facilityId`
- `/organizations/:organizationId/facilities/:facilityId/3d`

`map` is listed ahead of `:facilityId` in `FACILITY_ROUTES` so it is never
swallowed as a facility id; `:facilityId/3d` needs no such care, being two
segments against `:facilityId`'s one.

<a id="scene-rendering-p1"></a>
<a id="room-selection-and-its-keyboard-accessible-surface-p2"></a>

## Building 3D View

`/:facilityId/3d` is a dedicated route over `FacilityBuilding3dStore`, browser-only
model loading and lazy Three/OrbitControls. SSR renders a skeleton. Keep unresolved,
error, no-floor, unavailable-WebGL and ready states distinct. Scene components emit
events and never call stores. Async mounts are generation-fenced; teardown cancels
frames, listeners/observers and disposes distinct GPU resources exactly once.
Render on demand, bound animations and honor reduced motion. Selection has an outline
and an accessible floor/room-list alternative to canvas picking. Unit geometry/stub
tests do not prove real GPU rendering or lifecycle counters in a browser.

See the [building scene reference](../../../../../../docs/guides/facilities-and-spatial-views.md#building-scene-reference) for details and rationale.

<a id="ui-this-pass"></a>

## UI

- `ui/pages/facilities-page` (`FacilitiesPage`) — the roots-only list:
  search, an "include archived" filter chip (`app-collection-filter-bar`,
  `@shared/collection-filters`, replacing the earlier popover — its lone
  field's value control is a checkbox, not a select), a list/grid/map toggle
  (`ui/tables/facility-table` / `ui/dataviews/facility-grid`), and a "New
  facility" link. Row actions are limited to Archive/Restore. `map` is not a
  rendering mode of this page — it is page-local view state (`layout`, not
  URL-synced), too light a mechanism for an interactive map, so selecting it
  navigates to the dedicated `facilities/map` route instead.
- `ui/sheets/facility-create-sheet` (`FacilityCreateSheet`), opened by `FacilitiesPage` —
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
  Spartan `Empty` primitives when the facility has no floor plan yet. A header
  **Delete** action is danger, confirm-gated (`hlm-alert-dialog`), and
  `FACILITIES_WRITE`-gated.
- `ui/components/facility-status-tag` — the `FacilityOutput.status` registry
  (`active`/`archived`), the only appearance of the enum in this feature.
- `ui/dialogs/facility-qr-dialog` (`FacilityQrDialog`) — see "Printable QR
  code" below.

## Printable QR code

A read-level header action ("QR code", ungated by `FACILITIES_WRITE`) opens
`ui/dialogs/facility-qr-dialog`, a purely presentational dialog encoding the
facility's absolute record URL
(`{origin}/organizations/{organizationId}/facilities/{facilityId}`) as a QR
image. Rendering mirrors `features/account`'s `AccountMfaPanel`: `qrcode` is
imported dynamically, browser-only, so the library never enters the server
bundle for a dialog behind a click — this is the second component to import
it (`ARCHITECTURE.md` §1.1). The image carries an alt text naming the
facility; the facility name and code print beneath it.

"Print" calls `window.print()`. Because no component may carry
`styles`/`styleUrl`, the print stylesheet cannot be scoped inside this
dialog's own template — it is a small `@media print` block in the app-wide
`src/styles.css`, keyed off the CDK overlay container rather than any class
this feature owns: everything outside the open overlay is hidden, the
backdrop is hidden, and the overlay pane is unpinned from its fixed
position so it flows as a normal printed page. This dialog is the app's
first print surface; if a second one appears, revisit whether the rule
still belongs in the global stylesheet or should move to a shared,
domain-agnostic `shared/print/` concern. "Download PNG" is a plain
`toDataURL` → anchor-click download, no upload of its own.

## Facility Attachments and Floor Plans (Plans Tab)

`FacilityAttachmentService` owns attachment list/upload/download/delete/primary;
`FacilityService` owns the organization-scoped plan projections. Plans load browser-only
on tab activation with independent list/upload/primary/delete state. Prefer the primary
plan until explicit selection. Download bytes from the authenticated endpoint rather
than inventing a resource URL; revoke replaced/destroyed object URLs.

See the [facility plan attachments reference](../../../../../../docs/guides/facilities-and-spatial-views.md#facility-plan-attachments-reference) for details and rationale.

## Plan Overlay (Read Side)

Plan overlays use normalized 0–1 image coordinates for zones and equipment pins.
The presentational overlay inherits viewer pan/zoom, keeps pin screen size stable and
emits selection. Zones remain neutral; status pins carry a readable label. Zone and
equipment visibility are independent. An empty/error projection is not a verified
absence of source records. Approved sibling status types stay within public APIs.

See the [facility overlay reference](../../../../../../docs/guides/facilities-and-spatial-views.md#facility-overlay-reference) for details and rationale.

## Plans Tab Parity With The 3D View

Plans and 3D use the same selected-facility/equipment panel contract. Preserve keyboard
activation and a list-based selection path; selection does not silently navigate away.
Selection reads are scope-fenced and report loading/error/unavailable distinctly.
View changes preserve the current draft and selection when its identity stays valid.

See the [facility plan selection reference](../../../../../../docs/guides/facilities-and-spatial-views.md#facility-plan-selection-reference) for details and rationale.

## Plan Editor (Write Side)

Zone geometry uses `FacilityService.setPlanGeometry`; equipment pins use the approved
sibling `EquipmentService.setPlanPosition`. Null fields clear geometry/position.
Facility and equipment write grants gate their own affordances. Serialize accepted
writes; success refreshes the overlay. A 409/412 refresh retains placement/drawing
context and coordinate-dialog drafts. Coordinate dialogs use Signal Forms, reseed
only on opening, retain failed input and close only after confirmed success.
Keyboard coordinate dialogs provide the non-pointer path; percentages convert to
normalized coordinates at the boundary. Presentational editors emit events only.

See the [facility geometry editing reference](../../../../../../docs/guides/facilities-and-spatial-views.md#facility-geometry-editing-reference) for details and rationale.

## Facility Listing (Roots-Only DataView)

The listing is roots-only (`rootsOnly=true`), server-paginated and searchable at that
level; hierarchy belongs to detail. Roots and parent filters are mutually exclusive.
Use typed endpoint-supported ordering and the feature's preference cookie; grid/table
share the server dataset. Direct children and descendants remain distinct APIs.
Open, Archive and Restore retain their existing permission/revision contracts.

See the [facility root collection reference](../../../../../../docs/guides/facilities-and-spatial-views.md#facility-root-collection-reference) for details and rationale.

<a id="interventions-on-this-site-detail-overview"></a>

## Facility Hierarchy (Detail Overview)

Overview reads the descendant projection when children exist and groups the flat
collection by parent id. The hierarchy does not change the roots-only listing or
invent another direct-child fetch per expanded node. The scoped intervention preview
uses the approved read-only intervention API and links to its `?site=` narrowing;
it owns no intervention workflow or state.

See the [facility hierarchy reference](../../../../../../docs/guides/facilities-and-spatial-views.md#facility-hierarchy-reference) for details and rationale.

## Compliance Layer (Facility Map)

The compliance layer is off by default and loads its projection browser-only on
activation. Parent-owned bucket thresholds and readable labels accompany status
colors. Pending/error/unknown compliance remains distinct from a confirmed empty result.
Ranking selection opens the facility; it does not imply unsupported camera re-centering.
The map does not own Organization's broader compliance explorer or its workflow.

See the [facility map compliance reference](../../../../../../docs/guides/facilities-and-spatial-views.md#facility-map-compliance-reference) for details and rationale.

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
- `FacilityBuilding3dStore` — route-scoped, the `/:facilityId/3d` building
  model plus the view-local scene selection/isolation/exploded/camera-reset
  state a later three.js pass renders against (see "Building 3D View" above).

Primary services:

- `FacilityService`
- `ComplianceTreeService` — minimal transport for the Compliance-owned
  facility tree the map's compliance layer reads (see above).
- `FacilityAttachmentService`

## Cross-Feature Dependencies

- **The record is the edit surface.** Every writable property of a site opens
  where it is displayed, through `@shared/inplace-field`; the panel owns the
  draft and the cancel path, the page owns the call (ARCHITECTURE.md §10.5).
  `type` and the parent stay read-only because `UpdateFacilityInput` accepts
  neither — the parent moves through its own action.
- The `/:facilityId/edit` redirect was removed as dead weight: the record
  itself is the edit surface, and nothing in the app links to `/edit` anymore.
- Depends on organization route context from the parent organization feature.
- The Plans tab consumes `@shared/plan-viewer`'s `app-plan-viewer` (pan/zoom
  raster viewer, domain-agnostic) for the selected floor plan's image.
- `FacilityPlansStore` injects `equipments`' `EquipmentService` directly
  (`listByFacility`, `setPlanPosition`) — the same cross-feature dependency
  `FacilityOverviewStore` already takes on that data-access, extended here
  since equipment placement is equipment data, not facility data.
- Consumes `CollectionPagination`, `CollectionToolbar`, `CollectionSearchBox`,
  `CollectionFilterBar` and `CollectionFilterToggle` from `@shared/collection-pagination`,
  `@shared/collection-toolbar` and `@shared/collection-filters` for the list page's shared
  pagination band, toolbar shell, search box, "Filters" toggle and "include archived" filter
  chip — see `organization/FEATURE.md` § UI Conventions.
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
- `FacilityOverviewStore` cross-imports `InterventionService` from
  `@features/organization/features/interventions` (root barrel) and
  `InterventionOutput` from that feature's `models` concern barrel, for the
  detail Overview tab's "Interventions on this site" preview (see above) —
  the reverse of the pattern the interventions feature's own "Linked" tabs
  already established for facilities/equipment/inspections
  (`interventions/FEATURE.md` § Cross-Feature Dependencies). Read-only: no
  new method was needed, `InterventionService.list`'s existing `site` filter
  covers it.
- `maintenance-schedules`' page injects `FacilityService` directly (`list`)
  to populate its facility filter and campaign-scoping selects — read-only,
  the same direct cross-feature service dependency pattern
  `FacilityPlansStore` already takes on `equipments`' `EquipmentService`.
- **interventions → facilities, in write (8.0):** the intervention detail
  page's "Add facility" sheet cross-imports `FacilityCreateForm` from
  `ui/forms/facility-create-form` and calls
  `FacilityService.createForIntervention` — already public through this
  feature's `data-access` barrel, used read-side by the "Linked" tabs'
  `listByIntervention` — through `InterventionWorkspaceStore.createFacility`.
  This is the reverse direction of every other interventions cross-import
  recorded above and in `interventions/FEATURE.md`, all of which are
  read-only: here interventions performs the create. Ownership stays with
  this feature — the form's fields, its validation, and the `site_setup`
  record itself all belong here, and `createForIntervention`'s `PUT`-with-
  `clientId` idempotency guard already existed for exactly this kind of
  retried write. Interventions only enriches the
  emitted `CreateFacilityInput` with the `organization`/`intervention` IRIs
  and refreshes its own workspace and linked-resources cache afterward.
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
- A create refusal that carries no violations (the 409 plan-quota refusal) renders inline in the create form through the normalized `StoreError.message`; the store deliberately suppresses the generic error toast for quota refusals.
- `FacilitiesPage` closes the create sheet and resets the create operation only after the success navigation resolves. The sheet's own gate (an Escape or outside-click on a dirty draft raises `UnsavedChangesDialog`, the pattern of `intervention-work-item-sheet`) replaces the route-level `unsavedChangesGuard`. `?create=1` is consumed once (browser only) and ignored without `FACILITIES_WRITE` — the `/create` redirect carries no guard.
- The detail page's header makes "Add sub-facility" (the list with `?create=1&parent=`) its primary action, QR code the outline secondary, and folds Delete into the overflow menu (`DESIGN.md` "Header actions"); the Hierarchy section repeats the link in context only under `FACILITIES_WRITE`, whether or not the facility already has children.
- At most one floor plan is primary per facility; setting a new primary must reflect the swap on both plans without a re-fetch (mirrors the backend's atomic unset).
- The Plans tab loads only when activated and only in the browser — it is secondary content, never part of the resolver's seeded fetch.
- Plan images and annotations belong to the full organization/facility/attachment selection.
  A changed or removed selection cancels its reads, revokes its image URL and discards editor drafts.
  `selectedPlanReady` requires both current resources; every editing command is blocked until ready.
  Delayed writes cannot settle another selection's editor state. Reused parameterized pages reload
  the Plans tab for the new facility on browser activation.
- Facility options consume the published `AUTH_SESSION_PORT` revision and cache by session and
  organization. Context changes clear old options immediately; successful empty lists are cached,
  while failed loads remain retryable.
- `FacilityPlanOverlay` stays read-only and presentational — it never gains a store, a service, or navigation of its own; every editor affordance lives in `FacilityPlanEditor` (which wraps it) and the page.
- Drawing a zone outline requires at least three vertices, mirrored client-side (`isClosablePolygon`) ahead of the backend's own check.
- Every editor write is permission-gated: `FACILITIES_WRITE` for a zone outline, `EQUIPMENT_WRITE` for an equipment pin — never inferred from the other.
- `FacilityPlanOverlay` never injects a store or service, and never navigates itself — it emits, the page selects (and only its panel's explicit "View record" action navigates).
- `/:facilityId/3d` is browser-only: `FacilityBuilding3dStore.loadModel` never fires on the server, and `FacilityBuilding3dPage` orchestrates it (route params, WebGL detection, the five states) — no child of that page ever injects a store or reads `window`/`document` outside `afterNextRender`.
- `FacilityBuilding3dScene` never injects a store or service and never navigates itself — it emits, the page acts. Its mount is guarded by a monotonic generation token so an async continuation that resolves after teardown never attaches a live renderer to a dead scene, and its teardown disposes every geometry and material in the building group exactly once, cancels every pending `requestAnimationFrame`, and disconnects its `ResizeObserver` — no permanent render loop ever runs; rendering is invalidate-on-demand.

## Published Contracts

- **`FacilityOption` + `toFacilityOption` + `FacilityOptionsStore`** (`models/`,
  `utils/`, `state/facility-options/`) — the one shape every facility picker
  renders: name, localized type, ancestor path (" › "), address. The
  component-scoped store loads the organization's facilities once per page
  (browser only, `ensureLoaded`) and derives the options plus a map centre;
  `FacilityStore`'s paginated root list is **not** an option source. Consumers:
  `facilities-page` (for its create sheet), `facility-move-dialog` (through the assets page),
  `equipments-page` / `equipment-detail-page` /
  `equipment-assign-facility-dialog` (equipments imports the `models` and
  `state` barrels for this alone). A picker never formats a facility on its own
  and never falls back to a raw id on its trigger.

Address suggestions use the authenticated organization-scoped `address-suggestions` endpoint
through `FacilityService.addressSuggestions`. This is distinct from the explicit Nominatim
geocode action; autocomplete consumers must never issue per-keystroke Nominatim lookups.
The organization setup facade may publish the suggestion transport for onboarding. Suggestions include provider-normalized street, city, region, postal code, country and ISO country code; consumers must not parse the canonical label to reconstruct them.

## Public entry points

These narrow entry points are published to the named consumers. `app` denotes the application composition root. Standard concern barrels follow ARCHITECTURE.md; prose examples do not grant access.

| Entry point                     | Consumers                             |
| ------------------------------- | ------------------------------------- |
| `ui/forms/facility-create-form` | `organization/features/interventions` |
