# Interventions Feature

**Reading guide:** [Documentation index](../../../../../../docs/README.md) · [Related guide](../../../../../../docs/guides/interventions-and-offline.md).

## Adaptive operations interface

The central interaction-capabilities contract selects touch controls and overlays for phones and tablets,
independently of width. The collection defaults to List and retains explicit Board,
Calendar and Recurrences query parameters. Mobile Board stacks status sections with
the same bounded per-status data, pending/error states and permission-checked move
requests; its card drawer is the touch alternative to desktop dragging and menus.
The intervention calendar presents the same month as an agenda on mobile.
At desktop widths of at least 1024px, the Calendar tab projects its
selected-day template into the dashboard's resizable right slot. The page
releases it on another tab or route; below 1024px the existing agenda replaces
the grid and panel. Projection keeps `InterventionCalendar` presentational and
does not add a calendar request.

The detail has one live workflow action template: in the desktop page header or a
mobile footer above `--mobile-navigation-height`. Reserved content space and a bounded
scrolling footer protect work, errors and the navigation. The mobile action drawer
uses the same gates and handlers, including the existing destructive confirmations.
Interaction-mode changes do not replace any form or workflow store.

The public synchronization widget shows a labeled mobile offline/pending/blocked
trigger and exposes its existing queue and retry actions in a drawer. Shell consumers
must keep this widget visible outside hidden mobile tools when work needs attention;
the outbox remains device-global. Discard still requires its existing alert dialog.

## Purpose

Owns organization-scoped field intervention workflows.

This subfeature is responsible for:

- intervention listing and creation,
- intervention detail orchestration,
- intervention publication and issue checks,
- intervention offline persistence and outbox replay.

Equipment maintenance, repair and replacement tasks record an explicit performed-at instant,
outcome and work description through the existing revision-checked task command. Results stay
staged until publication; unsuccessful maintenance remains open. Local projection never derives
the execution date from synchronization or task status. Inspection controls keep their owning
Inspection result resource. Published report downloads use the server's closure snapshot;
unpublished downloads are explicitly labelled drafts with live data.

Replacement completion also attaches the confirmed published successor returned by Equipment.
The original remains the result's equipment target. The UI reads the reciprocal replacement link,
checks organization, retired original and published successor, and sends its canonical resource
with the result in the same revision-checked command. Missing proof blocks success; failed attempts
remain recordable. Opening the existing equipment dossier and refreshing preserve the work draft.
Account, organization, session and permission changes cancel the proof read and discard its data.

## Parts used and stock declarations

The Overview tab discloses Parts used locally. The mounted form survives collapse, refresh and
interaction-mode changes. The task context links a declaration to its work item and equipment;
responsible members and participants can also declare for the intervention as a whole. A task's
named assignee can select their task. Inventory read, consumption and intervention execution
permissions remain separate; the API rechecks membership and resource scope on every declaration.
Published interventions accept authorized late physical facts while keeping their closure snapshot.
The internal-cost link requires `organization.maintenance_cost.read` and opens the Cost feature;
ordinary stock histories and device snapshots contain no financial amounts.

Approved sibling dependency: Inventory publishes its `models`, `data-access` and
`ui/components` concern barrels. Intervention composes `InventoryConsumptionPanel`, supplies
authorized parts, warehouses and server declarations, and owns transport and durable outbox writes.
Inventory owns stock confirmation, reconciliation and exact quantitative contracts. Preparation
drains every authorized catalog and declaration page, with stable totals and a 10,000-row bound.
Missing pages, changing totals, permission errors and obsolete sessions never create a partial
snapshot labelled complete. A retained catalog describes references rather than available stock.

Account/organization/intervention metadata stores versioned stock snapshots in the existing
IndexedDB schema. An individual receipt cannot imply a complete catalog or declaration history.
Snapshot and receipt mutations are serialized, retain every acknowledged declaration identity,
and never regress confirmed stock to a stale pending response. Account, session, organization and
loaded permission fences apply at every asynchronous boundary before exposure or persistence.

Each consumption keeps one immutable `clientOperationId`, physical timestamp and exact quantity
string through retries. The form is acknowledged only after the outbox transaction succeeds.
Device storage failure retains submitted input, protects browser departure and route navigation,
and blocks publication until the same declaration is saved. Every durable queued operation also
participates in the existing publication preflight and service-worker update guard. Server receipt
persistence completes before its queue row is removed; a failed local receipt save keeps the same
operation pending for idempotent replay. `received_pending` means the physical fact was received
but still needs stock reconciliation, separately from device persistence and synchronization.

## Effort, time and workload

Intervention owns nullable task estimates, explicitly reassessed remaining effort,
optional local-date work periods, assignments and an independent versioned time journal.
Minutes are integral; missing values are unknown, never zero. Logging or correcting
time never updates task status, remaining work or the intervention's publication revision.
Task actions use server-provided capabilities, including former-assignee journal access.
Completed or skipped tasks expose only authorized journal operations, not planning edits.

Task creation accepts optional whole hours plus a minute remainder, converted to integral minutes
only on submission. Both empty parts remain unknown. Its optional Spartan calendar range uses
organization-local intervention bounds; clearing the override restores inheritance without copying
dates. The mobile calendar stages a complete range until Apply, preserving the form on dismissal.

