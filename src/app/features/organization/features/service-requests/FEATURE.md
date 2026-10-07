# Service Requests Feature

## Purpose

Owns internal maintenance needs, explicit qualification, motivated decisions and conversion into corrective work. Equipment and Facility retain target ownership; Intervention executes and publishes the resulting work.

## Entry Points

`SERVICE_REQUEST_ROUTES` mounts `/organizations/:organizationId/service-requests` and `/:requestId`. The collection guard permits read or create; the dossier guard requires read. Organization supplies the active context and pages keep dedicated mutation affordances.

Published `models`, `data-access` and `state` expose request contracts and the owning Hydra transport. Target pickers are internal form widgets, not a cross-organization directory.

## State and Data Access

Component-provided stores cancel obsolete reads and retain accepted writes. Secondary authenticated reads run only in the browser. SSR renders the same native skeleton and controls without an additional authenticated read or storage workaround.

Collections use exact server search, status and equipment/site scopes with pagination. Target pickers separately hydrate retained selections; retired or draft equipment cannot be newly chosen. Request customer identity is derived from the root site by the server and contains no contacts.

## Cross-Feature Dependencies

Approved public Equipment transport/models and title/catalogue contracts provide published target choices and authorized open corrective work. Facility transport, models, `toFacilityOption` and `FacilityOptionPicker` provide root sites. Organization owns permissions and regional formatting; Intervention owns the existing destination route and workflow permissions.

## Invariants

- Request creation, qualification and conversion are distinct commitments.
- Absent optional route targets are normalized before seeding Signal Forms; every target field remains a string.
- A site-only request must identify equipment from its site during qualification. A qualified target cannot be replaced.
- Revision conflicts preserve drafts and require an explicit review before adopting the current revision.
- A conversion retains its original UUID, revision and payload until an uncertain response is resolved. A duplicate click never cancels an accepted write.
- An uncertain conversion locks its draft and offers exact retry; progress indicators represent active requests only.
- New conversion requires request management and intervention planning. Exact receipt replay keeps request management as its grant; the server rechecks planning if new work is still required.
- Known open repair tasks can be explicitly linked through their existing intervention/task identities. No task or intervention identity is fabricated.
- Customer contacts, commercial prices, invoicing, external portals and organization sharing are outside this feature.
