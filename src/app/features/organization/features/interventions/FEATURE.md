# Interventions Feature

## Purpose

Owns organization-scoped field intervention workflows.

This subfeature is responsible for:

- intervention listing and creation,
- intervention detail orchestration,
- intervention publication and issue checks,
- intervention offline persistence and outbox replay.

## Entry Points

- Routes: `interventions.routes.ts`
- Public API: `index.ts`
- Feature providers: `interventions.feature.ts`

## Routes

- `/organizations/:organizationId/interventions` — the index page: a spartan
  `hlmTable` of the organization's interventions, grouped and paginated, with a
  debounced search box synced to `?q=` (a server-side `name` filter), a filter
  popover (status, type, deadline window), a column menu, row selection and a
  permission-gated bulk delete. `?create=1` opens the creation sheet on arrival
  and is consumed once, so the parent feature's landing page can offer "New
  intervention" as a primary action that actually starts the work.

  Sort and fold state are remembered in a cookie by
  `InterventionListPreferencesService`; filters deliberately are not, being
  questions asked now rather than stored preferences.

- `/organizations/:organizationId/interventions/:interventionId` — the detail
  workspace, described below. Mounted as a second child of the same pathless
  parent, so `InterventionStore` survives list ↔ detail navigation and the
  detail page's prev/next walks the order the list established, with no second
  fetch. `interventionTitleResolver` is registered as `title` **only**:
  `BreadcrumbService` falls through to `snapshot.title` when `title` is a
  `ResolveFn`, so one invocation serves both the document title and the crumb.

## State and Data Access

Stores:

- `InterventionStore` — provided on the pathless parent route in
  `interventions.routes.ts` (not on the list page), so it survives list ↔ detail
  navigation. Intervention list and creation (normalized entities + request
  state). `load` accumulates up to 500 interventions across 100-item pages (the
  backend clamps `itemsPerPage` at 100) and sets `isListCapped` when the
  organization has more, driving the list page's "refine your search" notice.
  `transition` applies a single status change optimistically (entity patch →
  PATCH with `If-Match` → merge fresh output on success, rollback +
  `transitionFailed` toast event on error); `orderedIds` exposes the current
  entity order for the detail page's prev/next. `delete` removes the cached
  entity and decrements `totalInterventions` on success; it uses `mergeMap` (not
  `switchMap`) so a bulk selection can delete several concurrently, each keyed by
  its own request and each dispatching its own `deleteSucceeded` / `deleteFailed`
  toast event — there is no aggregate "N deleted" outcome. **This is the only
  delete path wired to the UI** (see Invariants).
- `InterventionWorkspaceStore` — component-scoped (provided in
  `InterventionDetailPage`); the active intervention workspace (intervention,
  work items, changes, issues) with online/offline mutations. Async state is held
  as `loadCallState` (the workspace fetch), `mutationCallState` (**shared by every
  write** — see the known limitation below) and `activityCallState`; `loading`,
  `saving` and `error` are derived over them, and `mutationError` exposes the
  normalized `StoreError`. `load` blanks the workspace before fetching, which is
  right on entry and wrong afterwards, so **`reload` exists for a refresh that
  must not flash the page to a skeleton** — publication uses it. Also owns the
  activity timeline (`activities`, `loadActivities`, `addComment`), which no
  surface consumes yet.
- `InterventionCalendarStore` — the interventions inside a bounded date window.
  **Currently dormant**: the calendar render is not part of the rebuilt list page.

Data-access (transport boundary — `data-access/`):

- `InterventionService` — HTTP API service (`HydraApiService`). Also owns the
  intervention activity timeline (`listActivities`, `addComment`).
- `InterventionLabelService` — HTTP API service (`HydraApiService`) for the
  organization-scoped intervention label catalog (CRUD); labels are embedded
  as `InterventionLabelSummary` on `InterventionOutput.labels`.
