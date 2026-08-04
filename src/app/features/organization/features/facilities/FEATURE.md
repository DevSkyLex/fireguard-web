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
- `/organizations/:organizationId/facilities/create`
- `/organizations/:organizationId/facilities/:facilityId`
- `/organizations/:organizationId/facilities/:facilityId/edit`

Facility detail routes resolve facility context before child pages render.

Facility coordinates come from the backend `latitude`/`longitude` fields
(optional on `FacilityOutput`) and are captured in the facility create/edit form
(`ui/forms/facility-form`, enforced both-or-neither). If a map surface is
reintroduced, a generic, domain-agnostic map primitive would live as its own
`shared/<concept>/` folder per `ARCHITECTURE.md` §8.5.

## Facility Listing (Roots-Only DataView)

The facility list page presents the organization's **root** facilities as a
flat, paginated PrimeNG `p-dataview` with a list/grid layout toggle:

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
param is synced for roots). Row actions reuse the existing view / edit /
archive / restore flows.

## Facility Hierarchy (Detail Overview)

The facility detail page's **Overview** tab renders the descendant hierarchy
with a PrimeNG `p-organization-chart` (`FacilityHierarchyChart`). Loading is
based on the backend descendants endpoint:

- all descendants are auto-loaded once the facility resolves (only when
  `facility.hasChildren` is `true`), via an `effect` calling
  `FacilityStore.ensureFacilityDescendantsLoaded`,
- `FacilityService.listDescendants` calls
  `GET /organizations/{orgId}/facilities/{facilityId}/descendants`, then the
  store groups the flat Hydra `member` collection by `parentFacilityId` for
  `FacilityHierarchyChart`,
- `FacilityStore.loadChildFacilities` remains available for direct-child
  loading flows, but the detail overview uses `/descendants`,
- all secondary fetches are **browser-only** (no `TransferState`), and node
  selection navigates to the chosen facility's detail page.

The list page stays **roots-only**; hierarchy navigation lives here in the
detail Overview.

## State and Data Access

Primary stores:

- `FacilityStore`
- `ActiveFacilityStore`
- `FacilityTreeStore` — the site hierarchy for the parent feature's assets
  explorer. Roots once, then one branch per expansion, each fetched exactly
  once; collapsing and re-expanding is a navigation gesture, not a reason to
  ask the server again.

Primary service:

- `FacilityService`

## Cross-Feature Dependencies

- **The record is the edit surface.** Every writable property of a site opens
  where it is displayed, through `@shared/inplace-field`; the panel owns the
  draft and the cancel path, the page owns the call (ARCHITECTURE.md §10.5).
  `type` and the parent stay read-only because `UpdateFacilityInput` accepts
  neither — the parent moves through its own action.
- `/:facilityId/edit` is retired and **redirects onto the record**, so installed
  applications and bookmarks still resolve.
- Depends on organization route context from the parent organization feature.
- The parent feature consumes this subfeature's `state` barrel (`FacilityTreeStore`)
  and its `ui/components` barrel (`AssetEquipmentTab`, `AssetInspectionTab`)
  for the assets explorer at `/organizations/:organizationId/assets`
  (ARCHITECTURE.md §4). Read-only — the parent browses the hierarchy, this
  subfeature keeps ownership of sites and of those panes.
- Consumes the sibling `equipments` and `inspections` subfeatures for the
  `AssetEquipmentTab` / `AssetInspectionTab` panes (their stores, models and
  tables). Those panes take an **optional** `facilityId`: given, they show one
  site's contents; omitted, the whole organization's. That is what lets the same
  pane serve the facility record and both axes of the assets explorer instead of
  a second copy of the same orchestration.
- Both panes navigate by **absolute** path. They are hosted at two different
  depths — the facility record two segments down, the assets explorer one — and
  a relative `../..` meant the right destination from one host and a dead URL
  from the other.
- May compose with sibling organization subfeatures in pages when the workflow requires it, but must not take ownership of their state.

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
