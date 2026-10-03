# Product iterations after stabilization

This specification records the next four product iterations. It does not activate
them or change existing domain rules. The implementation inventory below was read
on 2026-10-02; it describes source behavior, not a new browser acceptance run.
The [product contract](../../PRODUCT.md), owning feature contracts and backend
module contracts remain authoritative until an implementation explicitly revises them.

## Available foundation

| Surface                      | Implemented behavior                                                                                                                                                                                                                                                                               | Boundary                                                                                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Equipment QR labels          | The equipment action opens an explicit inventory, facility or selected-record scope. The matching server preview must contain 1–500 distinct labels before PDF export; an empty selection cannot expand to the inventory.                                                                          | Read permission and organization scope still apply. The equipment facility scope is exact; the estate explorer separately offers a subtree scope. A QR label does not grant access to its target.     |
| Assistant discussion history | The header assistant panel lazily opens the member's private thread selector, with 30 records per server page, loading/empty/error/retry states. Selecting a thread uses its existing detail read and private stream. Earlier messages prepend without duplicate turns and retain scroll position. | Organization/session changes cancel reads and clear private history. This is assistant discussion history, not an organization-wide archive or an offline transcript.                                 |
| Calendar URL state           | `date=yyyy-MM-dd` and `view=month\|week\|day` restore the organization civil anchor and view. Navigation preserves unrelated parameters; browser history changes use the same feed owner without duplicate reads for an unchanged window.                                                          | Invalid state falls back to organization-local today and Month. URL state cannot grant event access or convert projected intervention/inspection/maintenance entries into editable standalone events. |
| Offline intervention work    | Assigned active workspaces and authorized time journals have prefetch and account-scoped device persistence. Work/Changes can use complete saved snapshots; outbox replay retains revisions, session fencing and conflict review.                                                                  | A missing snapshot/history is unavailable or unknown. Saved intervention data is not a live estate, global workload or capacity snapshot.                                                             |
| CSV import                   | Server templates, simulation by default, row reports, explicit server-authorized confirmation and resumable observation are present. Confirmation of a retained simulation is idempotent.                                                                                                          | Only completed, nonempty simulations with every row successful are confirmable. A simulation reserves neither quotas nor references.                                                                  |
| Workload assessment          | The server supports read-only task replacement/draft assessments and daily before/after projections, including overload, unassigned demand and unknown capacity.                                                                                                                                   | Missing effort/capacity is unknown; explicit zero capacity means unavailable. Intervention owns the eventual planning write and its transactional recheck.                                            |

