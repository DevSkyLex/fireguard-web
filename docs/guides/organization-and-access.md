# Organization context and access

Organization is the owner of workspace context and its effective member access. UI placement does not move those decisions into a shell.

**Authoritative references:** [Organization](../../src/app/features/organization/FEATURE.md) · [Account](../../src/app/features/account/FEATURE.md).

## Resolve a workspace

The route guard/resolver selects an authorized organization and seeds its context.
Published ports expose that context to approved consumers. Switching organization
invalidates contextual caches and obsolete reads; late responses cannot replace the
new organization's state. Keep per-operation errors and drafts at their owner.

## Project access

Use server-provided effective grants/capabilities, including the documented wildcard
rules. A visible button is a projection of permission, not authorization of the API
command. Separate reading, writing and administration; preserve denied and unavailable
states rather than fabricating membership or directory data.

## Compose navigation

Feature contributions use published setup/navigation contracts. Layouts own shell
composition and adaptive placement. Account owns personal profile/preferences and
its inbox; nested organization features own their workflows. See the parent's
contract before changing a nested feature's allowed dependencies.

## Organization routing reference

The owner contract is [Routes](../../src/app/features/organization/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

- `/organizations/:organizationId/more` is the full secondary navigation page under
  the existing organization access guard and context resolver. It remains addressable
  in either interaction mode and owns no additional store or loading path.

### Adaptive mobile navigation

`withOrganizationMobileNavigation()` publishes an additive shell slot contribution.
The shell owns interaction-mode visibility, placement and safe-area clearance; organization owns
the destinations and RBAC. Width never selects this widget's presentation. The pure
`buildOrganizationMobileNavigation` model is shared by the bottom bar and More and reads
only existing context and effective grants. Dashboard, Interventions, Assets, Messages and
More keep stable ids and ordering; denied entries disappear without substitutes. Empty
collections never change navigation. Without an organization, Account and Your organizations
remain reachable. URL matching includes primary detail routes, with secondary routes under More.

More preserves the canonical operations catalog and imports, Channels under the existing
messaging-read wildcard check, and administration from the published
`ORGANIZATION_SWITCHER_QUICK_LINKS` catalog plus the members page's Teams/Roles tabs.
Billing stays `settings?tab=subscription`; account links preserve notification preferences
and self-service organization membership access. The existing OrganizationSwitcher mounts
browser-only through defer. More composes Auth's public `LogoutControl` for owner-managed
sign-out, and the generic public `ThemeSwitcher` with
`SLOT_PRESENTATION='menu'` for display preferences. It implements neither auth nor preferences.

> **Currently mounted:** `/organizations`, `/organizations/:organizationId` (the landing
> Dashboard page), `messages`, `channels`, `interventions`, `assets`, `equipments`, `facilities`,
> `inspections`, `maintenance`, `approvals`, `checklists`, `imports`, `audit`, `calendar`,
> `statistics` (a permanent redirect to the landing page, kept for old bookmarks and deep links —
> see Dashboard below), `members` (now tabbed: roster, roles & permissions, teams —
> see below), `members/:memberId`, `settings`, and `/organizations/invitations/accept`
> (mounted at the app root, outside this subtree — see below). `team` and `teams` are
> retired as mounted routes and now redirect functionally onto `members?tab=roles` /
> `members?tab=teams`.
> `assets` (the estate explorer) is now the sidebar's single navigation entry for the
> estate, gated on `FACILITIES_READ`; `facilities` and `equipments` stay mounted and gated on their
> own read permissions so records, creation forms and deep links keep resolving, but neither is
> listed by the sidebar navigation anymore.
>
> Because it replaced them in the sidebar, the explorer **carries their creation entry
> points**: "New facility" and "New equipment" sit in the shell header through
> `PageActionsService`, gated on `FACILITIES_WRITE` and `EQUIPMENT_WRITE`. Without them the
> only way to create a site or a piece of equipment was to type the URL — the buttons live
> on the two lists the sidebar no longer reaches.

- `/organizations` — redirect-only: `organizationGuard` forwards to the default
  workspace (the last organization persisted in the `last-organization` cookie
  when still accessible, else the first accessible organization, else
  `/onboarding/workspace`, bypassing any stale cached access decision). An `excluded` query parameter names an organization the guard
  must not pick again (redirect-loop breaker set by failing guards). There is
  no organization list page; switching happens through the sidebar switcher.
- `/organizations/:organizationId` — the landing "Dashboard" page (`ui/pages/organization-dashboard-page`),
  showing aggregate operational metrics and trend charts directly, without an organization
  identity block or Overview/Analysis tabs. The landing guard redirects a
  member who can read neither interventions nor the dashboard to their first permitted destination
- `/organizations/:organizationId/assets` — the estate explorer, on three
  first-level axes: **by site** (the facility hierarchy on the left, via
  `shared/tree`'s `Tree` primitive and the facilities subfeature's
  `FacilityTreeStore`, with the selected site's equipment and inspections on
  the right — the equipment pane's header then offers **Print QR labels**,
  streaming the selected subtree's label-sheet PDF through
  `EquipmentService.exportLabels` (`GET …/equipment/labels?facilityId=…`)
  and this page's own `BrowserDownloadService`, saved as
  `equipment-labels-{facilityId}.pdf`; a selection past 500 labels is
  refused server-side with a 422 whose RFC 7807 `detail` surfaces as an
  error toast via `resolveCsvExportErrorDetail`. The whole-inventory
  variant of the same endpoint lives on the equipment list's toolbar
  (`equipments/FEATURE.md`)), **everything** (the same panes unscoped, so an
  operator holding a serial number and no site can still find it), and **compliance**
  (the backend Compliance module's own enriched hierarchy — same `Tree`
  primitive, eager: the whole tree arrives nested in one call, so this
  page's own `ComplianceExplorerStore` maps it to a fully-populated
  `childrenByParent` up front and `Tree`'s lazy `expandRequested` never
  fires. Each node badges its compliance rate and severity bucket — icon and
  label together, never colour alone. Selecting a node loads that facility's
  compliance summary on the right, with an "Export safety register" button
  streaming the PDF through this page's own `BrowserDownloadService`, and an
  "Archive register" button beside it (`POST
…/compliance/register-snapshots`, facility-scoped when a node is selected,
  organization-wide otherwise; success and the 403 non-entitled refusal both
  surface as toasts, the latter carrying the backend's RFC 7807 `detail`).
  An "Archived registers" panel below lists the dated snapshots (`GET
…/compliance/register-snapshots`, paginated Hydra collection: generatedAt,
  scope, size, truncated content hash) with a per-row download (`GET
…/register-snapshots/{snapshotId}/download`); the panel renders only for
  holders of `organization.compliance.export`, the same permission the
  backend asserts on all three snapshot endpoints, which also share the live
  export's pro/max plan gate). The
  compliance tree — and, for members holding the export permission, the
  snapshot list — loads only on the axis's first activation, per the
  secondary-UI loading rule. It is now the single navigation entry for the
  estate, replacing the "Facilities" and "Equipments" pair below; both route
  trees stay mounted regardless so records, creation forms and deep links
  keep resolving.

  **The explorer's own state is in the URL** (`?axis=`, `?facility=`,
  `?compliance=`), written with `replaceUrl` so browsing the tree does not fill
  the history with one entry per click, and restored from route-bound inputs on
  arrival. It replaced two routed list pages that both did this and inherited
  neither: a reload came back on "By site" with nothing selected, the back
  button left the page instead of clearing the selection, and "the equipment of
  Bâtiment C" could not be sent to a colleague. **The creation buttons carry the
  selection too** — `?facility=` for equipment, `?parent=` for a site — so
  "New equipment" on a selected site produces a record already assigned rather
  than an orphan the operator then assigns by hand through the detail page's
  dialog. Operators holding
  `FACILITIES_WRITE` can re-parent a site by dragging it onto another —
  `Tree`'s optional pointer drag-drop, calling `FacilityTreeStore.move`. The
  tree row menu's "Move to…" action opens `FacilityMoveDialog` for the same
  operation and is the keyboard/AT path: drag-drop is pointer-only by
  construction and is never the only way to re-parent a site. The same menu's
  "Duplicate" action, gated identically, calls `FacilityTreeStore.duplicate`
  directly with no confirmation dialog — the backend defaults the copy's name
  and parent, and duplicating is not destructive

- `/organizations/:organizationId/messages` — the direct-messages workspace, owned by the
  `collaboration` subfeature, gated by `organization.messaging.read`. `messages/:conversationId`
  opens one. Reached from the shell's bottom navigation, not from the organization sections
- `/organizations/:organizationId/channels` — the channel workspace (group "salons"), owned by the
  `collaboration` subfeature, gated by `organization.messaging.read`. `channels/:channelId` opens
  one. Listed in the organization sections (`navigation/`), unlike direct messages: channels are
  organization workspaces, while conversations follow the reader
- `/organizations/:organizationId/facilities`
- `/organizations/:organizationId/equipments`
- `/organizations/:organizationId/inspections`
- `/organizations/:organizationId/approvals` — the four-eyes approvals inbox, owned by the
  `approvals` subfeature, gated by `organization.approvals.read`. Decision controls (approve/reject)
  are additionally gated by `organization.approvals.decide`
- `/organizations/:organizationId/imports` — the bulk CSV import surface, owned by the `imports`
  subfeature, gated by `organization.equipment.read` **or** `organization.facilities.read`
  (`match: 'any'`); the backend additionally gates the upload itself on the matching write
  permission for the submitted `kind`
- `/organizations/:organizationId/audit` — the organization audit journal, owned by the `audit`
  subfeature, gated by `organization.audit.read`. Not in the default member role — an admin holds
  it via the `organization.*` wildcard — so the sidebar entry and this route are both absent for
  most members
- `/organizations/:organizationId/statistics` — permanent redirect to `/organizations/:organizationId`
  (`pathMatch: 'full'`); the Trends section it used to be is one scroll away, on the same page
- `/organizations/:organizationId/checklists` — the checklist template library, owned by the
  `checklists` subfeature, gated by `organization.inspection.read`. Write actions (create, edit,
  archive) are additionally gated by `organization.inspection.write`. Checklists are consumed as
  inspection templates by the `inspections` subfeature's create flow
- `/organizations/:organizationId/members` — the single people-management surface, tabbed via
  `?tab=` (`members` default, `roles`, `teams`), `?tab=`-addressable the same way as
  `organization-settings-page` and `intervention-detail-page`'s header tabs. The route itself opens on
  the **union** of every tab's read permission (`organizationPermissionGuard`, `match: 'any'`
  over `organization.members.read`, `.manage`, `organization.roles.read`, `.manage`,
  `organization.teams.read`) — reaching the route at all does not imply seeing every tab.
  `OrganizationMembersPage` gates each trigger and panel individually
  (`canViewMembersTab`/`canViewRolesTab`/`canViewTeamsTab`) and never resolves `activeTab` to a
  tab the acting member cannot see: an unauthorized or unrecognized `?tab=` falls back to the
  first permitted tab in `members` → `roles` → `teams` order.
  - **`members` tab** (members + invitations; `organization.members.*`) — the page's own KPI row,
    roster and pending-invitations sections, fed by the component-scoped `OrganizationMembersStore`.
  - **`roles` tab** (RBAC roles; `organization.roles.*`) — `OrganizationTeamPage` mounted as-is
    inside a lazy tab panel (`hlmTabsContentLazy`), so its component-scoped `OrganizationTeamStore`
    and "New role" page action only activate once the tab is first opened.
  - **`teams` tab** (named member groups; `organization.teams.read`) — `OrganizationTeamsPage`
    mounted the same way, with its own `OrganizationTeamsStore`. See the naming disambiguation in
    **Invariants** — `roles`/`OrganizationTeamPage` and `teams`/`OrganizationTeamsPage` are
    unrelated concepts sharing this one host page.
  - The retired `/team` and `/teams` routes are functional `redirectTo`s
    (`redirectToOrganizationMembersTab`, `organization.routes.ts`) preserving every incoming
    query param, mirroring `interventions.routes.ts`'s `redirectToInterventionView`.
- `/organizations/:organizationId/members/:memberId` — another member's profile, read-only
- `/organizations/:organizationId/settings` (tabbed via `?tab=`: general & branding, subscription, usage, notifications, regional & formats, compliance, danger zone; gated by `organization.settings.write`). Assistant runtime policy is not operator-editable from this route.
- `/organizations/invitations/accept` — public invitation landing page; the
  route is mounted at the **app root** (outside the auth-guarded dashboard
  shell, in `app.routes.ts`) so a logged-out invitee can preview the invitation
  and sign in / sign up before accepting. The page is owned by this feature.

The `:organizationId` parent route resolves organization context before child pages render.
Organization navigation and routes are filtered by the active member permissions. Subscription
plans cap resource quantities (see Subscription quotas below); they do not gate routes.

**The sidebar's "Administration" group is retired.** `members`, `team`, `teams`, `settings` and
`audit` no longer appear in `ORGANIZATION_NAVIGATION_ITEMS` / `ORGANIZATION_NAVIGATION_GROUPS`
(`navigation/organization-navigation.config.ts`) — `OrganizationNavigationGroupId` now carries
only `'operations' | 'assets'`. Their routes stay mounted and permission-guarded exactly as
before; only the sidebar entry point moved. The five destinations' new entry point is
`OrganizationSwitcher`'s dropdown, which becomes the organization's administration menu:
organization identity header, then Settings / Billing (`settings?tab=subscription`, no new
route) / Members / Audit journal as `routerLink`s reusing the same
`hasOrganizationNavigationAccess`/`matchesOrganizationPermission` gate the sidebar used, then the
existing organization-switching panel and "Create organization" action. "Leave organization…" is
not offered from this menu, nor from the settings danger zone — it lives at
`/account/organizations` (`features/account/FEATURE.md`), reachable by every signed-in member
regardless of organization permission (see below).
**The companion move of `OrganizationTeamPage`/`OrganizationTeamsPage`'s content into
`roles`/`teams` tabs of `OrganizationMembersPage` is done** — see the `members` route entry
above. The switcher includes its identity header and permission-gated
Settings/Billing/Members/Audit links. Desktop uses its native dropdown; mobile uses a drawer.

The settings page's danger-zone tab is gated on `organization.delete` as a whole — a member
holding none of it falls back to the General tab. Leave no longer lives on this tab (see below).

**"Delete" is an archive, and it is reversible.** `DELETE /api/organizations/{id}` soft-deletes:
the owned facilities, equipment, inspections and interventions are preserved, and
`POST /{id}/restore` brings the organization back. The endpoint also requires a **`slug` query
parameter** retyping the organization's current slug, or it refuses with 422 and archives nothing —
the same confirmation `POST /{id}/transfer-ownership` takes in its body. The delete dialog gates on
the organization **name** in the reader's own terms; the slug travels from the resolved
organization, so the two are not the same string when a name and its slug differ.

Ownership transfer is **outside RBAC**: only the organization's current owner may call it, and no
permission substitutes for that. Suspend and restore, by contrast, need only
`organization.settings.write` — the same permission the legacy `isActive` toggle already required. Notification and regional preferences are persisted via the
settings `PATCH` but are not yet enforced (notification dispatch and app-wide date/locale
formatting consume them in follow-up work).

**The danger-zone tab now renders every action `OrganizationSettingsStore` owns, not only Delete.**
Suspend (`app-organization-suspend-dialog`, stating the consequences — access blocked immediately,
data preserved) renders when the organization is `active`; Restore (a direct button, no dialog,
mirroring `OrganizationMemberTable`'s Reactivate) renders when it is `suspended` or `archived` — the
two are mutually exclusive by status and both need only `organization.settings.write`, already
implied by the route guard on `/settings`. Transfer ownership (`app-organization-transfer-ownership-dialog`
— an `hlm-combobox` member picker mirroring `FacilityMoveDialog`, plus the typed-organization-name
confirm gate `OrganizationDeleteDialog` uses) renders only for the current owner on a non-archived
organization; its candidate list is `OrganizationMemberService.listAll`, loaded once the owner opens
the tab, narrowed to active, non-owner members. Leave is no longer offered from this tab — see
below.

**`OrganizationOutput.isOwner` is authoritative.** Since backend 1.5.0 the API projects `isOwner`
(and the caller's `roles`) through one shared caller-membership port on the user's organization list,
the single-organization `GET`, and every mutation that returns a refreshed organization (suspend,
restore, transfer-ownership, the settings PATCH). The settings page reads the declared field directly
— `organization().isOwner === true` — with no client-side derivation from `ownerUserId`.

**The settings General tab carries a "Legal information" section** (`app-organization-legal-form`):
country (ISO 3166-1 alpha-2), legal entity type (`GET /organizations/legal-types`, a reference
catalog loaded once when the tab opens), registered legal name, registration number and VAT number.
Every field is optional and clears on an empty string — unlike the general form's `description`,
which clears on `null` — matching `UpdateOrganizationSettingsInput`'s own doc block. Saved through
`OrganizationSettingsStore.save` with only these five keys, the same partial-save pattern every other
section uses.

**The subscription tab now offers Cancel and Resume alongside Checkout/Portal.** Cancel
(`app-organization-cancel-subscription-dialog`, stating that the subscription keeps working until
the current period ends rather than implying an immediate cutoff) renders while a subscription is
active and not already scheduled to cancel; Resume (a direct button, no dialog — it undoes Cancel)
renders once `cancelAtPeriodEnd` is true. Both call `OrganizationBillingStore.cancelSubscription`/
`resumeSubscription`, gated by the same `organization.settings.write` the tab's other controls need.
The plan comparison uses the native Spartan single-value toggle group to switch between monthly and
annual catalog pricing. Each higher tier states that it includes the preceding tier and renders its
server-provided quota summaries with check marks; the UI does not invent additional entitlements.

Checkout returns remain pending until the subscription API confirms the requested active plan
and interval. Browser-only bounded polling preserves the latest server data on interruption and
offers an explicit refresh after a delay or failure. Changing organization or destroying the page
cancels obsolete checks. The typed confirmation event refreshes organization data, quotas, member
access and invoices; query parameters never grant access. Older return URLs without a target remain
unconfirmed, with the actual subscription still visible.

**Compliance and automation policy** (`OrganizationSettings.compliance` /
`.automation`) are persisted through the Compliance tab's own
`OrganizationComplianceForm` and `OrganizationAutomationForm`, each calling
`OrganizationSettingsStore.save` with only its own section. Assistant runtime policy remains an
API-owned contract and is intentionally absent from the operator settings surface. The two
`compliance` maps (`nonConformitySlaDays`, `inspectionPeriodicityDefaults`)
carry EFFECTIVE values — catalog defaults overlaid with the organization's customizations — and
the API names which keys are customized (`customizedSlaSeverities`,
`customizedPeriodicityTypes`); the Compliance tab renders every key the seed returns rather than
a hard-coded severity or equipment-type list, save for the periodicity picker's five-option
duration catalog (`P1M`/`P3M`/`P6M`/`P1Y`/`P2Y`). **The four-eyes
approval policy (`OrganizationSettings.approval`) is now editable**, through
`OrganizationApprovalForm` at the bottom of the Compliance tab — one rule row per action type from
the `approvals` subfeature's action-type catalog (enabled, minimum approver role, and — `nc_waiver`
only — a minimum severity), self-approval, and the request TTL, all saved through
`OrganizationSettingsStore.save` with only the `approval` section. This was read-only
(`OrganizationApprovalSummaryCard`) until the `approvals` subfeature's inbox gave a reader a
surface to act on a gated request — activating a policy nothing could act on would have stranded
requests. That invariant is now retired; see `features/approvals/FEATURE.md`.

</details>

## Organization UI reference

The owner contract is [UI Conventions](../../src/app/features/organization/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

- Entity identifiers remain transport values. Every select, combobox, badge,
  table cell and closed trigger resolves an entity id through its loaded
  display label; unresolved or stale ids use a neutral domain fallback and
  never expose a UUID to the operator.

**Dashboard (`organization-dashboard-page`)** separates the current aggregate snapshot from
period-scoped activity. Its KPIs cover open interventions, non-conformities to resolve
(`open + inProgress`), globally closed inspections and equipment under maintenance.
The snapshot owns the four-status donut, attention items and at most five recently updated
interventions. Severity includes all statuses, including resolved cases, and remains in the
initially closed Additional analysis section alongside resource growth. Alert populations
may overlap and must never be summed. Missing values remain unavailable, never zero.

The page orchestrates the existing aggregate and trend stores. Snapshot presentation
components receive inputs only. Period defaults to 30 days with comparison enabled; it
controls all temporal charts, never snapshot data. While refreshing, loaded data, labels and
response-period granularity stay together until their replacement succeeds. Aggregate,
primary trends and secondary trends retain separate error/retry boundaries. Trend stores
activate on entry and fetch browser-only. All collection links use supported destinations
and relevant read permissions. The dashboard keeps the shell title and snapshot timestamp
without a duplicate "Current situation" heading or a create-intervention action; creation
keeps its planning permission on the interventions surface. The old `/statistics` route still
redirects here.

**Charts use the official Spartan Chart primitive**, generated by the Spartan CLI with
`@tanstack/angular-charts` and `@tanstack/charts`. `shared/chart` maps generic named series
and identified segments to native line/area and polar marks, with legend and keyboard
focus/tooltips. The generic donut calculates its central total from its finite positive
segments; its owner supplies the complete numeric legend, including zero values. Charts
reserve height during SSR/loading, expose empty data explicitly and use semantic CSS
tokens for live theme changes. Optional per-series colors, marker visibility and integer
axes preserve other LineChart consumers' defaults. Straight segments preserve samples.

**Native Spartan composition is application-wide.** Autonomous surfaces use the
complete `hlmCard` anatomy. Fieldsets, item groups and separators group related
content without nested cards; native empty states remain unframed. No second
section-shell abstraction replaces Spartan primitives.

`app-stat-tile` renders its figure at one size — `text-2xl font-semibold` — whatever inputs it is
given. It used to switch to `text-3xl font-bold` when a caption was passed, which put the same kind of
metric at two sizes depending on the page and broke `DESIGN.md`'s 24px ceiling. Its badge sits beside
the label in a wrapping flex row rather than in `hlmCardAction`, because that slot's
`grid-cols-[1fr_auto]` starved the label at a KPI strip's narrow column.

List pages (roster, facilities, equipments, inspections, interventions) share one pagination
recipe, `app-collection-pagination` (`@shared/collection-pagination`), one toolbar shell,
`app-collection-toolbar` (`@shared/collection-toolbar`), one search box,
`app-collection-search-box` (also `@shared/collection-toolbar`), one editable filter-chip row,
`app-collection-filter-bar` and its `app-filter-chip` shell (`@shared/collection-filters`), and
one boundary for the native Spartan `Empty` states. The same `hlmEmpty` anatomy serves page-level,
in-card and in-section empty slots. Collection-table replacement states use the owning surface's
neutral dashed border; spacing and other optional borders belong to the owning surface.
Failures use `role="alert"`, a destructive media treatment and an optional retry action while
keeping the native anatomy.
Checkbox collections may render `app-collection-selection-bar` from `@shared/collection-toolbar`.
The page owns selected IDs, permissions and bulk handlers; the bar only presents supplied commands.
Its counter compares selected rows with the filtered server result total.

**The five collection components moved to `shared/` on a deliberate uniformity bet, not on
today's locality.** At the time of the move every consumer still lived under
`features/organization/` (this feature's own roster page plus the four nested subfeatures'
list pages), which by §2.8 usage locality alone would keep them at
`features/organization/ui/components/`. They moved anyway because the goal driving the
extraction was uniforming every list surface across the app, including ones this feature does
not own — `shared/` is the bet that a sixth consumer outside `organization` is coming, not a
conclusion the current five consumers force. `app-collection-search-box` takes the current
draft value as an `input()` and emits one `output()` per keystroke; the debounce and the `?q=`
round-trip stay page-owned (route orchestration, §10.3) — `InspectionStore` exposes no search
filter, so `InspectionsPage` renders no search box rather than inventing one the backend cannot
serve. Its `app-collection-toolbar` therefore carries only the "Filters" toggle in
`toolbarEnd` and no `toolbarStart` content at all — a toolbar with one empty slot, not the
absent toolbar the page rendered before the toggle existed.

**`app-collection-filter-toggle` (`@shared/collection-filters`) is the "Filters" button every
list page's toolbar now carries**, mounting or unmounting the sibling `app-collection-filter-bar`
below it — a page's `filtersVisible` signal, seeded by `initialCollectionFilterBarVisibility`
(same module) from that page's own `activeFilterKeys().length > 0` at construction, then purely
toggle-driven. On `interventions-page` it sits beside "Columns" in `toolbarEnd`; on the eight
other pages that carry a filter bar it is `toolbarEnd`'s only control. The button carries an `hlm-badge` count of the active
narrowing, and defaults open whenever the page mounts already filtered (only `interventions-page`
persists filters in the URL, so it is the only one this is ever observable on) — a shared,
filtered link must never render behind a collapsed bar. The toggle is deliberately not part of
`app-collection-filter-bar` itself: the bar has no opinion on whether it is mounted, and the
button has no opinion on the bar's own chip row or "+ Filter" menu.

**`app-collection-filter-bar` replaced three divergent popovers (equipments, facilities,
inspections) and interventions' own bespoke chip row with one component**, first proven inside
`interventions-page` and then generalized. Its contract stays generic — a field is `{ key:
string, fieldLabel: string, icon: string, operators: readonly CollectionFilterOperator[] }`
(`CollectionFilterField`) — and it owns the chip row's pick-order memory, the "+ Filter" menu,
and the "Clear filters" button; a page still owns its own `filters` signal (URL-backed), which
of its fields currently carry a value (`activeKeys`), and which field is mid-pick before a value
lands (`pendingKey` / `openFilterKey`). **The value control is always projected**, one
`ng-template` per field (resolved through `viewChild(TemplateRef)`, the same idiom already used
for a page's `#pageActions` template), so `shared/` never imports a feature's tag component or
model — `app-equipment-status-tag`, `app-inspection-status-tag` and `app-intervention-tag` all
stay in their owning feature. A field's value control need not be a select either: facilities'
lone `archived` field projects a plain `hlm-checkbox`, since "opening a selector" has no meaning
for a boolean.

**Filter presentation stays generic; filter meaning stays feature-owned.** Audit's action
catalog supplies module grouping metadata to `CollectionFilterSelect`; shared controls never
import the audit registry. The same confirmed value and `state`/`stateChanged` contract serve
desktop popovers and mobile drawers, selected through `INTERACTION_CAPABILITIES_PORT`, not viewport width.
Mobile multi-selection and date controls snapshot a draft on opening, preserve it during source
refreshes, and emit on Apply before closing. Dismissal leaves the confirmed value unchanged.
The feature owns the resulting query and URL update. Inline controls which open no overlay
receive focus after rendering; closing an overlay uses native focus restoration.

**The chip's operator segment (8.0) is generic, never a hardcoded "is".** `CollectionFilterOperator`
(`@shared/collection-filters/models`) is the full comparison vocabulary — `equals`, `notEquals`,
`contains`, `notContains`, `startsWith`, `endsWith`, `greaterThan`, `lessThan`, `between`,
`isEmpty`, `isNotEmpty`, `isAnyOf`, `isNoneOf` — and a field declares only the subset its own
data-access layer actually maps to a real query param through `operators`; `FilterChip` renders
that subset as a fixed label when it has exactly one entry (every field but two across the nine
pages that carry a filter bar today — approvals, audit, checklists, equipments, facilities,
imports, inspections, interventions, maintenance-schedules) and as an `hlm-select` once a field
declares more than one. **A feature owns
the operator→query-param mapping**, never `shared/` — `equals` maps to a field's exact-match param,
and interventions' "Deadline" and "Planned start" fields (`dueRange`/`plannedStartRange`, 8.1/8.2)
are the framework's first fields genuinely wired to more than one: `greaterThan`/`lessThan`/`between`
map to the `dueAtAfter`/`dueAtBefore` and `plannedStartAtAfter`/`plannedStartAtBefore` bounds
`InterventionListOptions` already served (`features/interventions/FEATURE.md`) — no backend
change, confirmed by reading the backend `InterventionResource`/`InterventionProvider` directly.
That same read confirmed the reverse too: `isAnyOf`, `notEquals`, `isEmpty`/`isNotEmpty` and
`contains` stay undeclared on every enum/IRI field because the provider reads each filter as a
single value and the gateway matches by equality only — a verified "no", not an unconfirmed one.
Both date-range fields' operator selects also prove `CollectionFilterField.operatorLabels`
(`@shared/collection-filters`), the optional per-field label override this round added: a
date field reads "after"/"before", not the generic registry's "greater than"/"less than", while
every field that sets no override stays on the shared wording. An operator a field does not
declare is simply never offered — this bar never sends a param unverified against the real
backend.

**Create-surface placement** follows field count and navigation cost, not precedent: a form of
**3 fields or fewer with no navigation cost** belongs in a dialog; **4 to 8 fields that should
keep the list in context** belong in a right sheet; a form that **needs its own URL or deep-link,
or exceeds 8 fields**, belongs in a route page. The equipment, facility and inspection create
pages predate this rule and stay as route pages — that is a recorded exception, not a precedent
for a new create surface to follow. Sheet-hosted forms' padding ownership — why the 3 intervention
sheet forms keep `px-4` on their own `hlm-field-group` instead of following the page/dialog
pattern — is recorded in `features/interventions/FEATURE.md` § UI Conventions.

Every native `<input hlmInput>`/`<textarea hlmTextarea>` bound with `[formField]` carries
`[attr.aria-invalid]="f().touched() && f().invalid()"` at the call site — the sanctioned dialect
across every feature's forms, documenting intent even where it is not (yet) fully effective. In
today's vendored state, `BrnInput`/`BrnTextarea` (`shared/ui`, not owned here) already set their
own host `aria-invalid` from the control's **raw** `invalid`, and that host binding wins over the
call-site one: a pristine required field is announced invalid before it is ever touched. The
visual ring is correctly touched-gated (`data-matches-spartan-invalid`) — only the announced value
is off. A repo-owned helm-layer correction (mirroring the touched-gated `spartanInvalid` state the
ring already reads) was evaluated and declined, to keep the vendored `shared/ui` layer untouched;
the call-site binding stays because it becomes live the day that correction — or an upstream
spartan fix — lands. `HlmSelectTrigger`, `HlmComboboxInput` and `HlmDatePickerTrigger` are
`Component`s with their own template, so a call-site `[attr.aria-invalid]` on their host tag never
reaches the real focusable control — no form here binds one on those.

A submit control whose label swaps to a pending variant (`Save` → `Saving…`) carries
`aria-live="polite"` directly on the `<button>` — the one mechanism this app uses to announce that
swap, chosen over wrapping the swapped spans in a `role="status"` container because it needs no
extra element and the button already owns `[attr.aria-busy]`. This applies across every feature's
forms, not only `organization`'s, since the pattern is form-wide rather than feature-owned.

**Page header (shell contract).** `layouts/dashboard-layout`'s `DashboardPageHeader` carries every
routed page's title and header actions now, not the page itself: it renders the activated route's
`title` (via `TitleService`, kept in sync by `PageTitleStrategy`) as the document's one `<h1>`, and
a page contributes its right-side action buttons through a `<ng-template #pageActions>` registered
on `PageActionsService` (`@core/page-actions`). A page with primary section or view navigation
contributes a `<ng-template #pageTabs>` through `PageTabsService` (`@core/page-tabs`); the template
uses Spartan's paginated tabs list with `variant="line"` and remains connected to the declaring
page's `hlm-tabs` state and panels. Local filters and nested panel tabs stay in content. The breadcrumb trail
below it never carries a heading itself, so there is exactly one `<h1>` per route regardless of
whether that route opts into the trail. `app-organization-page-header` is retired entirely,
including from `organization-dashboard-page`, which was its last consumer: the org identity it
carried (avatar, plan, status, member count) is shown nowhere else, so it now renders as a
page-local lead row above `organization-dashboard-page`'s tabs, built from `organizationContext`.
A page-specific subtitle stays only when it adds context that is not already represented by a
KPI or section heading. Redundant live counts (for example the members roster total) are
omitted rather than repeated at content top; decorative, static subtitles are dropped as
dead weight.

</details>
