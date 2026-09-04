# Audit Feature

## Purpose

Owns the organization audit journal: a read-only, server-paginated view over
the backend's organization-scoped audit ledger
(`GET /api/organizations/{organizationId}/audit-events`), the frontend
action-id presentation registry (label, module group, and icon per module,
for all 68 actions the backend currently emits), and the actor/subject
rendering rules that fill the gaps the backend deliberately leaves — no
actor name for a system/client/anonymous actor, no subject route for a type
with none.

This subfeature owns no write path: the backend exposes none on this
collection. It does not own the audited data itself (a facility, an
equipment record, an approval decision) — only the ledger entry that
references it.

## Entry Points

- Routes: `audit.routes.ts`
- Public API: none. Nothing outside this subfeature imports it; the sidebar
  entry links by path (`/organizations/:organizationId/audit`), not by
  symbol.
- Root provider: none. `AuditEventsStore` is provided once, on the single
  leaf route (`ARCHITECTURE.md` §10.11 — route-specific, must reset).

## Routes

- `/organizations/:organizationId/audit` — `AuditPage`: the only route this
  subfeature owns. Guarded on `organization.audit.read` on the pathless
  parent, the same shape `APPROVAL_ROUTES` and `IMPORT_ROUTES` use.
  `organization.audit.read` is **not** in the default member role — an
  admin holds it via the `organization.*` wildcard — so the sidebar entry
  and this route are both invisible to most members. There is no detail
  route: every entry renders inline, in the table's own expandable
  metadata row when the backend supplied metadata.

## State and Data Access

Primary store: `AuditEventsStore` — `withEntities<AuditEventOutput>` keyed
by id, plus `listCallState` and `totalEvents`. A single `load` method
fetches one page at a time; `switchMap` cancels an in-flight request so a
fast filter change never races an older response. There is no create,
update or delete method — the backend exposes none on this collection, and
the store does not pretend otherwise.

Primary service: `AuditEventService` — extends `HydraApiService`. `list` is
its only method, sending the three filters the backend actually accepts
(`action`, `from`, `to`) and forwarding pagination untouched. There is no
`get` — the backend exposes no single-event read, so there is nothing to
poll or refresh a row from.

## Invariants

- **The filter surface never exceeds what the backend accepts.** `action`
  (exact match), `from`/`to` (inclusive ISO datetimes) are the complete
  list — there is no actor or subject filter and no `order[]` param.
  `AuditPage` offers no sort control and no actor/subject narrowing; faking
  either client-side over one fetched page would silently lie about what
  was actually searched.
- **Ordering is fixed server-side** (`occurredAt` DESC, `id` ASC tiebreak).
  `AuditEventsStore.load` never reorders the response.
- **`resolveAuditActionTag` always resolves a usable descriptor**, even for
  an action id the frontend registry does not yet know about: the module is
  still derived from the id's `module.` prefix whenever it matches one of
  the eleven real modules, and only the label degrades to a humanized
  version of the raw id. A id with an unrecognized prefix falls back to the
  `'other'` module. This is the registry's totality guarantee — a backend
  addition never breaks the page, it only ships without a polished label
  until the frontend registry catches up.
- **`resolveAuditActorLabel` never renders a blank actor cell.** The
  backend resolves `actorDisplayName` only for a `'user'` actor who is a
  member of this organization (including a deactivated one) and sends no
  placeholder otherwise; every other case renders one of four neutral,
  localized fallbacks keyed on `actorType`.
- **`resolveAuditSubjectRoute` links only where a route genuinely exists.**
  `facility`, `equipment`, `inspection`, `intervention` and
  `organization_member` link to their own record; `approval_request` and
  `import_job` link to their owning list, since neither subfeature exposes
  a per-record route; every other subject type, and a linkable type missing
  its `subjectId`, renders plain. `null` never becomes a broken link.
- **Metadata renders only what the backend allowlists.** `metadata` is a
  per-action projection of ids, enums, booleans and counts — the table
  renders it as a compact, humanized key/value list and applies no further
  filtering, since the backend has already excluded free text and PII by
  construction. A metadata-free event has no disclosure control: expanding
  a row must always reveal useful information.
- A `403` on `AuditEventsStore.listCallState` renders `AuditPage`'s distinct
  "You need the audit permission" empty state, never the generic error
  state — `organization.audit.read` being absent from the default member
  role makes this the expected shape of a first visit for most readers, not
  an exceptional failure.
- The per-row metadata expand/collapse button carries a disambiguated
  accessible name (action label + `occurredAt`), matching
  `ImportJobTable.viewReportAriaLabelOf` — a bare "Show details" repeated on
  every row is the same defect `ApprovalRequestTable`'s per-row
  Approve/Reject buttons were built to avoid.

## Cross-Feature Dependencies

- Depends on organization route context from the parent feature.
- Depends on the parent feature's `AUDIT_READ` permission constant
  (`ORGANIZATION_PERMISSION`) for its route guard and its sidebar entry;
  this subfeature defines no permission constants of its own.
- `resolveAuditSubjectRoute` links into the `facilities`, `equipments`,
  `inspections`, `interventions`, `approvals` and `imports` sibling
  subfeatures' own route trees by **path only** — string segments, not an
  imported symbol from any of them. No `data-access`, `models` or `state`
  barrel of a sibling subfeature is imported.