Approved sibling dependency: Workload publishes `models`, `utils`,
`ui/components` (assignee indicator) and `ui/dialogs` (overload confirmation).
Intervention may consume these public APIs; it never computes global capacity.
The server rechecks every planning mutation transactionally. A confirmation retries
the captured command and revision with the exact presented token, not edited form state.

Time journals and drafts are account-scoped IndexedDB records separate from operational
workspace snapshots. Authorized journals are prefetched with saved workspaces; missing
offline history remains explicitly unknown. Stable entry IDs and independent revisions
make replay idempotent. Drafts survive failed writes; failed device persistence retains
the latest input in memory and guards dismissal. A native browser departure warning is requested
only after local persistence fails and the latest draft differs from its confirmed device snapshot;
retry retains this protection until persistence succeeds. Durable drafts and network write failures
do not trigger it. Success, explicit discard, scope reset and destruction remove the protection.
Browsers may suppress this event or warning, especially on mobile; it is no durability guarantee.
Time, effort and assignment conflicts
preserve local intent and server values until human review; generic retry cannot bypass
revision review or overload consent. No offline workspace implies global availability.

Service-worker activation uses auth's published durable-work registry. Intervention and messaging
operations, including failed and conflicted rows, block the update until synchronized, resolved or
explicitly discarded. The offer tracks registered queue indicators, while activation and the final
reload each reread persisted queues. Storage errors, session replacement and newly queued work keep
the update waiting. No persistent-storage permission is requested automatically.

## Entry Points

- Routes: `interventions.routes.ts`
- Public API: `index.ts`
- Feature providers: `interventions.feature.ts`

## Routes

The index is `/organizations/:organizationId/interventions`; List, Board, Calendar
and Recurrences use the existing `?view=` values in one page. Legacy paths redirect.
`?create=1` is consumed once in the browser and requires planning permission.
Equipment dossiers may add `targetEquipment=<UUID>`, `workAction=inspection|maintenance|repair|replacement`
and optional `siteContext=<root-site UUID>`. These validated hints seed intervention preparation;
after creation the detail opens the existing task form with that equipment and action. The planner
confirms the normal task command. Existing matching open work is revealed instead of duplicated.
The detail consumes these hints only in the browser; they never authorize cross-organization access.
Blank and Template creation preserve separate drafts and commands; duplication
prefills a new draft rather than copying the source lifecycle.

Merge query parameters on view changes and preserve list context through detail,
creation and prev/next navigation. Filters live in the URL; sort, hidden columns
and page size are preference state. Invalid filter values cannot reach the API.
Each view offers/applies only its supported fields while retaining unused URL values.
Board and Calendar have independent bounded caches and defer their first reads.
Recurrences remains addressable without another collection menu entry.

The detail keeps Work's existing `overview` value and addressable Changes, Attachments,
Facilities, Equipment and Inspections tabs. Local table criteria reset for a new
intervention. CSV export forwards only supported filters, reports omitted criteria,
and preserves the server limit/error; it does not export only a loaded page.