- `InterventionOfflineService` — IndexedDB persistence façade + cross-cutting purges (public entry point). Delegates to its internal collaborators:
  - `InterventionDatabaseService` — IndexedDB connection/schema, CRUD primitives, owner binding (also published for logout reset).
  - `InterventionOutboxRepository` — replay outbox + `hasUnsyncedChanges` signal.
  - `InterventionWorkspaceRepository` — normalized workspace persistence.

  The local persistence layer (database/outbox/workspace + façade) lives under
  `data-access/services/intervention-offline/` because IndexedDB is local
  transport; only the façade and `InterventionDatabaseService` are public.

Behavior coordinators (`services/`):

- `InterventionSyncService` — outbox replay engine.
- `InterventionSyncCoordinatorService` — replays the outbox when connectivity/visibility is regained.
- `InterventionPwaUpdateService` — defers service-worker updates until the outbox is clean.
- `InterventionPrefetchService` — warms offline workspaces for the current member.
- `InterventionOfflineLifecycleService` — clears local data on logout.

These coordinators are armed once at app init via `provideInterventionsFeature`
(`start()`), each gated by a `started` signal driving a constructor `effect`.

Connectivity decisions across the feature read the shared
`ConnectivityService` (`core`), not `navigator.onLine` directly.

Architecture note:

- `state/` hosts NgRx SignalStore slices only.
- `data-access/` hosts the transport boundary: the HTTP service and the local
  IndexedDB persistence layer (façade + database/outbox/workspace).
- `services/` hosts intervention behavior coordinators (sync, prefetch, PWA
  update, lifecycle), one folder per service.

Main provider:

- `provideInterventionsFeature`

## Published Contracts

The root `index.ts` stays deliberately narrow (see the comment in the file): a wide barrel
drags the IndexedDB/offline graph into every consumer's initial bundle. It publishes:

- `provideInterventionsFeature` — bootstrap providers.
- `InterventionService` — the transport service, consumed by the parent feature's landing page
  (`OrganizationTodayStore`) to list the interventions each work queue holds. Exported from its
  implementation path rather than through `./data-access`, because that barrel also carries the
  offline services.

Nothing else is published from the root barrel. The parent feature additionally consumes three
concern-level barrels, which are public surfaces in their own right (ARCHITECTURE.md §13.2):

- `models` — `InterventionOutput`, the queue types, the status/priority unions.
- `utils` — `buildInterventionQueueRequests`, the catalogue mapping a named question to the
  collection queries answering it.
- `data-access` — `InterventionOfflineService`, for the "waiting to sync" queue. This one does
  pull the offline graph in, deliberately: the landing page must list local work, and the
  detail page injects the same service for its `unsynced` notice.
- `ui/components` — `InterventionTag`, so a queue row renders an intervention enum through this
  feature's own registry rather than a copied map.

Internal code imports deep paths directly.

## Cross-Feature Dependencies

- Depends on organization route context and permissions from the parent `features/organization`
  feature (`organizationPermissionGuard` from `@features/organization/http/guards`,
  `ORGANIZATION_PERMISSION` from `@features/organization/models`).
- The parent feature consumes this feature's public API for its landing page's work queues
  (ARCHITECTURE.md §4): the root barrel's `InterventionService` plus the `models`, `utils`,
  `data-access` and `ui/components` concern barrels listed above. Read-only — the parent lists
  and counts interventions and reads the local outbox, but owns no intervention state and takes
  no workflow decision.
- `?create=1` on the index route is part of that contract: it is how the parent's landing page
  starts an intervention without duplicating the creation drawer.
- May reference facility, equipment, and inspection ids as linked counts on the workspace properties
  rail, but must not absorb ownership of those sibling organization subfeatures.

## Detail workspace composition