Source owners: [Equipment](../../src/app/features/organization/features/equipments/FEATURE.md),
[Collaboration](../../src/app/features/organization/features/collaboration/FEATURE.md#assistant),
[Calendar](../../src/app/features/organization/features/calendar/FEATURE.md#invariants),
[Intervention](../../src/app/features/organization/features/interventions/FEATURE.md),
[Import](../../src/app/features/organization/features/imports/FEATURE.md) and
[Workload](../../src/app/features/organization/features/workload/FEATURE.md).
Backend counterparts are `Equipment`, `Assistant`, `Calendar`, `Intervention`,
`Import` and `Workload` in `fireguard-api/src/<module>/MODULE.md`.

## Prepare an offline tour

**Outcome:** before leaving coverage, a field member can select interventions and
see which required work is durably available on this device. This adds an explicit
preparation/recovery flow over the existing prefetch; automatic prefetch alone must
not display a tour as ready.

The member selects a bounded set from their authorized active interventions, by
site and planned local date. Display the intervention identity, site, planned date,
last successful download and preparation state. States are **not prepared**,
**downloading**, **ready on this device**, **partially available**, **outdated** and
**failed**. Successful persistence, rather than a successful HTTP response, is the
ready boundary. Retry only incomplete resources. Cancellation stops further reads
and retains completed downloads and queued local work.

Preparation must reuse Intervention's complete workspace, authorized journals and
offline repositories. Its resource checklist distinguishes work items, proposed
changes/issues, needed reference identities and optional documents. Show documents
as online-only until their bytes have a durable supported cache; do not infer byte
availability from cached attachment metadata. Existing photograph/file outbox
limits and publication gates remain unchanged. A failure on one intervention must
not hide other completed downloads. Show usable saved data alongside the missing
parts rather than a success banner over an incomplete tour.

Before departure, offer a verification action that reads the prepared records back
from device storage and shows their scope and age. The UI can warn that storage is
temporary or unavailable; it cannot guarantee that a browser will never evict it.
Changes on the server invalidate readiness when observed online. The saved
revision/last-download date remains visible while offline; absence of connectivity
does not establish freshness. Clearing preparation requires confirmation and must
not silently discard pending writes.

Intervention owns preparation state and resource selection. Organization supplies
member/session/site context through its published contracts. There is no parallel
offline store in Calendar, Workload or a layout. Logout, account replacement and
organization changes keep the existing purge/fencing rules; an old download cannot
mark a later account's tour ready. This iteration does not include offline maps,
route optimization or a global capacity snapshot.

**Exit criteria:**

- With two selected interventions, a persistence failure leaves exactly one ready
  and the other incomplete with a readable resource error. A retry preserves local
  drafts and downloads only missing resources.
- After preparation, disconnect the browser and reload. Saved work and authorized
  journals are readable, QR navigation can reveal the matching saved work item,
  and a missing document/history has an explicit unavailable state.
- A session change during download cannot persist another account's snapshot or
  update the new preparation screen. Denied/foreign resources reveal no content.
- Offline edits, files and time entries replay through the existing outbox;
  conflicts still require review and publication still rereads authoritative issues.
- Touch, keyboard and screen-reader users can select, inspect progress, cancel and
  retry; status is labelled, announced at useful milestones and localized.

## Guided CSV import

**Outcome:** an authorized member can prepare a valid file, understand the
simulation report and deliberately start the real import without guessing whether
resources have already been created. The protocol is already implemented; the
remaining iteration makes the sequence and recovery clearer.

Use five visible stages: **Choose kind → Download template → Upload and simulate →
Review report → Confirm and observe**. Kind choices use existing read/write gates.
Keep the selected file and draft after recoverable errors. Template download is
optional for an existing compatible file. Explain required columns, accepted
delimiter/BOM, the 5,000-row limit, facility parent order, organization-local codes
and member role names separated by `|`, using the server parser/template contract.
Do not add arbitrary column mapping or silently rewrite input in this iteration.

Upload remains multipart and simulation remains the default. HTTP acceptance means
the job was queued; only a polled report can confirm its results. Distinguish
file-level failure, row-level failure and interrupted observation. Paginate every
report page while preserving the open page during status polling. Display the job
identity and counters so a user returning later can recognize the same operation.

Only the server's `canConfirm` enables confirmation: the simulation must be
completed, nonempty and wholly successful. If any row failed, identify its original
file row and explain how to correct and simulate a new file. Do not enable partial
confirmation, turn `would_create` into a failure, or treat an observation timeout as
a failed job. A confirm retry uses the same simulation and follows `confirmedJobId`
to the single real job. A failed real run shows confirmed progress and server
`canResume`; it does not restart already confirmed rows.

Before confirmation, state that current permissions, quotas and references will be
checked again. Equipment/facility dry-run projections and member email/role
validation differ: member simulation does not promise quota or duplicate
availability. The real result states partial row outcomes, including quota limits,
with a readable explanation and report rather than a generic success message.
Import owns the flow; provisioning remains with Equipment, Facility and Organization.

**Exit criteria:**

- A template-derived valid file reaches simulation review without any resource
  creation; confirmation creates one real job even after response loss and retry.
- A semicolon/BOM file, missing column, invalid reference, facility child before
  parent, duplicate member and unknown role produce the established report semantics.
- At least 101 report rows remain browsable with exact totals and row identities;
  refreshing progress does not reset a selected report page.
- A quota/permission/reference change after simulation is reflected in the real
  run. No UI copy promises that simulation reserves resources.
- Observation failure preserves the last confirmed report and offers reread;
  resumption follows server capability. Organization A→B→A cannot accept late state.
- Every stage, row code, pending state and correction action works on touch,
  keyboard and screen reader, with localized copy and no color-only meaning.

## Workload planning simulation with unknown capacity

**Outcome:** a planner can try a different member, period or remaining-effort
estimate, compare the server's daily before/after assessment, and decide whether to
apply the change. The simulator is a proposed user flow over the existing read-only
assessment endpoint; it creates neither tasks nor capacity schedules.

Start from a selected intervention/task and preserve the real values alongside a
separate scenario draft. For an existing task, the assessment replaces its demand;
it must not add another copy. For a new draft, show draft demand separately.
Inputs keep empty effort as unknown. Clearing a local work period restores inherited
intervention bounds rather than copying them into a new override.

Display daily capacity, recorded time, committed demand, draft demand and the
proposed difference for the authorized members. A weekly total cannot hide a daily
overload. Keep server completeness and exclusion reasons visible. Team/member
pagination selects displayed members without truncating their contributions or the
assessment's scope. No allocation or capacity inference runs in the browser.

| Capacity/work state                        | Required presentation                                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Known capacity and quantified demand       | Daily before/after minutes and the server overload result; identify the affected task.                                                          |
| Explicit zero capacity with work           | Unavailable day and proposed demand; no division by zero or positive availability claim.                                                        |
| Missing capacity                           | “Capacity unknown”; keep known demand and excluded work visible, with no utilization percentage, free-time total or safe-to-assign badge.       |
| Missing effort or incomplete contributions | Explain the unknown work and incomplete result; no confident availability claim derived from a partial total.                                   |
| Offline/read failure                       | Assessment unavailable, with the scenario draft retained and an explicit retry. A saved intervention cannot substitute for a global projection. |

An authorized capacity manager may open the existing capacity editor. It remains an
independent online save with explicit hours/minutes; it must not fill unknown days
with assumed hours. Reassess the scenario after a successful capacity change.
Read-only members cannot acquire administration privileges through simulation.

**Apply** uses Intervention's existing command/revision. The server rechecks current
data transactionally; overload confirmation presents the returned daily assessment
and retries the captured command with its exact consent token. Changing the scenario
or receiving stale consent requires a new assessment. Unknown capacity does not
silently create a new rejection rule: established server acceptance and confirmation
policy governs the write. Dismissing the simulator leaves operational data unchanged.

**Exit criteria:**

- Replacement assessment does not duplicate a task; dismissing several scenarios
  leaves task, capacity and time records unchanged.
- Null capacity, explicit zero, missing effort and a daily overload hidden by a
  favorable weekly total produce the distinct states above.
- Pagination/team filters retain all demand for selected members; unassigned and
  excluded work is disclosed separately, without misleading complete totals.
- A concurrent task/capacity change invalidates stale consent and preserves the
  planner's draft until the updated conflict is reviewed.
- Session/organization changes cancel obsolete reads and prevent late scenario
  results or an old Apply command from appearing in the current workspace.
- Before/after differences and unknown states are understandable with keyboard,
  touch and screen reader, and use organization-local dates and localized units.

## Optional last day of the month for intervention recurrences

**Outcome:** a planner can explicitly request the last calendar day of each eligible
month. This is an additive, opt-in recurrence policy, not a reinterpretation of old
anchors or a change to Maintenance schedules.

The current Intervention `RecurrenceRule` repeatedly adds PHP `DateInterval` steps
to its previous cursor. Its documented/tested behavior can overflow a short month:
a monthly anchor on 2026-01-31 proceeds to 2026-03-03, then 2026-04-03. Preserve this
for every existing rule and for new rules using the default policy.

Proposed transport/persistence field: `monthDayPolicy = anchor | last_day`, with
omission/null legacy values resolving to `anchor`. The name is a specification,
not a field already available in the generated API contract. `last_day` applies
only to month-based frequencies (monthly, quarterly, semiannual, annual). Weekly
rules reject the option explicitly; silently ignoring it would hide user intent.

For `last_day`, eligible months are calculated from the original anchor month and
the existing frequency × interval step. Each date is the final calendar day of
that target month in the recurrence's configured IANA timezone. It is never derived
from the previously shortened date. Keep the anchor's local time and the existing
timezone conversion policy; leap years use February 29. `nextAfter` remains strictly
after the supplied instant. Lead time, end date, active toggle, permissions, template
defaults and unique occurrence claims remain unchanged.

The form labels this option “Last day of the month” and previews the next three
organization-independent recurrence-local dates. Only an explicit save changes a
rule. Changing the policy recomputes future `next_occurrence_at`; existing runs and
materialized interventions remain intact. Preview and worker must use the same
backend calculation. A main migration/backfill selects `anchor` for existing rows;
deploy the additive backend before enabling the form. Do not enable the option by
examining an existing anchor of 28, 29, 30 or 31.

**Exit criteria:**

- Existing monthly/quarterly/semiannual/annual and weekly test vectors are unchanged,
  including the January-31 overflow case and omitted-policy HTTP payloads.
- New monthly last-day vectors include 2026-01-31 → 2026-02-28 → 2026-03-31 and
  2028-01-31 → 2028-02-29 → 2028-03-31; intervals and quarterly/annual month phases
  remain anchored rather than drifting.
- At an occurrence's exact instant, `nextAfter` returns the following occurrence.
  End-date/lead-time boundaries, timezone transitions and concurrent sweep retries
  preserve the current policy and one materialization per occurrence.
- An old rule changes only after an explicit policy save; existing runs, manually
  created interventions and Maintenance recurrence rules are unchanged.
- Invalid policy/frequency combinations receive the established validation error;
  foreign templates/organizations and insufficient permissions stay refused.
- The form clearly states the selected policy and recurrence timezone, exposes a
  keyboard/touch preview, and localizes its label without changing old-rule copy.

## Delivery status

These four iterations are **specified**, with implementation and acceptance checks
still required. The source inventory above is **implemented** and is not new proof
of a deployed environment. No offline tour readiness UI, additional import wizard,
Workload simulator UI or `monthDayPolicy` was implemented by this documentation
change. Accessible demonstration preparation is tracked in the separate
`fireguard-demo-video` project; a scripted/mock capture cannot validate a live API,
worker, browser cookie/CORS or Mercure deployment.
