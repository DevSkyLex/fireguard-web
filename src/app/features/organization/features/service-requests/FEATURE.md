# Service Requests Feature

## Purpose

Owns internal maintenance needs, explicit qualification, motivated decisions and conversion into corrective work. Equipment and Facility retain target ownership; Intervention executes and publishes the resulting work.

## Entry Points

`SERVICE_REQUEST_ROUTES` mounts `/organizations/:organizationId/service-requests` and `/:requestId`. The collection guard permits read or create; the dossier guard requires read. Organization supplies the active context and pages keep dedicated mutation affordances.

Published `models`, `data-access`, `services` and `state` expose request contracts, the owning Hydra transport and conversion coordination. Target pickers are internal form widgets, not a cross-organization directory.

## State and Data Access

Component-provided stores cancel obsolete reads. A root conversion coordinator commits its account-bound UUID, request revision and exact work tuple to the independent `fireguard-service-requests` IndexedDB journal before transmission. It keeps accepted transmissions alive after route destruction; returning or reloading restores unresolved conversions without sending them automatically. New actions wait for journal restoration, and storage failures leave them blocked with an explicit retry.

Auth's published session revision and Organization's active member account, organization and permissions fence asynchronous reads, writes, acknowledgments and exact replay. The root journal purges on logout or account/session replacement even when no request page remains mounted; a same-account browser reload retains its journal. Only conversion has a server-supported replay identity. Other mutations are never journaled or automatically retried. Secondary authenticated reads and all journal access run only in the browser; SSR stores no request command in HTML or TransferState.

Collections use exact server search, status and equipment/site scopes with pagination. Target pickers separately hydrate retained selections; retired or draft equipment cannot be newly chosen. Request customer identity is derived from the root site by the server and contains no contacts.

## Cross-Feature Dependencies

Approved public Equipment transport/models and title/catalogue contracts provide published target choices and authorized open corrective work. Facility transport, models, `toFacilityOption` and `FacilityOptionPicker` provide root sites. Organization owns permissions and regional formatting; Intervention owns the existing destination route and workflow permissions.

Auth publishes `AUTH_SESSION_PORT` for local session-generation fences. No authentication token is persisted in the command journal.

## Invariants

- Request creation, qualification and conversion are distinct commitments.
- Absent optional route targets are normalized before seeding Signal Forms; every target field remains a string.
- A site-only request must identify equipment from its site during qualification. A qualified target cannot be replaced.
- Revision conflicts preserve drafts and require an explicit review before adopting the current revision.
- A conversion retains its original UUID, revision and payload across navigation and reload until confirmed or definitively rejected. A duplicate click never cancels an accepted write.
- An uncertain conversion locks its draft and offers exact retry; progress indicators represent active requests only.
- Route and browser-history dismissal use the sheet's real dirty state. Pending mutations block dismissal; an unresolved durable conversion remains recoverable when its routed page is destroyed.
- New conversion requires request management and intervention planning. Exact receipt replay keeps request management as its grant; the server rechecks planning if new work is still required.
- Known open repair tasks can be explicitly linked through their existing intervention/task identities. No task or intervention identity is fabricated.
- Customer contacts, commercial prices, invoicing, external portals and organization sharing are outside this feature.