The detail page (`ui/pages/intervention-detail`) is **one continuous,
pull-request-style flow**, not a set of tabs — the intervention model already
reads like a PR (proposed changes, an activity thread, a single merge/publish
gate), and the page's DOM finally says so. The section order is **fixed and
identical across every phase** (WCAG 2.4.3): only what is _open_ changes with
the phase, never the order things appear in.

1. **Header** — wayfinding only: the intervention `h1`, the reference number,
   the status tag with its transition menu, and an overflow menu for
   abandon/delete.
2. **Meta line** — who acted last and when, plus the revision, derived from
   the most recent loaded activity entry (`InterventionWorkspaceStore.activities`)
   and falling back to `updatedAt` while the timeline is empty or still
   loading.
3. **Page error alert** — the store's last unattributed failure, unchanged
   from the tabbed design.
4. **Details** — a `hlmCollapsible` disclosure. Collapsed, it shows a
   read-only chip row (site · responsible · planned window · priority ·
   labels) reusing the exact values the expanded content renders — never a
   second summary that could drift. Expanded, it holds `app-intervention-about`,
   `app-intervention-properties-grid` and the "Linked" card, unchanged from
   the tabbed design. Defaults **open** in `prepare` and **closed** otherwise,
   via a `linkedSignal` keyed on the phase so a manual toggle sticks until the
   next phase transition.
5. **Getting started** — `app-intervention-getting-started`, unchanged,
   rendered only in `prepare`. Activating a property item now also expands
   the details disclosure first, so the editor it points at is actually
   visible.
6. **Field work** — a second `hlmCollapsible` disclosure, defaulting open in
   `execute` and closed otherwise. Collapsed, its trigger row carries a
   summary ("6 / 7 · 1 skipped"). Expanded, it holds the reviewer-note banner
   (`changes_requested`) and `app-intervention-work-item-table`, an `hlmTable`
   grid (status toggle · item · row menu), unchanged in behavior.
7. **Proposed changes** — `app-intervention-change-list`, rendered only when
   `InterventionWorkspaceStore.changes()` holds at least one `proposed`
   entry. Read-only — see below.
8. **Activity thread** — `app-intervention-activity-thread`, always rendered.
   A system entry (`kind: 'system'`, e.g. `status_changed`) is a thin line on
   a vertical rule; a comment (`kind: 'comment'`) is a card with the author's
   avatar. Two visual weights, never one, so a thirty-entry timeline stays
   scannable.
9. **Action box** — `app-intervention-action-box`, the single host for the
   current phase's forward action. Its _content_ changes with the phase (a
   plan/submit label with its disabled reason; the blockers list, the
   `app-intervention-publication-summary` recap and the publish button in
   `review`; a locked terminal state once `published`), but it renders
   **exactly once**, at a fixed position, regardless of phase.
10. **Comment composer** — `app-intervention-comment-form`, at the foot of
    the thread, wired to `InterventionWorkspaceStore.addComment`.
11. **Prev/next footer** — unchanged.

### Read-only proposed changes

`UpdateInterventionChangeInput.status` only ever accepts
`'proposed' | 'rejected'` — the client can reject a change, never accept one,
and acceptance is not a client action at all: a proposed change is applied
automatically **at publication**. `InterventionWorkspaceStore` exposes no
method to reject a change today (only `InterventionService.updateChange`
exists, consumed by `intervention-sync.service.ts`), so
`app-intervention-change-list` is **read-only** in this pass: it lists the
still-`proposed` changes with a caption explaining what happens next, and
offers no action. Wiring a reject action is a follow-up that touches the
store and its offline outbox, not this page.

### Editing

Every property is edited **where it is displayed** (ARCHITECTURE.md §10.5), on
`@shared/inplace-field`. There is no planning sheet and no planning wizard.

Two commit modes, chosen by the control rather than by taste:

