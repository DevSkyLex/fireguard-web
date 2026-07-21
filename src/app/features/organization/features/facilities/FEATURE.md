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
- Public API: `index.ts`

## Routes

- `/organizations/:organizationId/facilities`
- `/organizations/:organizationId/facilities/create`
- `/organizations/:organizationId/facilities/:facilityId`
- `/organizations/:organizationId/facilities/:facilityId/edit`

Facility detail routes resolve facility context before child pages render.

Facility coordinates come from the backend `latitude`/`longitude` fields
(optional on `FacilityOutput`) and are captured in the facility create/edit form
(`ui/forms/facility-form`, enforced both-or-neither). A generic, domain-agnostic
map primitive (`@shared/components` `MapCanvas`) is available to plot located
records as clustered pins if a map surface is reintroduced.

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

## Hierarchy view (`?view=tree`)

The list page offers a second surface through the `?view=` query param, backed by
`GET /organizations/{orgId}/facility-tree` (`FacilityService.getTree` →
`FacilityTreeStore`). It returns the **whole hierarchy already nested and
unpaginated**, each node carrying `equipmentCount` and `complianceRate`.

Invariants a reviewer must preserve:

- this endpoint is **not** the `/children` + `/descendants` pair. It is owned by
  the backend's Compliance module and gated on `organization.compliance.read`,
  not `facilities.read`. Never feed it into `loadChildFacilities` — the lazy
  loader paginates, and mixing the two caches the same rows in two shapes,
- the permission is **asymmetric**: `?view=tree` opened by a member without
  `compliance.read` silently falls back to the list and the switcher is not
  rendered. It must not 403 — the URL is shareable and the reader may hold
  different permissions than the sender,
- the hierarchy is only queried while it is on screen; landing on the list costs
  no extra request,
- switching view drops `?page=` — the tree has no paginator and a stale cursor
  would resurface on the way back.

This does not reinstate the inline expansion that was removed from the list: the
reason it went (a chevron that paginated) does not apply to a single nested
response. This is the estate-wide compliance read; one facility's own descendants
are shown on its detail page (below).

## Facility Hierarchy (Detail Overview)

The two hierarchy surfaces are deliberately split by scope, and neither is a
tree diagram:

- **estate-wide** browsing is the list page's `?view=tree` tree table, which is
  where an arbitrarily deep hierarchy is read,
- **one facility's own context** is the Overview tab's `FacilityInstallationsPanel`,
  a divider list in the aside showing the root, its direct children and their
  children, each row navigating to that facility.

The panel is capped at those levels on purpose. Deeper drill-down is the tree
table's job, and PRODUCT.md's "hierarchy through rhythm, not boxes" rules out
duplicating it as a box-and-connector chart in the main column — which is also
unusable at the phone widths field agents work on.

Loading is based on the backend descendants endpoint:

- all descendants are auto-loaded once the facility resolves (only when
  `facility.hasChildren` is `true`), via an `effect` calling
  `FacilityStore.ensureFacilityDescendantsLoaded`,
- `FacilityService.listDescendants` calls
  `GET /organizations/{orgId}/facilities/{facilityId}/descendants`, then the
  store groups the flat Hydra `member` collection by `parentFacilityId`,
- because the whole subtree arrives in that one call, the detail page has no
  per-branch lazy expansion to guard. `FacilityStore.loadChildFacilities`
  remains available for direct-child loading flows, but nothing on this page
  uses it,
- all secondary fetches are **browser-only** (no `TransferState`), and row
  selection navigates to the chosen facility's detail page.

## State and Data Access

Primary stores:

- `FacilityStore`
- `ActiveFacilityStore`

Primary service:

- `FacilityService`

## Cross-Feature Dependencies

- Depends on organization route context from the parent organization feature.
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
