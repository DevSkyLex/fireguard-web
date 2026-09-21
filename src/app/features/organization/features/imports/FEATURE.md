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

Primary store: `ImportJobsStore` keeps an entity cache separate from visible page ids
and server totals. Upload acceptance refreshes the current query; a cached job must not
be inserted into a filtered page. Each job has its own polling state and explicit recovery.
The open report resolves its selected id from the live cache, even outside the current page.
Polling errors and interrupted observation preserve the last known job without pretending
completion. Reports paginate the received rows locally. Organization changes cancel polls
and discard the previous context. Upload inputs reset only after server acceptance.

Primary service: `ImportJobService` — extends `HydraApiService`. `create`
posts multipart to the canonical `/api/imports` (not organization-scoped;
`organization` travels as an IRI in the body alongside `kind`, `file` and
the optional `dryRun` flag), bypassing the base class's JSON body helpers
the same way `FacilityAttachmentService.upload` does. `list`/`get` read the
same canonical collection, `organization` passed as a required query
parameter. `pollJob` re-reads a job once every 2.5 s until it leaves
`pending`/`processing`, bounded to 240 emissions (~10 minutes) — the same
bounded-poll shape as `InterventionService.pollPublication`, since the
worker confirms each row transactionally and there is no push channel.

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

- The kind filter exposes only readable kinds. Backend collections and totals use
  the same authorization scope before pagination. Losing a kind's permission or
  changing organization clears an invalid filter; upload permissions remain separate.

- Only the server's `canResume` capability enables resumption. Resuming keeps the
  same job and confirmed counters/report, then restarts observation. A lost browser
  connection never marks a job failed. Conflicts retain the last report and offer a
  fresh read. Requests and their results are scoped to the current organization.
- The upload section must not collapse the job list below a usable height. The page
  scrolls when both sections cannot fit; mobile keeps the natural list flow.

- Mobile touch targets and report-sheet geometry follow the central interaction-capabilities contract.
  Upload controls, chosen files, file-level errors, polling recovery and paginated row reports
  remain available at every width. Interaction-mode changes never recreate or reset the upload form.

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
- CSV downloads come from `/organizations/{organizationId}/import-templates/{kind}`.
  Explanatory column hints remain local copy and follow the same parser contract.
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

Simulation is the upload default. The typed `reportReady` event opens the accepted job,
then its server `canConfirm` capability enables explicit confirmation. Retries reuse the
simulation identifier and retained file; `confirmedJobId` links to the single real import.
Confirmation and template requests have independent request states, cancel on organization
change and never clear a failed report. `templateReady` delegates browser download to the
parent organization's published BrowserDownloadService; no file is put in TransferState.