| Mode      | Fields                                | Why                                                                                                                                           |
| --------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pick`    | priority, site, responsible, schedule | a value picked in one gesture commits on that gesture — a Save button after choosing "Urgent" from four options is a click that means nothing |
| `confirm` | description, participants, labels     | free text and sets have no single "done" gesture                                                                                              |

`plannedStartAt` and `dueAt` are **one field**: picked together in a range control
and sent in one patch, which §10.5 admits as "a small coherent group".

**Nothing is dispatched for a value equal to the one already stored** — every
accepted patch increments `revision`, which publication is pinned to.

**A commit is confirmed, not undoable.** `FeedbackMessage` carries no action, so
an "Undo" toast would be a new cross-app primitive; instead every successful
in-place commit shows a success toast, so a mis-click is visible within the
toast's lifetime rather than discovered at review.

Mutability follows the backend (`Intervention::assertPlanningMutable`): planning
fields are writable in **draft only** (`canEditPlanning`), description and labels
until a terminal status (`canEditDetails`). A field that cannot be written renders
as a **disabled trigger** — no hover, no pencil, out of the tab order.

`name` is deliberately **not** editable here: the gate covering it is documented
in neither set, and offering an edit the API might refuse is what the read-only
rule exists to prevent. Resolve it against the backend before opening it.

### Progressive planning, without a wizard

`app-intervention-getting-started` is the whole of what replaced the four-step
guide, and it is deliberately not a progress-bar-plus-next-item strip: it lists
every prerequisite **at once** — site, responsible, due date, scope — each a
direct `hlm-item` row into the in-place editor that satisfies it. A planner
filling in a draft sees the whole short list up front rather than one item
revealed at a time, which suits "go progressively, not too many fields at once"
better than hiding all but the next gap would. It is a table of contents over
the in-place editors, never a second place to edit — which is why it can guide
without duplicating a single field.

It renders in `prepare` only. `description`, `labels` and `participants` are
**not** in the list — putting them there would invent obligations the backend
does not have. It is empty everywhere else: in `execute` the phase action is
already the living "Complete N remaining items" pointer to the checklist; in
`review` nothing left is a gap the operator can click their way to; and an
**abandoned** intervention falls back to the `prepare` phase, so without an
explicit guard it would offer to plan something that left the workflow.

### Notices

Each condition renders **once, where it is relevant**, instead of a single
ranked stack under the header: an unattributed store error (load or write) is
one alert above the sections with a retry; a reviewer's note sits atop the
field-work section; blocking compliance issues sit inside the action box's
`review`-phase content, beside the publish gate; a publication failure is
inline in the publish confirmation, which stays open so the operator can
retry; and an unsynced outbox is a small header indicator rather than a
dismissable banner. A field-level rejection is already shown by the field
itself (`editState.failed`) and is excluded from the top-of-page alert so it
never renders twice.

`hlm-alert` has exactly two variants and the theme carries no success or warning
token, so a notice's kind is conveyed by its **icon and title, never by colour**.
Every alert paints its own ground (`bg-muted/50`, `bg-destructive/5`) because
`--card` and `--background` are the _same colour in the light theme_ — a stock
alert would be white on white, separated by one hairline.

### Offline

The workspace store already queues writes, applies them optimistically and keeps
an IndexedDB snapshot, so offline behaviour works without any page code. The only
visible surface here is the header's unsynced indicator. The sync chip, the
blocked-operation count and Retry/Discard belong to a dedicated offline pass.

### Known limitation

`InterventionWorkspaceStore` has a **single `mutationCallState` for every write**.
The page attributes it to the one field or row that caused it (`editState.saving`,
`pendingWorkItemId`), which is an approximation: with two writes in flight the
spinner lands on the wrong one, and the second's success clears the first's error.
The real fix is named call states in the store, and it is out of scope for this
page.

## Status / enum presentation (badges & select options)

Every intervention enum (`priority`, `status`, `type`, `workItemAction`,
`workItemStatus`, `issueSeverity`, `changeStatus`, `inspectionResult`) renders
from a single source of truth, so the same value looks identical everywhere and
status is never conveyed by colour alone (icon + label always present).

- `models/intervention-tag/` — the vocabulary (plain TS, no Angular), exported
  through the feature `models/` barrel: the descriptor interface, the kind and
  severity unions, and `resolveInterventionTag(kind, value)` with a graceful
  fallback for unknown values. This is one of the two sanctioned runtime
  exceptions inside `models/` (ARCHITECTURE.md §10.10).
- `ui/components/intervention-tag/` — `<app-intervention-tag kind value />`, the
  one rendering. An `outline` `hlm-badge` where only the glyph carries the tone;
  `asOption` drops the badge and renders the same icon and label as a plain row,
  for use inside a select or combobox item.
- The severity tints are **literal Tailwind palette pairs** in that component's own
  `constants/`, because the theme has no `--success` / `--warning` / `--info`
  token. That file is private to the tag: other surfaces write their own literal
  pairs rather than reaching into it (§2.8).

To add a new enum value, extend the relevant descriptor map only — every consumer
follows.

## Conventions (apply to all work in this feature)

- **Tech**: Angular 22 standalone components, signals (`input()`, `computed()`,
  `signal()`), `ChangeDetectionStrategy.OnPush`; Tailwind
  utilities for styling. **Never edit `src/styles.css`** — style with Tailwind
  classes and the spartan theme tokens; literal class strings only (Tailwind scans them).
- **Architecture**: keep the `models/` (interfaces, types and the small pure
  utils that operate on them) · `data-access/` (HTTP + local IndexedDB
  transport) · `services/` (behavior coordinators) · `state/` (SignalStore) ·
  `ui/` split. `ui/` holds `pages/`, `forms/`, `tables/`, `sheets/`,
  `dialogs/`, `components/`; one folder per unit with an `index.ts` barrel. **Shared types/data live in `models/`** —
  co-located in the unit's own `models/` folder, or in the feature-level
  `models/` when used across components. Do NOT invent sibling layers (e.g. a
  `presentation/` folder). Presentational components stay dumb (inputs/outputs
  only); orchestration lives in pages.
- **Docblocks**: every class, public/protected member and exported function
  carries the project JSDoc style (`@description`, `@access`, `@since`, `@type`,
  `@param`, `@returns`).
- **Strict TypeScript**: explicit types, `readonly` members, no `any`; reuse
  shared model types rather than redeclaring shapes.
- **Quality gate** before considering work done: `npm run format` (oxfmt),
  `npm run lint` (oxlint) and `npm run build` must pass, plus the feature specs.
  Run `graphify update .` after changing code.

## Invariants

- **Publication is confirm-gated, and the confirmation _is_ the recap.** The phase
  command in `review` only opens the dialog; `publishIntervention()` is `private`
  and reachable solely from its accept handler. The dialog's body is the **same
  `app-intervention-publication-summary` component** the action box renders,
  fed from the same three signals, so the recap and the dialog cannot drift.
  Publication is the one step that writes to the compliance record.
- **The phase's forward action has exactly one address on the page:
  `app-intervention-action-box`.** It renders once, at a fixed position,
  regardless of phase — its content changes, its position never does. Nothing
  else on the page renders `commandAction()`.
- **Every page-level notice renders once, at the location it concerns, never
  as a ranked stack.** An unattributed store error is a single alert above the
  sections; every other condition (reviewer note, blockers, unsynced outbox,
  publication failure) has exactly one home inside the section, action box or
  dialog it belongs to. A field-level rejection is excluded from the
  top-of-page alert (`pageError`) so it is never shown twice.
- **The section order is fixed across every phase (WCAG 2.4.3).** Only the
  `detailsExpanded` / `fieldWorkExpanded` disclosures open or close with the
  phase; the DOM order of header → meta → details → getting-started →
  field-work → proposed changes → activity thread → action box → comment
  composer → prev/next never changes.
- **Proposed changes are read-only.** `UpdateInterventionChangeInput.status`
  only accepts `'proposed' | 'rejected'`, never `'applied'` — acceptance
  happens automatically at publication, not through a client action — and
  `InterventionWorkspaceStore` exposes no reject method yet.
  `app-intervention-change-list` lists and explains; it does not act.
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
- **The detail page's delete gate is the split-capability one** (`INTERVENTIONS_PLAN`
  for a draft, `INTERVENTIONS_EXECUTE` for an abandoned intervention), narrowed first
  through `isInterventionDeletable`. The list page's row and bulk delete gate on
  `INTERVENTIONS_WRITE` instead — this feature has no delete-specific permission
  (the same approved exception as `facilities`). The two are intentionally different
  gates on the same `DELETE /api/interventions/{id}`, and both now ship: keep them
  explicit rather than collapsing one into the other.
- **A row or bulk delete is never offered for a status the API would refuse.**
  `InterventionTable`, `InterventionsPage` and `InterventionDetailPage` all narrow
  through the shared `isInterventionDeletable` util (`utils/intervention-deletable/`,
  statuses `draft`/`abandoned`) rather than duplicating the check, so the surfaces
  cannot drift. A bulk selection is filtered to its deletable subset before the
  confirm dialog opens — the count it shows is always what will actually delete,
  never a promise a 409 would break.
- Intervention workflows remain organization-scoped.
- Offline outbox replay belongs to this subfeature, not `core`.
- Intervention pages orchestrate intervention services and intervention stores.
- Intervention route pages live under `ui/pages/`.

### Retired invariants

Rules from earlier detail-page designs that are **retired**, not merely unimplemented:

- _"The publication outcome renders where the action was taken."_ It was justified
  only by a mobile command bar mirroring `publicationMessage`, and that bar never
  existed in the tabbed workspace. The publish confirmation now stays open on
  failure and shows the outcome inline, so the operator sees it exactly where
  they took the action and can retry without reopening the dialog.
- _"In `execute`, the work comes before the context."_ It was implemented as an
  `ng-template` plus two `ngTemplateOutlet`s reordering a single-column DOM, and
  it only paid for itself alongside a per-phase progressive-disclosure layout
  that is not rebuilt. The tabbed workspace makes the point structurally instead:
  Field work is its own tab, so an operator mid-execution never scrolls past
  planning context to reach it.
- _"Everything worth saying lives in one ranked notice stack under the header."_
  Retired in the 2.0 tabbed redesign: seven conditions competing for one slot,
  folded behind a counted toggle, put a wall between the operator and the
  content they opened the page for. Each condition now has exactly one
  contextual home (see `### Notices` above) instead of a shared rank.
- _"The properties rail is a fixed `19rem` column on the right, and the phase
  action is a single button pinned to the top-right of the page header."_
  Retired in the 2.0 tabbed redesign: properties became a responsive card grid
  inside the Overview tab, and each phase's forward action rendered inside the
  tab where that work happened.
- _"The workspace is three focused `hlm-tabs` panels — Overview, Field work,
  Publication."_ Retired in the 3.0 pull-request-style redesign: the model
  already reads like a PR (proposed changes, an activity thread, a single
  merge/publish gate) and tabs were hiding that shape — blockers and proposed
  changes were invisible unless an operator happened to open the right tab,
  and `activities`/`changes` sat unused in the store from day one. The page is
  now one fixed-order flow of disclosures instead, and the phase's forward
  action moved from "inside whichever tab is showing" to one fixed address,
  `app-intervention-action-box`.
- _"A locked empty state fills the Publication tab before the intervention
  reaches `review`."_ Retired in the 3.0 redesign: `app-intervention-action-box`
  already communicates the workflow state through its own phase-appropriate
  content (a plan/submit button, then the recap), so a separate "not ready
  yet" panel said the same thing a second time.
