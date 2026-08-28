# Imports Feature

## Purpose

Owns the organization's bulk CSV import surface over the backend Import
module: submitting a CSV file to bulk-create equipment, facilities or member
invitations,
listing an organization's import jobs, and viewing one job's report
(row-level successes and failures) — including a dry-run mode that reports
what would happen without writing anything.

This subfeature does not own equipment, facility or invitation creation
itself — a successful row is created by the Import module's own worker,
through the same domain rules the manual create and invite forms use. It does not compute or
second-guess `status`, `processedRows`, or the row-level `code` values;
those are authoritative from the backend, read by polling.

## Entry Points

- Routes: `imports.routes.ts`
- Public API: none. Nothing outside this subfeature imports it; the sidebar
  entry links by path (`/organizations/:organizationId/imports`), not by
  symbol.
- Root provider: none. `ImportJobsStore` is provided once, on the single
  leaf route (`ARCHITECTURE.md` §10.11 — route-specific, must reset).

## Routes

- `/organizations/:organizationId/imports` — `ImportsPage`: the only route
  this subfeature owns. Guarded on `organization.equipment.read`,
  `organization.facilities.read` **or** `organization.members.read` on the
  pathless parent (`match: 'any'`), so a reader holding only one may still
  reach the page and import that one kind — mirrors `APPROVAL_ROUTES`'s guard shape. There is no detail route:
  a job's report renders inline, in a sheet opened from its table row.

## State and Data Access

Primary store: `ImportJobsStore` — `withEntities<ImportJobOutput>` keyed by
id, plus `listCallState` and `createCallState`. A successful upload inserts
the new job (`addEntity`) and immediately starts polling it
(`ImportJobsStore.poll`, `mergeMap` so several jobs can poll independently);
each live poll emission replaces exactly that job's row (`setEntity`) — the
table never refetches the whole list to reflect progress. A poll's own
transport error is swallowed rather than surfaced on a `CallState`: the row
keeps its last known state, and a manual `refresh` is the recovery path.

Primary service: `ImportJobService` — extends `HydraApiService`. `create`
posts multipart to the canonical `/api/imports` (not organization-scoped;
`organization` travels as an IRI in the body alongside `kind`, `file` and
the optional `dryRun` flag), bypassing the base class's JSON body helpers
the same way `FacilityAttachmentService.upload` does. `list`/`get` read the
same canonical collection, `organization` passed as a required query
parameter. `pollJob` re-reads a job once every 2.5 s until it leaves
`pending`/`processing`, bounded to 240 emissions (~10 minutes) — the same
bounded-poll shape as `InterventionService.pollPublication`, since the
worker flushes progress every 50 rows and there is no push channel.

## Cross-Feature Dependencies

- Depends on organization route context from the parent feature.
- Depends on the parent feature's `EQUIPMENT_READ`, `FACILITIES_READ` and
  `MEMBERS_READ` permission constants (`ORGANIZATION_PERMISSION`) for its
  route guard, and on `EQUIPMENT_WRITE`/`FACILITIES_WRITE`/`MEMBERS_MANAGE`
  for `ImportsPage.availableKindOptions`
  — the upload form is narrowed client-side to the kinds the active member
  may actually write, per submitted `kind`, matching the backend's own
  `create` gate; this subfeature defines no permission constants of its
  own.
- May be referenced by other organization subfeatures for its route path,
  but the import-job domain stays local to this subfeature.

## Invariants

- The `202` create response never carries report fields (`totalRows`,
  counts, `errorReport`) — every surface reads them from a poll or a
  `get`, never off the create response.
- `failed` + `jobError` means the **whole file** could not be processed.
  Row-level problems are non-fatal and the job still reaches `completed`;
  the row list is where those surface, never the job status.
- A dry run's `errorReport` carries **one entry per row**, including a
  `would_create` entry for every row that validated — `would_create`
  renders as a positive outcome (`ImportRowErrorTag`'s `success` severity),
  never as a failure. A real run's `errorReport` carries failures only.
- Quota enforcement is **partial, per row, during processing** — there is
  no upfront 409 for the whole file. `ImportJobDetailSheet.summary` states
  the partial-application outcome in one line (e.g. "38 of 50 created; 12
  skipped — plan limit reached") rather than leaving the reader to infer it
  from the row list.
- No CSV template endpoint exists on the backend. The column contract
  (`ImportUploadForm`'s "Expected CSV format" block,
  `IMPORT_CSV_COLUMN_HELP`) is hard-coded against the Import module's
  parser and must be kept in sync by hand if that parser changes.
- Status is never colour-only: `ImportStatusTag` and the row report's code
  badges always pair their severity tint with an icon and a label.
- The upload card is gated client-side per kind (`ImportsPage.availableKindOptions`,
  `EQUIPMENT_WRITE`/`FACILITIES_WRITE`/`MEMBERS_MANAGE`) and disappears
  entirely once none is held — a reader can still reach the page on a read
  permission alone, since the route guard is `match: 'any'` over the three
  read permissions.
- A `member` row that is skipped as a duplicate (`already_member`,
  `already_invited`) is non-fatal and renders as a `warning` tag;
  `unknown_role` is a genuine row failure (`danger`). The `roles` column
  takes role names separated by `|`, blank meaning the default member role.
