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
is no separate coordinates form. If a map surface is reintroduced, a generic,
domain-agnostic map primitive would live as its own `shared/<concept>/`
folder per `ARCHITECTURE.md` §8.5.

## UI (this pass)

- `ui/pages/facilities-page` (`FacilitiesPage`) — the roots-only list:
  search, an "include archived" filter, a list/grid toggle
  (`ui/tables/facility-table` / `ui/dataviews/facility-grid`), and a "New
  facility" link. Row actions are limited to Archive/Restore.
- `ui/pages/facility-create-page` (`FacilityCreatePage`) —
  `ui/forms/facility-create-form`, requiring only `type` and `name`; parent,
  code, address and coordinates are optional here and remain editable on the
  record afterward.
- `ui/pages/facility-detail-page` (`FacilityDetailPage`) — two tabs.
  **Overview** (default) renders `ui/components/facility-hierarchy-chart`
  (only when `hasChildren`) plus the `FacilityOverviewStore` summary
  (compliance rate, equipment count/breakdown, next inspection, recent
  inspections). **Information** renders
  `ui/components/facility-information-panel`, the in-place edit surface for
  `name`/`code`/`address`/coordinates; `type` and the parent render as
  read-only rows. A header **Delete** action is danger, confirm-gated
  (`hlm-alert-dialog`), and `FACILITIES_WRITE`-gated.
- `ui/components/facility-status-tag` — the `FacilityOutput.status` registry
  (`active`/`archived`), the only appearance of the enum in this feature.

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
with an organization chart (`FacilityHierarchyChart`). Loading is
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
- The parent feature consumes this subfeature's `state` barrel
  (`FacilityTreeStore`) for the assets explorer at
  `/organizations/:organizationId/assets` (ARCHITECTURE.md §4). Read-only —
  the parent browses the hierarchy, this subfeature keeps ownership of sites.
- May compose with sibling organization subfeatures in pages when the workflow requires it, but must not take ownership of their state.

### Deferred, not built

`AssetEquipmentTab` / `AssetInspectionTab` — the shared equipment/inspection
panes this document previously named for both the facility record and the
assets explorer — are **not built in this pass**. `FacilityTreeStore` exists
and the assets explorer route is not yet mounted (`organization/FEATURE.md`
"Currently mounted"); the sibling `inspections` subfeature has no `ui/` of
its own yet either. Building two composite panes ahead of the route and the
sibling subfeature they would depend on was judged premature — the facility
detail page's Overview tab instead reads its equipment/inspection summary
directly from `FacilityOverviewStore` (`ARCHITECTURE.md` §10.10/§2.9). When
the assets explorer route is built, revisit whether these panes are still the
right shape; when they are, they take an **optional** `facilityId` and
navigate by **absolute** path, for the same reason the rest of this
document's cross-feature panes do.

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