See the [intervention collection reference](../../../../../../docs/guides/interventions-and-offline.md#intervention-collection-reference) for details and rationale.

## State and Data Access

`InterventionStore` is route-scoped for one server list page, creation and list actions.
Board and Calendar keep separate bounded query stores. Prev/next is restricted to
the loaded list page; extending it must carry the same query context.
`InterventionWorkspaceStore` is detail-scoped and owns the canonical complete workspace,
activity and independent write states. A context change clears previous data; refresh
retains the current result. Presentational tables never own these stores or requests.

Detail query stores own criteria and server pagination independently of the complete
offline snapshot. Linked resources load on activation with separate request states,
totals and append/retry behavior. Their in-memory results are not durable offline data.
Publication separates accepted launch, durable identity, observation and recovery;
an observation failure cannot become a failed launch or justify a second POST.

Offline repositories, prefetch, replay and the device-global sync widget retain account,
organization, intervention and authentication-session fencing. Stores expose named
request states and typed consequence events; concurrent rows retain independent failures.

Successful preparation also reads Equipment's complete authorized type catalog through its public
`EquipmentTypeService.listAll`. `saveEquipmentCatalog` persists it only for the saved workspace's
account, organization and intervention, using the existing metadata store. Ordinary workspace
mutations retain that catalog; deleting an intervention removes only its own catalog metadata.
Restoration seeds the page's public `EquipmentTypeCatalogStore` only under the same authenticated
account and organization with currently loaded equipment-read permission. Revocation and scope
changes clear visible descriptors. Archived entries remain readable for history; legacy snapshots
without a catalog retain their existing behavior. Existing planning catalog search APIs stay compatible.

See the [intervention state reference](../../../../../../docs/guides/interventions-and-offline.md#intervention-state-reference) for details and rationale.

## Published Contracts

The root `index.ts` stays deliberately narrow (see the comment in the file): a wide barrel
drags the IndexedDB/offline graph into every consumer's initial bundle. It publishes:

- `provideInterventionsFeature` — bootstrap providers.
- `InterventionService` — the transport service, consumed by the parent feature's landing page
  (`OrganizationTodayStore`) to list the interventions each work queue holds. Exported from its
  implementation path rather than through `./data-access`, because that barrel also carries the
  offline services.

Nothing else is published from the root barrel — `withSyncIndicator` included: `organization/providers/index.ts`
imports it from `providers/sync-indicator`'s own local `index.ts` directly, the same deep-import shape
`withAssistantToggle` uses for collaboration's assistant provider, precisely so this widening never has to
flow through (and thereby widen) the deliberately narrow root barrel above.

The parent feature additionally consumes three
concern-level barrels, which are public surfaces in their own right (ARCHITECTURE.md §13.2):

- `models` — `InterventionOutput`, the queue types, the status/priority unions.
- `utils` — `buildInterventionQueueRequests`, the catalogue mapping a named question to the
  collection queries answering it.
- `data-access` — `InterventionOfflineService`, for the "waiting to sync" queue. This one does
  pull the offline graph in, deliberately: the landing page must list local work, and
  `InterventionSyncIndicator` injects the same service for the shell's sync indicator.
- `ui/components` — `InterventionTag`, so a queue row renders an intervention enum through this
  feature's own registry rather than a copied map.

Internal code imports deep paths directly.

## Cross-Feature Dependencies

- Consumes Auth's `AUTH_SESSION_PORT` for offline prefetch and replay ownership. Background member and intervention
  reads wait for an authenticated session; losing that session cancels pending reads even when
  an organization identifier remains remembered.

- Offline replay and its coordinator capture the session revision, Account's `USER_IDENTITY_PORT`
  owner and parent organization context before loading operations. Session replacement, including
  returning to the same account, owner loss or workspace change stops further writes and suppresses
  obsolete queue mutations, conflict recovery and replay events. A replay organization must match
  the locally persisted intervention owner; device-wide cycles may still synchronize that account's
  interventions from multiple organizations. Forced logout retains immediate local purge.
  Session-end notifications cancel active replay transport subscriptions. An already accepted
  request may finish on the server, but its obsolete pass never continues under another session.

- Depends on organization route context and permissions from the parent `features/organization`
  feature (`organizationPermissionGuard` from `@features/organization/http/guards`,
  `ORGANIZATION_PERMISSION` from `@features/organization/models`).
- The collection has no KPI strip or statistics request. The historical read-only
  `StatTile` composition does not authorize adding a second loading path.
- The detail page's team assignment imports `TeamService` from
  `@features/organization/data-access` and `TeamOutput` from `@features/organization/models` —
  the parent's own root concern barrels, the same pattern the KPI strip's `StatTile` reuse
  establishes. Read-only: the page lists an organization's teams to offer as assignment targets;
  it creates, edits and deletes no team and owns no team state beyond the picker dialog's local
  selection.
- Consumes `CollectionPagination`, `CollectionToolbar`, `CollectionSearchBox` and
  `CollectionFilterBar` from `@shared/collection-pagination`, `@shared/collection-toolbar` and
  `@shared/collection-filters` for the list page's shared pagination band, toolbar shell, search
  box and filter chip row — see `organization/FEATURE.md` § UI Conventions. This feature's own
  `interventions-page` was the reference implementation the shared filter bar generalized from.
- The parent feature consumes this feature's public API for its landing page's work queues
  (ARCHITECTURE.md §4): the root barrel's `InterventionService` plus the `models`, `utils`,
  `data-access` and `ui/components` concern barrels listed above. Read-only — the parent lists
  and counts interventions and reads the local outbox, but owns no intervention state and takes
  no workflow decision.
- `?create=1` on the index route is part of that contract: it is how the parent's landing page
  starts an intervention without duplicating the creation drawer.
- May reference facility, equipment, and inspection ids as linked counts on the workspace properties
  rail, but must not absorb ownership of those sibling organization subfeatures.
- The detail page's "Linked" tabs cross-import `FacilityService`, `EquipmentService` and
  `InspectionService` straight from each sibling's `data-access` barrel
  (`@features/organization/features/{facilities,equipments,inspections}/data-access`) — the same
  established pattern `intervention-sync.service.ts` and
  `InterventionPlanningOptionsStore` already use for the same three siblings, extended with one
  read-only method per service (`listByIntervention`). Read-only for equipment and inspections:
  this feature lists a sibling's records scoped to one intervention and renders them through its
  own tables; it creates, edits and deletes nothing on their behalf, and owns no
  equipment/inspection state beyond the two call states in `InterventionLinkedResourcesStore`.
  **Facilities are the one write exception (8.0):** the "Add facility" sheet
  (`ui/sheets/intervention-facility-sheet`) cross-imports `FacilityCreateForm` from
  `@features/organization/features/facilities/ui/forms/facility-create-form` and calls
  `FacilityService.createForIntervention` — already exposed by facilities' `data-access` barrel —
  through `InterventionWorkspaceStore.createFacility`. This exists to clear the backend's "At
  least one facility is required" `site_setup` publication blocker directly from the workspace.
  Ownership of the form (its fields, its validation, its type catalog) stays with facilities; this
  feature only enriches the emitted `CreateFacilityInput` with the organization and intervention
  IRIs and refreshes its own workspace (`reload`) and `InterventionLinkedResourcesStore`
  (`reloadFacilities`) on success. No parent-facility picker, map center or address geocoding is
  wired from here — the form's own optional fields are simply left at their defaults, so a
  facility created this way starts a bare root facility completed later from its own record.
- The detail page's Discussion sheet (6.2) embeds `SubjectDiscussion` from
  `@features/organization/features/collaboration/ui/components` — an approved cross-feature
  dependency, recorded in collaboration's own `FEATURE.md` under Published Contracts. This feature
  supplies `organizationId`/`interventionId` and gates the trigger on
  `organization.messaging.read`; it owns no messaging state, injects no collaboration store or
  service directly, and the sheet's only wiring is the component's own inputs.
- **The reverse direction also holds, since cross-navigation (7.0):** the facilities feature's
  `FacilityOverviewStore` cross-imports `InterventionService` from this feature's root barrel
  (`@features/organization/features/interventions`) and `InterventionOutput` from its `models`
  concern barrel, to list the most recently updated interventions whose `site` is the open
  facility ("Interventions on this site"). No new method was needed — `InterventionService.list`
  already accepts a `site` IRI filter. Read-only, the mirror of the "Linked" tabs' own established
  pattern above: facilities lists interventions touching one of its records and renders them
  through its own template; it creates, edits and deletes nothing here, and owns no intervention
  state.

- `MemberSelectOption` now lives in `@features/organization/models` (this
  feature re-exports it from its `models` barrel for its own consumers) and is
  built by `toMemberSelectOption` from `@features/organization/utils` —
  `InterventionPlanningOptionsStore` no longer carries a private mapper. Every
  member picker (assign dialog, properties grid, work-item form, create sheet,
  recurrence form) renders Spartan `Item` and `Avatar` directly: avatar, name,
  role. A trigger whose value left the option list reads a
  localized "Unknown member/site/label/target", never the IRI.

<a id="the-rail-is-not-the-retired-workspace-tabs"></a>
<a id="one-address-one-implementation-one-host"></a>
<a id="the-forward-move-has-one-gate"></a>
<a id="proposed-changes-reject-is-the-only-client-action"></a>
<a id="editing"></a>
<a id="progressive-planning-without-a-wizard"></a>
<a id="notices"></a>
<a id="offline"></a>
<a id="activity-and-team-chat"></a>
<a id="comment-mentions"></a>
<a id="attachments-and-field-capture"></a>
<a id="completion-signature-phase-5d2"></a>
<a id="write-attribution-is-exact-not-approximated"></a>

## Detail workspace composition

Work (`overview`), Changes, Attachments, Facilities, Equipment and Inspections keep
one stable horizontal native Spartan tab list. Properties and publication blockers
remain reachable independently of the selected tab. Secondary metadata is disclosed
locally; changing intervention resets it while a same-context refresh preserves it.
Activity and its composer retain their draft while tabs or interaction mode change.

Use API-provided `allowedActions` and `allowedTransitions`; a legacy snapshot missing
capabilities denies server-controlled actions until synchronization. The page owns
command orchestration, selected-resource focus and approved sibling composition.
One `workflowActions` template mounts in the desktop header or mobile footer; use
the central interaction-capabilities contract and preserve reserved footer space.
The page-local command projection chooses the visible phase action from a plain
capability/readiness snapshot. It neither authorizes nor executes writes: the page
retains confirmation, current-context checks and publication preflight.
Publication waits for relevant local replay, checks queued/conflicting work and
rereads the intervention/issues before POST. Accepted publication remains recoverable.

Draft dismissal, revision/overload consent, failure attribution, capture/signature,
comments and time journals retain their owner invariants below. A missing read must
remain unavailable rather than a verified empty result.

See the [intervention workspace reference](../../../../../../docs/guides/interventions-and-offline.md#intervention-workspace-reference) for details and rationale.

## Status / enum presentation (badges & select options)

`resolveInterventionTag` is the feature's published enum descriptor contract and
`InterventionTag` is its rendering. Unknown values degrade gracefully; icon and label
carry the status in addition to semantic color. Sibling enum types enter only through
approved model barrels. Extend the descriptor once rather than copying per-page maps.
The documented pure runtime-model exception remains governed by ARCHITECTURE.md.

See the [intervention enum rendering reference](../../../../../../docs/architecture/patterns-and-examples.md#intervention-enum-rendering-reference) for details and rationale.

## Conventions (apply to all work in this feature)

ARCHITECTURE.md and DESIGN.md govern layers, Signal Forms, OnPush, native Spartan,
styling, comments and validation. Page/store decisions and form/table emissions stay
at their owning boundary. Dirty overlays confirm dismissal and accepted writes lock
closure until settlement. Scroll ownership, padding and DOM/focus order must remain
consistent in both desktop surfaces and mobile drawers.

Online Work queries use server search/filter/order/pagination. The complete saved
workspace is the source for local filtering and scan navigation; a paginated response
must never replace that complete snapshot. Loading failures retain criteria and data.

See the [intervention form and collection reference](../../../../../../docs/architecture/patterns-and-examples.md#intervention-form-and-collection-reference) for details and rationale.

## Detail table query and rendering contracts

- The page owns Work, Changes, Facilities, Equipment and Inspections criteria through its
  component-scoped stores. Initialize business defaults on first activation, retain each
  tab's criteria until the intervention changes, and reset all five on a new context.
  Criteria are not persisted in the URL or browser storage. Table components receive
  controlled model contracts and emit `queryChanged` / `retryRequested`; they neither
  inject stores nor call APIs, and initialization does not emit a second query.
- In online detail tables the API alone decides search/filter membership. Debounce only
  nonempty text edits by 300 ms; cancel the obsolete request before that delay. Filters,
  clears, activation, forced refresh and retry are immediate. Check intervention identity
  and request generation before success or error writes. Refresh/retry bypass identical
  criteria deduplication. Linked-resource append retains earlier pages on failure, retries
  the failed page and deduplicates rows by identifier.
- Reconcile only mutation-affected rows, then invalidate the concerned collections:
  immediately reload the active query and defer visited inactive queries to activation.
  Never replace recent filtered API rows wholesale with the canonical workspace snapshot.
  Typed remote-success, durable-enqueue and effective-replay events carry the intervention
  and affected collections. The page coordinates these events; a store must not listen
  to the event group it emits.
- Offline Work and Changes use only the complete saved workspace plus outstanding local
  operations, applying available row labels and business status mappings. Search uses
  the same resource and patch formatting as the table, so humanized
  fields and localized boolean values remain searchable. The formatting utility and its
  line model belong to the feature's utils/models public surfaces, not a table-private API.
  Explicitly label these results as saved/local, not live API results. A missing snapshot is unavailable,
  not empty. Linked resources retain only in-memory results and cannot apply new queries
  offline; this feature adds no persistence for them. Reconnection and successful replay
  refresh the workspace before invalidating queries, preserving pending/conflicting work.
- Activity invalidation is coordinated for remote status, planning, publication and
  effective replay. Do not invent task/rejection activity kinds absent from the API.
  Comments keep their existing timeline handling. Partial replay announces only collections
  actually changed remotely, even when later operations fail or remain conflicted.
- Changes stays in `ui/tables/intervention-change-table`: one semantic row per field/value,
  with Resource, Status and Actions spanning that change's rows. Reserve 8/8/7/5 rem for
  Resource/Field/Status/Actions and at least 15 rem for the flexible proposed-value column.
  Action columns depend on permissions/filter context, never transient result presence.
  Horizontal overflow belongs to the table, not the document; tactile mobile uses cards.
- Skeletons share final columns, alignment and density. Initial loading without a result
  uses placeholders; refresh preserves the last result, including an empty result, with
  a discreet progress indicator and `aria-busy`. Only initial errors replace the surface;
  refresh/append errors are non-blocking and offer retry without clearing criteria or pages.
  Changes distinguishes no data, filtered emptiness and search emptiness with relevant clears.
- Ordinary tab activation scrolls the main container to its beginning after panel mount,
  instantly and without moving keyboard focus. Explicit task/blocker navigation takes
  priority. After internal navigation completes, reapply the loaded name only for the
  current intervention to keep h1, breadcrumb and document title stable; do not refetch
  the resolver per tab or change the global title strategy. Preserve the header underline,
  18 px section titles, count badges, dashed empties, neutral publication cards and bottom space.

## Invariants

- **Every sheet that carries a form confirms before it discards one.** The
  five form-bearing sheets — create, work item, request changes, recurrence,
  discussion — all take their form's `dirtyChanged`, hold it in a local
  `dirty` signal, and route Escape, the backdrop and the form's own Cancel
  through `requestClose()`, which raises `@shared/unsaved-changes` instead of
  closing. `onStateChanged` reopens the panel through the queried `HlmSheet`
  before raising the confirmation, because the underlying dialog ref has
  already begun closing by the time the handler runs. `[disableClose]` stays
  bound to `pending()` only: it guards a write in flight, not a draft.
  `InterventionCreateSheet` additionally counts its own **template override
  drafts** as dirty — they are the sheet's state, not the form's — while a
  bare template _selection_ is not, since re-picking it is one click.
  Sheets whose panel state is derived from a `visible` input clear `dirty`
  when it goes false, so an abandoned draft cannot make the next opening
  confirm over nothing.

- **Changing a chip's operator never costs the chip, and never costs a value
  the new operator can hold.** `onFilterOperatorChanged` marks the field
  pending, so the chip survives the value drop that a shape change forces —
  without it the bar, which renders one chip per _active_ key, unrendered the
  chip the instant its value went. `equals` and `isAnyOf` carry their value
  across in both directions; only a multi-value `isAnyOf` narrowing to
  `equals` genuinely cannot be represented, and only that clears.
- **One failing option list never blanks the others.**
  `InterventionPlanningOptionsStore` joins four requests for the creation
  options and five for the workspace. `forkJoin` errors as a whole the moment
  any input does, which was disproportionate: a failing template list left the
  Site, Responsible and Label chips with nothing to offer, so three filters
  were unusable because of a fourth, unrelated endpoint. Each source is now
  wrapped so it can fail alone. The failure is reported, not swallowed —
  `loadFailed` is dispatched whenever any source fails — and `loadCallState`
  turns to error only when every one of them does.
- **A picked operator outranks the value's own shape.** The URL writes
  `['planned']` and `'planned'` identically, so `enumFieldOperator` reading
  the shape alone snapped "is any of" back to "is" on a single selection. The
  explicit pick wins; the shape decides only for a field untouched this
  session.

- **A filter the active tab does not honour is never silently applied and
  never silently lost (13.0).** The page-local view criteria projection owns
  permitted-view fallback and the honoured-field catalogue; `offeredFilterFields`
  narrows the "+ Filter" menu's own catalog to it, and `honouredActiveFilterKeys`
  narrows both the bar's `activeKeys` input and the "Filters" badge count the
  same way — an unhonoured field renders no chip here at all, active or not,
  and the badge never counts it, since it narrows nothing on this tab. Nothing
  is dropped from the URL: `switchView` merges every param forward regardless,
  and each tab's own query builder (`boardFilters`, the page-local Calendar projection)
  already reads only the fields it declares, so the value is inert here and
  reapplies the moment the operator switches to a tab that honours it. Adding
  a tenth filter field, or changing which fields a tab honours, means updating
  the view catalogue and the affected query projection in the same change.
- **`Board` and `InterventionCalendar` inject no store and call no
  service (11.0, `ARCHITECTURE.md` §10.3).** Only `InterventionsPage` may —
  a Board move is emitted as `moveRequested` and the page decides whether to
  call `InterventionStore.transition`; the Calendar's own store is provided
  and driven entirely by the page, the component only reporting its anchor
  through `monthChanged`. Do not add store or transport injection to either component — it
  is what keeps a table, a board and a calendar interchangeable dumb renderers
  instead of three more places that can independently misread the URL.
- **The detail page is never nested under `InterventionsPage`'s tabs.** It
  sits as the outer pathless parent's other child, specifically so it never
  inherits the collection chrome (search box, filter bar, tab list) that has
  no meaning on a single intervention's workspace.
- **Collection views have no metrics strip.** List, Board, Calendar and Recurrences
  start with their controls and results; opening or switching views does not
  fetch the organization-wide intervention statistics.
- **The Calendar tab places an intervention by `plannedStartAt ?? dueAt`,
  never by `dueAt` alone.** `listCalendarWindow`, `InterventionCalendarStore`
  and `InterventionCalendar` must agree on this one anchor — placing it
  differently in any one of the three would put an intervention in a
  different cell than the window that fetched it expects.
- **The Calendar's own `InterventionCalendarFilters` narrowing never grows
  past `status`/`type`/`site`/`responsible` without a matching backend
  change**: it is a `Pick` of `InterventionListOptions`, not a re-derivation,
  specifically so it cannot silently drift from what `listCalendarWindow`
  actually accepts.
- **Publication is confirm-gated, and the confirmation _is_ the recap.** The phase
  command in `review` only opens the dialog; `confirmPublish()` on the detail
  page is reachable solely from `app-intervention-publish-dialog`'s
  `confirmed` output — the confirmation itself lives in
  `ui/dialogs/intervention-publish-dialog/`, a purely presentational component
  (DESIGN.md § Action Surfaces rule 5: a destructive/irreversible confirm is a
  feature-local `ui/dialogs/` unit, never inline page markup).
  `app-intervention-publication-summary` renders inside that one dialog, fed
  the same signals the status band's forward action reads, so what the
  dialog recaps and what the band's disabled reason implies cannot drift.
  Publication is the one step that writes to the compliance record.
- **A mutating confirm dialog stays open, busy-locked, until the write
  settles.** `app-intervention-publish-dialog` and
  `app-intervention-bulk-delete-dialog` (the latter serving both the
  row-level and the bulk-selection delete flow, also extracted to
  `ui/dialogs/`) both stay open on failure and show the outcome inline, so the
  operator sees it exactly where they took the action and can retry without
  reopening the dialog, rather than the failure surfacing only as a
  page-level toast.
- **The phase's forward action has exactly one _live_ address, and one
  implementation, at every viewport.** `app-intervention-command-button` is
  the only markup; `app-intervention-status-band` is its only host, sticky
  under the title row. Nothing else on the page renders that action. See
  `### One address, one implementation, one host` — this retires the earlier
  two-hosts-by-breakpoint design (`app-intervention-action-box` /
  `app-intervention-command-bar`), itself a fix for "renders exactly once"
  once the grid collapse made that false on the primary persona's device.
- **The forward move is gated in exactly one place.** The status menu
  (`transitionTargets()`) subtracts `commandTransitionTarget()`, so a phase's
  forward transition can only be taken through the action the readiness gate
  guards. A second control performing the same transition without the check makes
  the gate advisory, which is what it did for `draft → planned` and
  `in_progress → submitted`. See `### The forward move has one gate`.
- **A row locks and spins on its own write, never on any write** — work-item
  rows and change rows alike. `isRowPending` reads membership in the store's
  `pendingWorkItemIds` / `pendingChangeIds` sets; `busy` gates only the add
  affordances. The store queues these writes with `mergeMap` specifically so an
  agent can tick items quickly — a template that disables the whole list undoes a
  deliberate store decision, silently.
- **The activity timeline is loaded newest-page-first**, because the API sorts
  ascending and `metaLine()` reads the last loaded entry as the most recent
  event. Reading page 1 and stopping made the header report the oldest event on
  the record. Older pages are prepended on demand
  (`hasOlderActivities` / `loadOlderActivities`); a partial window always says so.
- **Nothing that gates publication readiness is visible only inside a
  scrollable section.** `app-intervention-status-band` reads
  `intervention.blockersCount` — the count the backend recomputes on every
  write and returns with every PATCH — not from the Changes tab or the issues
  checklist it points at. This is the structural fix for the exact failure
  the 2.0 tabbed design was retired for (see `### Retired invariants`): a
  count that exists only inside a hidden panel is a count an operator can
  miss.
- **The band's blocker count and the issues checklist have different
  freshness sources, and both must stay live.** The count binds to
  `intervention.blockersCount`, so it is exact the instant a write's response
  lands. The issues _list_ only travels with the workspace fetch, so the
  store re-reads it (`refreshIssues`, silent on failure) on the online success
  path of every write that can create or resolve an issue — transitions,
  planning updates, work-item create/status/delete, change rejection. Binding
  the band to `issues().length`, or dropping one of those refresh calls,
  reintroduces the frozen badge and the phantom "No explicit work item"
  blocker this closed.
- **Every page-level notice renders once, at the location it concerns, never
  as a ranked stack.** An unattributed store error is a single alert above the
  sections; every other condition (reviewer note, blockers, unsynced outbox,
  activity-fetch failure, publication failure) has exactly one home inside the
  section, band or dialog it belongs to. A field-level rejection is
  excluded from the top-of-page alert (`pageError`) so it is never shown twice.
- **A failed load renders its reason and a retry, not "not found".** The
  in-page alert cannot report a failure that produced no intervention, so
  `store.loadFailed()` is its own branch. Never nest the load error inside the
  branch that requires a loaded intervention — that is the exact regression this
  invariant exists to prevent.
- **Publication says what it does, and reports that it is doing it.** The dialog
  names the compliance record before the recap, swaps its button to a spinner and
  a `role="status"` line while the write and its poll run, and confirms success —
  the one irreversible write in the product must not look like a frozen modal.
  The poll itself is **bounded** (~2 minutes) and its exhaustion is
  **recoverable, not terminal** (5.3): a publication stuck server-side past
  the bound surfaces as a distinct timed-out state — "still running in the
  background" with a single-shot "Check result" (`recheck()`, one re-read of
  the publication, no new poll) — and a Close action that does not imply cancellation — never as a spinner that outlives the
  operator's patience, a false success, or a dead-end failure for a write
  that may yet complete. Past ~30 seconds the in-flight copy switches to a
  still-working variant so a long publication reads as long, not frozen. A
  genuine `failed` result still reports inline as before.
- **The page's fixed elements never reorder (WCAG 2.4.3).** Header line tabs →
  error alert → active panel → properties rail → desktop issues checklist →
  prev/next never changes with phase. The properties rail and issues checklist
  retain their order in the second column, while the workflow action stays in
  the header on desktop and the footer on mobile.
- **Rejection is the only client action on a proposed change.**
  `UpdateInterventionChangeInput.status` only accepts `'proposed' | 'rejected'`,
  never `'applied'` — acceptance happens automatically at publication, not
  through a client action. `InterventionWorkspaceStore.rejectChange` is the one
  write, and `app-intervention-change-table` offers it per row only when the
  page grants `canReject` (see `### Proposed changes: reject is the only
client action`).
- **Every property is edited where it is displayed, and each affordance opens a
  different editor.** This supersedes the old "one edit entry, not one per row":
  that rule existed because four pencils all opened the _same_ planning drawer, so
  the affordance advertised four scopes and delivered one. Under in-place editing
  each control genuinely edits its own property, which is the condition the old
  rule was protecting.
- **Deletion goes through `InterventionStore`, never `InterventionWorkspaceStore`.**
  Only the list store removes the entity, decrements `totalInterventions` and
  repairs `orderedIds()` — which the detail page's own prev/next walks. Calling the
  workspace one leaves a ghost id that nothing repairs, because that store is torn
  down on navigation. `InterventionWorkspaceStore.delete` is therefore **unreachable
  from the UI**; it is kept dormant rather than removed, and must not be wired to a
  surface without revisiting this.
- **Every delete gate is the server-computed `allowedActions.canDelete`.**
  `InterventionTable`'s row menu, `InterventionsPage`'s bulk selection and
  `InterventionDetailPage`'s capability surface all read the flag the API attaches
  to each intervention — it already folds the caller's permission and the
  deletable-status window (`draft`/`abandoned`) the backend enforces, so the
  surfaces cannot drift and no client mirror remains (the former
  `utils/intervention-deletable/` is deleted). The page-level bulk-toolbar
  visibility still gates on `INTERVENTIONS_WRITE`, the coarse permission; the rows
  narrow it. A bulk selection is filtered to its deletable subset before the
  confirm dialog opens — the count it shows is always what will actually delete,
  never a promise a 409 would break.
- Intervention workflows remain organization-scoped.
- Offline outbox replay belongs to this subfeature, not `core`.
- Intervention pages orchestrate intervention services and intervention stores.
- Intervention route pages live under `ui/pages/`.
- **The board's drag-drop legality has exactly one implementation.**
  `resolveInterventionBoardMoveReason` and its boolean facade
  `isInterventionBoardMoveAllowed` (`utils/intervention-board-move/`) are the
  shared authority for the page's `canMoveBoardItem` policy (passed to
  shared `Board`) and `InterventionBoardCard`'s own "Move to…"
  menu — a second, independently-computed legality check on either side
  would let the two silently disagree. Server-legal transitions remain subject to
  execution membership and the advertised submit/withdraw capabilities.
- **Drag is an enhancement, never the only path**, on the same house rule
  `shared/tree` established: every board card carries a "Move to…" menu
  offering the identical set of legal moves, so the workflow is fully
  reachable by keyboard/AT with no pointer drag at all.
- **Every nullable `InterventionOutput` field is optional on the wire.**
  API Platform omits null fields, so `site`, `responsible`, `plannedStartAt`,
  `dueAt`, `description` and `reviewNote` are typed `?: T | null` and arrive
  as `undefined`, never `null`. Guard with `== null` / nullish coalescing —
  a strict `=== null` compiles but silently misses the wire shape, and one
  such check in a computed took down the whole properties grid for any
  intervention without a site.
- **A status transition is never cancelled client-side.** The workspace
  store's `transition` runs through `exhaustMap`: a duplicate trigger while a
  PATCH is in flight is dropped, not allowed to abort the first request after
  the server already applied it (which lost the returned revision and 412'd
  the duplicate). The page adds the complementary guard:
  `onSignatureDismissed` is a no-op once the signature dialog is already
  hidden, because Skip emits `dismissed` directly _and_ the closing dialog
  echoes it through its own state-change notification.
- **Date-only planning values are serialized at midnight UTC.** Date pickers
  build local-midnight `Date`s; every write path (`pickSchedule`, the create
  form's `plannedRange` split, the template override) re-anchors them with
  `toUtcMidnight` (`utils/intervention-date-only/`) so the stored instant
  names the picked calendar day in every timezone — the org-date pipe renders
  in UTC by default and displayed J-1 otherwise. Fix the _write_ side only:
  changing the pipe's default timezone would move the bug, not close it.
  Instants persisted before this rule (local-midnight) keep their old drift
  on display; that is accepted for existing test data.
- **Query-param effects that rewrite the URL are browser-only.** The
  `?create=1` effect (like the calendar-month sibling) guards on
  `isPlatformBrowser` — run during SSR it strips the param server-side before
  the browser can honour it, The SSR E2E mode is a separate verification boundary;
  the browser guard preserves the `?create=1` contract before hydration.

### Retired invariants

These earlier surface rules no longer govern the feature. Current collection,
workspace, preparation and review contracts above determine composition and behavior.

See the [retired intervention designs](../../../../../../docs/guides/interventions-and-offline.md#retired-intervention-designs) for details and rationale.

## Preparation and review interaction contracts

- Create in a sheet; prepare in the dedicated intervention page. The work-item sheet and
  correction-note dialog close only after a confirmed server write or durable local enqueue.
- Plan readiness and its command use the same site, responsible, start and due requirements;
  recommended work items are distinct from required server prerequisites.
- Selection catalogues load independently with server search and pagination. Keep cached
  selected labels across searches within the same organization; reset across organizations.
- Work items use shared search, filters and pagination. Desktop rows give target, action,
  assignee and state their own columns; mobile keeps one tactile row. Optional tasks are
  marked beside the target instead of repeating Required in a dedicated column. State and
  field-discovery badges wrap within their cell; the default planned origin is omitted.
  Target labels lead both layouts, with the Next marker beside them and independent effort
  values below. Missing estimates remain explicit; zero recorded time is omitted, not inferred.
  Completed, skipped and remaining counts stay distinct.
  A scan reveals and focuses the exact item even when the previous filter excluded it.
- Changes expose proposed, rejected and applied states. Display proposed values only; the
  API does not supply historical before-values. The three states use the same shared
  collection filter system as work items. Evidence remains readable from a work item.
- Publication preflight awaits this intervention's local replay, checks remaining queued
  work, and re-reads the intervention and issues before POST. Late responses for a departed
  account, organization or intervention cannot initiate publication.
- Bulk results preserve failed selections and readable identities. Retry only failed eligible
  rows. Publication always goes through the individual confirmation.
- The list's floating selection bar offers eligible status moves, assignment and deletion.
  The page owns selection and action eligibility; CSV export remains scoped to filtered results.
- Errors reading issues, attachments or local operations must not render as verified absence.

Assignment dialogs retain their Signal Form draft until every submitted resource
succeeds. Partial failures remain visible and retries exclude successful rows.
Selected sites and members may be resolved by scoped individual reads independently
of catalogue coverage; unresolved labels never clear the saved references.
Outbox conflicts preserve the original local revision separately from the last
verified server revision. An unsuccessful revision read is explicitly unknown.

Bootstrap consumers import `provideInterventionsFeature` through `providers/bootstrap`, a narrow public barrel
that does not import route or offline UI trees.

## Public entry points

These narrow entry points are published to the named consumers. `app` denotes the application composition root. Standard concern barrels follow ARCHITECTURE.md; prose examples do not grant access.

| Entry point                | Consumers      |
| -------------------------- | -------------- |
| `providers/bootstrap`      | `app`          |
| `providers/sync-indicator` | `organization` |
