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
  in place for that future drill-down,
- the `/descendants` endpoint is reserved for bulk operations and is **not**
  used for normal listing.

Search and pagination operate on the **root level only** (the `?page=` query
param is synced for roots). Row actions reuse the existing view / edit /
archive flows.

## State and Data Access

Primary stores:

- `FacilityStore`
- `ActiveFacilityStore`

Primary service:

- `FacilityService`

## Cross-Feature Dependencies

- Depends on organization route context from the parent organization feature.
- May compose with sibling organization subfeatures in pages when the workflow requires it, but must not take ownership of their state.

## Invariants

- Facility routes remain organization-scoped.
- Active facility state belongs to this subfeature.
- Facility resolvers and facility page orchestration belong here, not in the parent feature or layouts.
