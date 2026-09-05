# Approvals Feature

## Purpose

Owns the organization's four-eyes decision surface over the backend
Approval module:

- listing an organization's approval requests — pending by default —
  searchable and filterable by status and by the regulated action-type
  catalog, with server-side pagination,
- deciding on a pending request (approve or reject) with an optional
  decision note,
- reading the regulated action-type catalog (`nc_waiver`,
  `equipment_decommission`) that feeds both this page's filter and the
  settings Compliance tab's editable policy form.

This subfeature does not own the gated actions themselves (equipment
decommission, non-conformity waiver) — approving a request re-executes them
synchronously server-side, but their own workflows stay owned by
`equipments` and `inspections` respectively. It does not compute or
second-guess `status`; that value, and the guard order that produced it
(404 → permission 403 → role 403 → self 403 → 409), are authoritative from
the backend.

## Entry Points

- Routes: `approvals.routes.ts`
- Public API: none. Nothing outside this subfeature imports it; the sidebar
  entry links by path (`/organizations/:organizationId/approvals`), not by
  symbol. The settings Compliance tab's policy form (`organization/`) reuses
  the _shape_ of the action-type catalog but calls `ApprovalRequestService`
  directly from this subfeature's `data-access` barrel rather than through a
  published port — a direct cross-feature service dependency, the same
  pattern `maintenance-schedules/FEATURE.md` already documents for
  `FacilityService`.
- Root provider: none. `ApprovalRequestsStore` is provided once, on the
  single leaf route (`ARCHITECTURE.md` §10.11 — route-specific, must reset).

## Routes

- `/organizations/:organizationId/approvals` — `ApprovalsPage`: the only
  route this subfeature owns. Guarded on `organization.approvals.read` on
  the pathless parent, the same shape `MAINTENANCE_SCHEDULE_ROUTES` uses.
  There is no detail or create route — a request is created server-side by
  the gated action's own use case, never authored directly.

## State and Data Access

Primary store: `ApprovalRequestsStore` — `withEntities<ApprovalRequestOutput>`
keyed by id, plus three independent `CallState` fields (`listCallState`,
`decideCallState` shared by approve and reject since only one decision
dialog is ever open at a time, `actionTypesCallState`). A successful
decision replaces exactly the decided entity from the server's full
recomputed response; the list is never refetched for it. `decideErrorText`
maps a decide failure's HTTP status **and** RFC 7807 `detail` text to
specific, actionable copy (`state/approval-requests/utils/decide-error-message/`):
409 either means someone else already decided the request, or — approve
only — the deferred action's subject changed state in the meantime (the
request is now `cancelled` server-side); 403 either means self-approval is
disallowed or the deciding member is below the action's minimum approver
role. On a 409 the page calls `refresh(organizationId, requestId)` to
re-read the row without closing the dialog, so the table is correct the
moment the reader dismisses it.

Primary service: `ApprovalRequestService` — extends `HydraApiService`.
`list`/`get`/`approve`/`reject` call the organization-scoped
`/api/organizations/{organizationId}/approval-requests` routes;
`listActionTypes` calls the **canonical** `/api/approvals/action-types`
reference catalog, the same canonical-collection-bypass shape
`MaintenanceScheduleService` already uses for `/api/maintenance/schedules`.

## Cross-Feature Dependencies

- Depends on organization route context from the parent feature.
- Consumed directly by the parent `organization` feature's settings
  Compliance tab: `ApprovalRequestService.listActionTypes()` (via this
  subfeature's `data-access` barrel) feeds the editable approval-policy
  form's per-action-type rule rows. Read-only — the parent feature owns no
  approval-request state and takes no decision.
- May be referenced by other organization subfeatures for its route path,
  but the approval-request domain stays local to this subfeature.

## Invariants

- Approving a request **executes the gated action synchronously** —
  `ApprovalDecisionDialog`'s approve variant states this plainly. A
  successful approve is not a "pending, will run later" state.
- A decide failure never closes the dialog; the reader sees the specific
  409/403 copy exactly where they took the action, mirroring the members
  roster's remove-confirm invariant (`organization/FEATURE.md`).
- `subjectId` on `ApprovalRequestOutput` is a **bare id**, never an IRI, and
  remains transport-only. The table names the subject from its action type
  and links it to the gated resource's own detail route only when one exists
  (`equipment_decommission` → the equipments subfeature). `nc_waiver` renders
  "Non-conformity record" without a link until that feature has a detail
  route; neither path exposes the bare id.
- Requester and decider references resolve through `MEMBER_DIRECTORY_PORT`.
  Readers without directory permission see "Unknown member" rather than a
  UUID; the approvals list still loads because member-directory access is
  supplementary and `ensureLoaded` is a permission-aware no-op.
- No nav counter badge: the backend navigation-counters endpoint has no
  approvals count, and neither the sidebar nor this page fakes one
  client-side.
- Status is never colour-only: `ApprovalStatusTag` always pairs its
  severity tint with an icon and a label (`models/approval-tag/`).
